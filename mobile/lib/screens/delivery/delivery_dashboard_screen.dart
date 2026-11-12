import 'dart:convert';
import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../data/models/product_model.dart';
import '../../data/services/api_service.dart';
import '../../data/services/realtime_service.dart';
import '../../providers/auth_provider.dart';
import '../../services/launcher_service.dart';
import '../auth/login_screen.dart';
import '../home/select_location_map_screen.dart';
import '../../widgets/report_download_sheet.dart';
import '../../services/delivery_proof_watermarker.dart';
import '../../widgets/delivery_proof_dialog.dart';
import '../../core/utils/ist_date_time.dart';

String _todayIstCacheKey() {
  final nowIst = IstDateTime.toIst(DateTime.now());
  return 'nmd_addon_drops_${nowIst.year}-${nowIst.month.toString().padLeft(2, '0')}-${nowIst.day.toString().padLeft(2, '0')}';
}

Future<void> _saveLocalAddonCache(String deliveryId, Map<String, dynamic> patch) async {
  if (deliveryId.isEmpty) return;
  try {
    final prefs = await SharedPreferences.getInstance();
    final key = _todayIstCacheKey();
    final raw = prefs.getString(key);
    final Map<String, dynamic> map = raw != null && raw.isNotEmpty
        ? Map<String, dynamic>.from(jsonDecode(raw) as Map)
        : <String, dynamic>{};
    final existing = map[deliveryId] is Map ? Map<String, dynamic>.from(map[deliveryId] as Map) : <String, dynamic>{};
    map[deliveryId] = {...existing, ...patch};
    await prefs.setString(key, jsonEncode(map));
  } catch (_) {}
}

Future<void> _applyLocalAddonCache(List<Map<String, dynamic>> list) async {
  if (list.isEmpty) return;
  try {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_todayIstCacheKey());
    if (raw == null || raw.isEmpty) return;
    final map = Map<String, dynamic>.from(jsonDecode(raw) as Map);
    for (final d in list) {
      final dId = (d['_id'] ?? d['id'] ?? '').toString();
      if (dId.isEmpty || map[dId] is! Map) continue;
      final cached = Map<String, dynamic>.from(map[dId] as Map);
      final serverAddonsTotal = num.tryParse((d['addonsTotal'] ?? '0').toString()) ?? 0;
      final serverAddonPaid = num.tryParse((d['addonPaidAmount'] ?? '0').toString()) ?? 0;
      final serverPayAmt = num.tryParse((d['paymentAmount'] ?? '0').toString()) ?? 0;
      if (serverAddonsTotal <= 0 && (cached['addons'] is List && (cached['addons'] as List).isNotEmpty)) {
        d['addons'] = cached['addons'];
        d['addonsTotal'] = cached['addonsTotal'];
        d['totalAmount'] = cached['totalAmount'] ?? d['totalAmount'];
      }
      if (serverAddonPaid <= 0 && (num.tryParse((cached['addonPaidAmount'] ?? '0').toString()) ?? 0) > 0) {
        d['addonPaymentMethod'] = cached['addonPaymentMethod'];
        d['addonPaidAmount'] = cached['addonPaidAmount'];
      }
      if (serverPayAmt <= 0 && (num.tryParse((cached['paymentAmount'] ?? '0').toString()) ?? 0) > 0) {
        d['paymentAmount'] = cached['paymentAmount'];
        if ((cached['paymentMethod'] ?? '').toString().isNotEmpty) {
          d['paymentMethod'] = cached['paymentMethod'];
        }
      }
    }
  } catch (_) {}
}

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
  String _vehiclePlate = 'TS-09-EV-4412';
  String _vehicleModel = 'Commercial Cargo EV';
  String _vehicleType = 'Electric Cargo EV';
  String _crateCapacity = '4 Insulated Crates (48 Litres)';
  String _drivingLicense = 'TS-09-2023-0091';
  String _bloodGroup = 'B+';
  bool _isEditingVehicle = false;
  final String _emergencyContact = '+91 97018 78789';
  final String _supervisorHotline = '+91 98765 43210';
  final String _operatingHours = '5:00 AM – 7:30 AM';
  final String _depotAddress = 'Madhapur Central Hub, Pillar 24, Hyderabad';
  bool _isOnDuty = true;

  // Full-screen Sub-screens and Notifications
  String? _activeProfileSubScreen; // null, 'edit', 'personal', 'contact', 'territory', 'vehicle', 'support', 'deliveries_details', 'subscriptions_history'
  bool _isNotificationScreenOpen = false;
  List<Map<String, dynamic>> _notifications = [];
  List<Map<String, dynamic>> _payments = [];
  List<Map<String, dynamic>> _allDeliveries = [];
  List<Map<String, dynamic>> _handovers = [];
  double _serverBoyCash = 0.0;
  double _serverBoyUpi = 0.0;
  String _cashPeriod = 'today'; // 'today' | 'all'
  String _cashFilter = 'all'; // 'all' | 'cash' | 'upi' | 'addons'
  bool _isSubmittingHandover = false;
  int _unreadNotifCount = 2;
  String _notifFilter = 'all'; // 'all', 'unread', 'deliveries', 'system'
  final List<Map<String, dynamic>> _sentSupportMessages = [];

  // Route Stops Search, Location & Nearest Sorting States
  String _routeSearchQuery = '';
  final TextEditingController _routeSearchCtrl = TextEditingController();
  String _routeSelectedArea = 'All';
  String _routeSortMode = 'nearest'; // 'nearest' | 'location'
  String _routeStatusFilter = 'all'; // 'all' | 'pending' | 'delivered'
  double? _partnerLat;
  double? _partnerLng;
  bool _hasLiveGps = false;
  bool _isLocatingPartner = false;
  final Map<String, List<double>> _areaCenterCoords = {
    'madhapur': [17.4483, 78.3915],
    'hitec city': [17.4435, 78.3772],
    'kondapur': [17.4600, 78.3568],
    'gachibowli': [17.4401, 78.3489],
    'jubilee hills': [17.4326, 78.4071],
    'banjara hills': [17.4156, 78.4347],
    'financial district': [17.4193, 78.3422],
    'kukatpally': [17.4948, 78.3996],
    'manikonda': [17.4021, 78.3820],
  };

  // Deliveries Details Sub-Screen States
  String _delSubFilter = 'all'; // 'all', 'pending', 'delivered', 'not_delivered', 'cash', 'upi'
  String _delSubSearch = '';
  final TextEditingController _delSubSearchCtrl = TextEditingController();

  // Subscriptions & Order History Sub-Screen States
  String _subHistTab = 'subscriptions'; // 'subscriptions', 'history', 'crates'
  String _subHistSearch = '';
  String _subHistFilter = 'all'; // 'all', 'active', 'paused', 'daily', 'alternate'
  final TextEditingController _subHistSearchCtrl = TextEditingController();
  List<Map<String, dynamic>> _extraSubscriptions = [];
  bool _isLoadingSubscriptions = false;

  Future<void> _loadServiceLocations() async {
    try {
      final res = await _api.get('/api/locations');
      if (res['success'] == true && res['locations'] is List && mounted) {
        for (final item in (res['locations'] as List)) {
          if (item is Map) {
            final name = (item['name'] ?? '').toString().trim().toLowerCase();
            final lat = num.tryParse(item['latitude']?.toString() ?? '')?.toDouble();
            final lng = num.tryParse(item['longitude']?.toString() ?? '')?.toDouble();
            if (name.isNotEmpty && lat != null && lng != null && lat != 0 && lng != 0) {
              _areaCenterCoords[name] = [lat, lng];
            }
          }
        }
        setState(() {});
      }
    } catch (_) {}
  }

  Future<void> _detectPartnerLocation({bool requestPermission = true, bool silent = false}) async {
    if (_isLocatingPartner) return;
    if (mounted) setState(() => _isLocatingPartner = true);
    try {
      final loc = await LauncherService.getCurrentLocation(requestPermission: requestPermission);
      if (loc != null && mounted) {
        setState(() {
          _partnerLat = loc['latitude'];
          _partnerLng = loc['longitude'];
          _hasLiveGps = true;
        });
        if (!silent) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('📍 Live GPS detected! Route sorted nearest customer first.'),
              backgroundColor: Color(0xFF059669),
              duration: Duration(seconds: 2),
            ),
          );
        }
      } else if (!silent && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Using $_profileArea hub center to sort nearest stops (enable GPS for live location).'),
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } catch (_) {} finally {
      if (mounted) setState(() => _isLocatingPartner = false);
    }
  }

  List<double> _getReferenceCoords(String boyArea) {
    if (_hasLiveGps && _partnerLat != null && _partnerLng != null) {
      return [_partnerLat!, _partnerLng!];
    }
    final key = boyArea.trim().toLowerCase();
    if (_areaCenterCoords.containsKey(key)) return _areaCenterCoords[key]!;
    for (final entry in _areaCenterCoords.entries) {
      if (key.contains(entry.key) || entry.key.contains(key)) return entry.value;
    }
    return [17.4483, 78.3915];
  }

  double _haversineKm(double lat1, double lng1, double lat2, double lng2) {
    const double r = 6371.0;
    final double dLat = (lat2 - lat1) * math.pi / 180.0;
    final double dLng = (lng2 - lng1) * math.pi / 180.0;
    final double a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(lat1 * math.pi / 180.0) *
            math.cos(lat2 * math.pi / 180.0) *
            math.sin(dLng / 2) *
            math.sin(dLng / 2);
    final double c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return r * c;
  }

  String _formatDistanceLabel(double? distKm) {
    if (distKm == null || distKm.isInfinite || distKm.isNaN) return 'Location';
    if (distKm < 1.0) {
      final meters = (distKm * 1000).round();
      return '${meters < 10 ? 10 : meters} m';
    }
    return '${distKm.toStringAsFixed(1)} km';
  }

  String _resolveStopArea(Map<String, dynamic> d, Map<String, dynamic>? cust, String boyArea) {
    final rawArea = (d['customerArea'] ?? d['area'] ?? cust?['area'] ?? '').toString().trim();
    if (rawArea.isNotEmpty && !rawArea.toLowerCase().contains('all ')) {
      return _titleCaseArea(rawArea);
    }
    final addr = (d['customerAddress'] ?? cust?['address'] ?? '').toString().toLowerCase();
    for (final known in _areaCenterCoords.keys) {
      if (addr.contains(known)) {
        return _titleCaseArea(known);
      }
    }
    final cleanBoy = boyArea.trim();
    if (cleanBoy.isNotEmpty && !cleanBoy.toLowerCase().contains('all ')) {
      return _titleCaseArea(cleanBoy);
    }
    return 'Madhapur';
  }

  String _titleCaseArea(String area) {
    return area
        .trim()
        .split(RegExp(r'\s+'))
        .where((w) => w.isNotEmpty)
        .map((w) => w[0].toUpperCase() + w.substring(1).toLowerCase())
        .join(' ');
  }

  Future<void> _fetchSubscriptions() async {
    if (_isLoadingSubscriptions) return;
    setState(() => _isLoadingSubscriptions = true);
    try {
      final res = await _api.get('/api/subscriptions');
      if (res['success'] == true && res['subscriptions'] is List) {
        if (mounted) {
          setState(() {
            _extraSubscriptions = (res['subscriptions'] as List)
                .map((e) => Map<String, dynamic>.from(e as Map))
                .toList();
          });
        }
      }
    } catch (_) {}
    if (mounted) {
      setState(() => _isLoadingSubscriptions = false);
    }
  }

  @override
  void initState() {
    super.initState();
    _loadData();
    _loadServiceLocations();
    _detectPartnerLocation(requestPermission: false, silent: true);
    _loadNotifications(silent: true);
    _initRealtime();
  }

  void _initRealtime() {
    if (!_realtime.isConnected && !_realtime.isConnecting) {
      _realtime.connect();
    }
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
      } else if (type == 'DRIVER_DUTY_UPDATED' ||
          type == 'DELIVERY_BOY_UPDATED' ||
          type == 'DELIVERY_UPDATED' ||
          type == 'DELIVERY_CREATED' ||
          type == 'PAYMENT_UPDATED' ||
          type == 'PAYMENT_RECORDED' ||
          type == 'CASH_HANDOVER_UPDATED' ||
          type == 'CASH_HANDOVER_SUBMITTED' ||
          type == 'CUSTOMER_CREATED' ||
          type == 'CUSTOMER_UPDATED' ||
          type == 'CUSTOMER_DELETED' ||
          type == 'LOCATION_UPDATED' ||
          type == 'ORDER_UPDATED' ||
          type == 'NOTIFICATION_UPDATED' ||
          type == 'NOTIFICATION_CREATED') {
        if ((type == 'DRIVER_DUTY_UPDATED' || type == 'DELIVERY_BOY_UPDATED') && event['payload'] is Map) {
          if (mounted) {
            final payload = event['payload'] as Map;
            final authUser = context.read<AuthProvider>().user;
            final boyId = payload['boyId']?.toString() ?? payload['id']?.toString() ?? payload['targetId']?.toString();
            final mobile = payload['mobile']?.toString();
            final name = payload['name']?.toString() ?? payload['boyName']?.toString();

            final cleanPayloadMob = _cleanPhone(mobile);
            final cleanProfileMob = _cleanPhone(_profilePhone);
            final cleanAuthMob = _cleanPhone(authUser?.mobile);

            final idMatch = boyId != null && authUser != null && (boyId == authUser.id);
            final mobMatch = cleanPayloadMob.isNotEmpty && (cleanPayloadMob == cleanProfileMob || cleanPayloadMob == cleanAuthMob);
            final nameMatch = name != null && name.trim().isNotEmpty && (
              name.trim().toLowerCase() == _profileName.trim().toLowerCase() ||
              (authUser != null && name.trim().toLowerCase() == authUser.name.trim().toLowerCase())
            );

            if (idMatch || mobMatch || nameMatch || authUser != null) {
              if (payload['isOnline'] is bool) {
                final boolOnline = payload['isOnline'] as bool;
                setState(() => _isOnDuty = boolOnline);
                context.read<AuthProvider>().setOnlineDutyStatus(
                  boolOnline,
                  lastOnlineAt: payload['lastOnlineAt']?.toString(),
                  lastOfflineAt: payload['lastOfflineAt']?.toString(),
                );
              }
            }
          }
        }
        _loadData(silent: true);
        _loadNotifications(silent: true);
      }
    });
  }

  String _cleanPhone(String? p) {
    if (p == null) return '';
    final d = p.replaceAll(RegExp(r'[^0-9]'), '');
    return d.length > 10 ? d.substring(d.length - 10) : d;
  }

  bool _isNotificationForDriver(Map<String, dynamic> item) {
    try {
      final role = item['recipientRole']?.toString().toLowerCase().trim() ?? '';
      if (role == 'all') return true;
      if (role == 'customer' || role == 'admin') return false;

      final recipId = (item['recipientId']?.toString() ?? '').toLowerCase().trim();
      if (recipId.isEmpty) return true; // General driver broadcast

      final auth = Provider.of<AuthProvider>(context, listen: false);
      final currentUser = auth.user;
      final Set<String> myIds = {};
      if (currentUser != null) {
        if (currentUser.id.isNotEmpty) myIds.add(currentUser.id.toLowerCase().trim());
        if (currentUser.mobile.isNotEmpty) myIds.add(currentUser.mobile.toLowerCase().trim());
      }
      return myIds.contains(recipId);
    } catch (_) {
      return false;
    }
  }

  Future<void> _loadNotifications({bool silent = false}) async {
    try {
      final res = await _api.get('/api/notifications');
      if (res['success'] == true && res['notifications'] is List) {
        final list = (res['notifications'] as List)
            .where((e) {
              if (e is! Map) return false;
              return _isNotificationForDriver(Map<String, dynamic>.from(e));
            })
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
    _delSubSearchCtrl.dispose();
    _subHistSearchCtrl.dispose();
    _routeSearchCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadData({bool silent = false}) async {
    if (!silent) setState(() => _isLoading = true);

    try {
      final results = await Future.wait([
        _api.get('/api/deliveries?range=today').catchError((_) => <String, dynamic>{}),
        _api.get('/api/deliveries/assigned-customers').catchError((_) => <String, dynamic>{}),
        _api.get('/api/deliveries?range=all').catchError((_) => <String, dynamic>{}),
        _api.get('/api/payments').catchError((_) => <String, dynamic>{}),
        _api.get('/api/payments/handovers').catchError((_) => <String, dynamic>{}),
        _api.get('/api/delivery-boys').catchError((_) => <String, dynamic>{}),
      ]);

      final delRes = results[0];
      final custRes = results[1];
      final allDelRes = results[2];
      final payRes = results[3];
      final handoverRes = results[4];
      final boysRes = results[5];

      try {
        final meRes = await _api.get('/api/auth/me');
        if (meRes['success'] == true && meRes['user'] is Map) {
          final meUser = Map<String, dynamic>.from(meRes['user'] as Map);
          if (mounted) {
            await context.read<AuthProvider>().updateUserFromMap(meUser);
            setState(() {
              if (meUser['isOnline'] is bool) _isOnDuty = meUser['isOnline'] as bool;
              if (meUser['vehicleNumber'] != null && meUser['vehicleNumber'].toString().trim().isNotEmpty) {
                _vehiclePlate = meUser['vehicleNumber'].toString().trim();
              }
              final meCash = (num.tryParse((meUser['todayCashCollected'] ?? '0').toString()) ?? 0).toDouble();
              final meUpi = (num.tryParse((meUser['todayUpiCollected'] ?? '0').toString()) ?? 0).toDouble();
              if (meCash > 0 || _serverBoyCash == 0) _serverBoyCash = meCash;
              if (meUpi > 0 || _serverBoyUpi == 0) _serverBoyUpi = meUpi;
            });
          }
        }
      } catch (_) {}

      final List<Map<String, dynamic>> parsedTodayDeliveries = delRes['success'] == true && delRes['deliveries'] is List
          ? (delRes['deliveries'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList()
          : List<Map<String, dynamic>>.from(_deliveries);
      final List<Map<String, dynamic>> parsedAllDeliveries = allDelRes['success'] == true && allDelRes['deliveries'] is List
          ? (allDelRes['deliveries'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList()
          : (_allDeliveries.isNotEmpty ? List<Map<String, dynamic>>.from(_allDeliveries) : List<Map<String, dynamic>>.from(parsedTodayDeliveries));

      await _applyLocalAddonCache(parsedTodayDeliveries);
      await _applyLocalAddonCache(parsedAllDeliveries);

      if (mounted) {
        final authUser = context.read<AuthProvider>().user;
        setState(() {
          if (authUser != null) {
            _isOnDuty = authUser.isOnline;
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
            _deliveries = parsedTodayDeliveries;
          }

          if (custRes['success'] == true && custRes['customers'] is List) {
            _assignedCustomers = (custRes['customers'] as List)
                .map((e) => Map<String, dynamic>.from(e as Map))
                .toList();
          }

          if (allDelRes['success'] == true && allDelRes['deliveries'] is List) {
            _allDeliveries = parsedAllDeliveries;
          } else if (_allDeliveries.isEmpty && _deliveries.isNotEmpty) {
            _allDeliveries = List<Map<String, dynamic>>.from(_deliveries);
          }

          if (payRes['success'] == true && payRes['payments'] is List) {
            _payments = (payRes['payments'] as List)
                .map((e) => Map<String, dynamic>.from(e as Map))
                .toList();
          }

          if (handoverRes['success'] == true && handoverRes['handovers'] is List) {
            _handovers = (handoverRes['handovers'] as List)
                .map((e) => Map<String, dynamic>.from(e as Map))
                .toList();
          }

          if (boysRes['success'] == true && boysRes['deliveryBoys'] is List) {
            final boysList = (boysRes['deliveryBoys'] as List)
                .whereType<Map>()
                .map((e) => Map<String, dynamic>.from(e))
                .toList();
            final cleanProfMob = _cleanPhone(_profilePhone);
            final profNameLower = _profileName.trim().toLowerCase();
            final matched = boysList.firstWhere(
              (b) {
                final bId = (b['id'] ?? b['_id'] ?? '').toString();
                final bMob = _cleanPhone(b['mobile']?.toString());
                final bName = (b['name'] ?? '').toString().trim().toLowerCase();
                return (authUser != null && bId == authUser.id) ||
                    (cleanProfMob.isNotEmpty && bMob == cleanProfMob) ||
                    (profNameLower.isNotEmpty && bName == profNameLower);
              },
              orElse: () => <String, dynamic>{},
            );
            if (matched.isNotEmpty) {
              _serverBoyCash = (num.tryParse((matched['todayCashCollected'] ?? '0').toString()) ?? 0).toDouble();
              _serverBoyUpi = (num.tryParse((matched['todayUpiCollected'] ?? '0').toString()) ?? 0).toDouble();
            }
          }
        });

        // Fallback when /api/payments is unavailable on older backend deployments:
        // collect Customer & Subscription Cash/UPI entries directly from assigned customer ledgers
        if (payRes['success'] != true && _assignedCustomers.isNotEmpty) {
          _loadPaymentsFromCustomerLedgers();
        }
      }
    } catch (e) {
      debugPrint('Error loading delivery partner data: $e');
    } finally {
      if (mounted && !silent) setState(() => _isLoading = false);
    }
  }

  Future<void> _loadPaymentsFromCustomerLedgers() async {
    try {
      final subset = _assignedCustomers.take(25).toList();
      final collected = <Map<String, dynamic>>[];
      await Future.wait(
        subset.map((c) async {
          final cId = (c['id'] ?? c['_id'] ?? c['customerId'] ?? '').toString();
          if (cId.isEmpty) return;
          try {
            final res = await _api.get('/api/customers/$cId/ledger');
            if (res['success'] == true && res['ledger'] is List) {
              for (final raw in (res['ledger'] as List)) {
                if (raw is Map && raw['type'] == 'payment') {
                  final entry = Map<String, dynamic>.from(raw);
                  collected.add({
                    'id': entry['id'] ?? '${cId}_${entry['date']}_${entry['paidAmount']}',
                    'customerId': c['customerId'] ?? cId,
                    'customerName': c['name'] ?? 'Customer',
                    'amount': entry['paidAmount'] ?? entry['amount'] ?? 0,
                    'paymentMethod': (entry['paymentMethod'] ?? 'cash').toString().toLowerCase(),
                    'paymentDate': entry['rawDate'] ?? entry['date'] ?? DateTime.now().toIso8601String(),
                    'notes': entry['notes'] ?? 'Customer Payment',
                    'referenceNumber': entry['referenceNumber'] ?? '',
                  });
                }
              }
            }
          } catch (_) {}
        }),
      );
      if (mounted && collected.isNotEmpty) {
        setState(() => _payments = collected);
      }
    } catch (_) {}
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

  double _cashCollectedFor(Map<String, dynamic> d) {
    if (d['status'] != 'delivered') return 0.0;
    final m = (d['paymentMethod'] ?? '').toString().toLowerCase();
    final am = (d['addonPaymentMethod'] ?? '').toString().toLowerCase();
    if (m == 'cash') {
      return (num.tryParse((d['paymentAmount'] ?? d['totalAmount'])?.toString() ?? '0') ?? 0).toDouble();
    }
    if (am == 'cash') {
      return (num.tryParse((d['addonPaidAmount'] ?? d['paymentAmount'])?.toString() ?? '0') ?? 0).toDouble();
    }
    return 0.0;
  }

  double _upiCollectedFor(Map<String, dynamic> d) {
    if (d['status'] != 'delivered') return 0.0;
    final m = (d['paymentMethod'] ?? '').toString().toLowerCase();
    final am = (d['addonPaymentMethod'] ?? '').toString().toLowerCase();
    if (m == 'upi') {
      return (num.tryParse((d['paymentAmount'] ?? d['totalAmount'])?.toString() ?? '0') ?? 0).toDouble();
    }
    if (am == 'upi') {
      return (num.tryParse((d['addonPaidAmount'] ?? d['paymentAmount'])?.toString() ?? '0') ?? 0).toDouble();
    }
    return 0.0;
  }

  double _addonCashFor(Map<String, dynamic> d) {
    if (d['status'] != 'delivered') return 0.0;
    final am = (d['addonPaymentMethod'] ?? '').toString().toLowerCase();
    if (am == 'cash') {
      return (num.tryParse((d['addonPaidAmount'] ?? '0').toString()) ?? 0).toDouble();
    }
    return 0.0;
  }

  double _addonUpiFor(Map<String, dynamic> d) {
    if (d['status'] != 'delivered') return 0.0;
    final am = (d['addonPaymentMethod'] ?? '').toString().toLowerCase();
    if (am == 'upi') {
      return (num.tryParse((d['addonPaidAmount'] ?? '0').toString()) ?? 0).toDouble();
    }
    return 0.0;
  }

  List<Map<String, dynamic>> get _todayNonDeliveryPayments {
    final nowIst = IstDateTime.toIst(DateTime.now());
    final todayStr = '${nowIst.year}-${nowIst.month.toString().padLeft(2, '0')}-${nowIst.day.toString().padLeft(2, '0')}';
    return _payments.where((p) {
      final ref = (p['referenceNumber'] ?? '').toString().toUpperCase();
      if (ref.contains('DELIVERY-')) return false;
      final notes = (p['notes'] ?? '').toString();
      if (notes.startsWith('Doorstep Add-ons:') || notes.startsWith('Doorstep Delivery')) {
        final custId = (p['customerId'] ?? '').toString();
        final alreadyInDrop = _deliveries.any((d) =>
            d['status'] == 'delivered' &&
            (d['customerId'] ?? '').toString() == custId &&
            ((num.tryParse((d['addonPaidAmount'] ?? '0').toString()) ?? 0) > 0 ||
                (num.tryParse((d['paymentAmount'] ?? '0').toString()) ?? 0) > 0));
        if (alreadyInDrop) return false;
      }
      final rawDt = (p['paymentDate'] ?? p['createdAt'] ?? '').toString();
      if (rawDt.isEmpty) return false;
      final dt = DateTime.tryParse(rawDt);
      if (dt == null) return false;
      final istDt = IstDateTime.toIst(dt);
      final pStr = '${istDt.year}-${istDt.month.toString().padLeft(2, '0')}-${istDt.day.toString().padLeft(2, '0')}';
      return pStr == todayStr;
    }).toList();
  }

  double get _todayCustomerCash => _todayNonDeliveryPayments
      .where((p) => (p['paymentMethod'] ?? '').toString().toLowerCase() == 'cash')
      .fold(0.0, (sum, p) => sum + (num.tryParse((p['amount'] ?? '0').toString()) ?? 0).toDouble());

  double get _todayCustomerUpi => _todayNonDeliveryPayments
      .where((p) => (p['paymentMethod'] ?? '').toString().toLowerCase() == 'upi')
      .fold(0.0, (sum, p) => sum + (num.tryParse((p['amount'] ?? '0').toString()) ?? 0).toDouble());

  double get _todayDeliveryCash => _deliveries.fold(0.0, (sum, d) => sum + _cashCollectedFor(d));
  double get _todayDeliveryUpi => _deliveries.fold(0.0, (sum, d) => sum + _upiCollectedFor(d));

  double get _todayCash {
    final computed = _todayDeliveryCash + _todayCustomerCash;
    return computed > _serverBoyCash ? computed : _serverBoyCash;
  }

  double get _todayUpi {
    final computed = _todayDeliveryUpi + _todayCustomerUpi;
    return computed > _serverBoyUpi ? computed : _serverBoyUpi;
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

  void _callCustomer(String phone) async {
    final clean = phone.replaceAll(RegExp(r'[^0-9+]'), '');
    if (clean.isEmpty) return;
    final launched = await LauncherService.openDialer(clean);
    if (!launched) {
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
  }

  void _openMap(String address, [num? lat, num? lng]) async {
    final launched = await LauncherService.openMap(lat: lat, lng: lng, address: address);
    if (!launched && address.isNotEmpty) {
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
  }

  void _showPostDeliveryAddonSheet(Map<String, dynamic> d) {
    final custName = (d['customerName'] ?? 'Customer').toString();
    final deliveryId = (d['_id'] ?? d['id'] ?? '').toString();
    final custId = (d['customerId'] ?? '').toString();
    final searchCtrl = TextEditingController();
    final cashAmtCtrl = TextEditingController(text: '0');
    List<ProductModel> catalog = ProductModel.defaultCatalog;
    final Map<String, double> qtys = {};
    String searchQ = '';
    String payMethod = 'cash';
    bool manualCashEdited = false;
    bool isLoadingCatalog = true;
    bool isSaving = false;
    bool startedFetch = false;

    double unitPrice(ProductModel p) =>
        p.numericPrice > 0 ? p.numericPrice : (double.tryParse(p.price.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 60.0);

    double calcSubtotal() {
      double s = 0;
      for (final p in catalog) {
        final q = qtys[p.id] ?? 0;
        if (q > 0) s += q * unitPrice(p);
      }
      return s;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) => StatefulBuilder(
        builder: (modalCtx, setModalState) {
          if (!startedFetch) {
            startedFetch = true;
            _api.getProducts().then((list) {
              if (modalCtx.mounted) {
                setModalState(() {
                  if (list.isNotEmpty) catalog = list;
                  isLoadingCatalog = false;
                });
              }
            }).catchError((_) {
              if (modalCtx.mounted) setModalState(() => isLoadingCatalog = false);
            });
          }

          final filtered = catalog.where((p) {
            if (searchQ.isEmpty) return true;
            return p.name.toLowerCase().contains(searchQ) || p.category.toLowerCase().contains(searchQ);
          }).toList();
          final subtotal = calcSubtotal();

          return Container(
            height: MediaQuery.of(modalCtx).size.height * 0.82,
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(modalCtx).viewInsets.bottom + 16,
              top: 16,
              left: 16,
              right: 16,
            ),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
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
                          Text('Add Extra Add-ons • $custName', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)), overflow: TextOverflow.ellipsis),
                          const Text('Add items & collect Cash/UPI in real time', style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                    IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.of(modalCtx).pop()),
                  ],
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: searchCtrl,
                  onChanged: (v) => setModalState(() => searchQ = v.trim().toLowerCase()),
                  decoration: InputDecoration(
                    hintText: 'Search milk, curd, paneer, ghee...',
                    prefixIcon: const Icon(Icons.search_rounded, size: 18, color: Color(0xFF059669)),
                    isDense: true,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
                const SizedBox(height: 10),
                Expanded(
                  child: isLoadingCatalog
                      ? const Center(child: CircularProgressIndicator(color: Color(0xFF059669)))
                      : ListView.builder(
                          itemCount: filtered.length,
                          itemBuilder: (_, idx) {
                            final p = filtered[idx];
                            final q = qtys[p.id] ?? 0;
                            final uPrice = unitPrice(p);
                            final pName = p.name.toLowerCase();
                            final pUnit = p.unit.toLowerCase();
                            final isFixedPack = pName.contains('half') || pName.contains('500') || pUnit.contains('500') || pUnit.contains('ml') || pUnit.contains('pack');
                            final isMilk = (p.category.toLowerCase() == 'milk' || pName.contains('milk')) && !isFixedPack;
                            final step = isMilk ? 0.5 : 1.0;

                            return Container(
                              margin: const EdgeInsets.only(bottom: 8),
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: q > 0 ? const Color(0xFFF0FDF4) : const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: q > 0 ? const Color(0xFF86EFAC) : const Color(0xFFE2E8F0)),
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(p.name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                                        Text('₹${uPrice.toStringAsFixed(0)} / ${p.unit}', style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF059669))),
                                      ],
                                    ),
                                  ),
                                  IconButton(
                                    onPressed: q > 0
                                        ? () => setModalState(() {
                                              final nq = (q - step).clamp(0.0, 99.0);
                                              if (nq <= 0) {
                                                qtys.remove(p.id);
                                              } else {
                                                qtys[p.id] = nq;
                                              }
                                              if (!manualCashEdited) cashAmtCtrl.text = calcSubtotal().toStringAsFixed(0);
                                            })
                                        : null,
                                    icon: const Icon(Icons.remove_circle_outline),
                                  ),
                                  Text(q > 0 ? (q == q.truncateToDouble() ? '${q.toInt()}' : '$q') : '0', style: const TextStyle(fontWeight: FontWeight.w900)),
                                  IconButton(
                                    onPressed: () => setModalState(() {
                                      qtys[p.id] = q + step;
                                      if (!manualCashEdited) cashAmtCtrl.text = calcSubtotal().toStringAsFixed(0);
                                    }),
                                    icon: const Icon(Icons.add_circle_rounded, color: Color(0xFF059669)),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                ),
                const Divider(),
                DropdownButtonFormField<String>(
                  initialValue: payMethod,
                  isExpanded: true,
                  decoration: const InputDecoration(labelText: 'Add-ons Settlement', border: OutlineInputBorder(), isDense: true),
                  items: const [
                    DropdownMenuItem(value: 'cash', child: Text('💵 Cash Given for Add-ons', overflow: TextOverflow.ellipsis)),
                    DropdownMenuItem(value: 'upi', child: Text('📱 UPI Paid for Add-ons', overflow: TextOverflow.ellipsis)),
                    DropdownMenuItem(value: 'credit', child: Text('📝 Add to Customer Credit Ledger', overflow: TextOverflow.ellipsis)),
                  ],
                  onChanged: (v) {
                    if (v != null) setModalState(() => payMethod = v);
                  },
                ),
                if (payMethod == 'cash' || payMethod == 'upi') ...[
                  const SizedBox(height: 10),
                  TextField(
                    controller: cashAmtCtrl,
                    keyboardType: TextInputType.number,
                    onChanged: (_) => manualCashEdited = true,
                    decoration: InputDecoration(
                      labelText: 'Cash / Amount Collected (₹)',
                      prefixText: '₹ ',
                      suffix: InkWell(
                        onTap: () => setModalState(() {
                          manualCashEdited = false;
                          cashAmtCtrl.text = subtotal.toStringAsFixed(0);
                        }),
                        child: Text('Full ₹${subtotal.toStringAsFixed(0)}', style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Color(0xFF059669))),
                      ),
                      border: const OutlineInputBorder(),
                      isDense: true,
                    ),
                  ),
                ],
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: (isSaving || subtotal <= 0)
                        ? null
                        : () async {
                            setModalState(() => isSaving = true);
                            final newItems = <Map<String, dynamic>>[];
                            for (final p in catalog) {
                              final q = qtys[p.id] ?? 0;
                              if (q > 0) {
                                newItems.add({
                                  'productId': p.id,
                                  'name': p.name,
                                  'quantity': q,
                                  'unit': p.unit,
                                  'price': unitPrice(p),
                                });
                              }
                            }
                            final paidNow = (payMethod == 'cash' || payMethod == 'upi')
                                ? (num.tryParse(cashAmtCtrl.text.trim()) ?? subtotal).toDouble()
                                : 0.0;

                            try {
                              if (paidNow > 0 && custId.isNotEmpty) {
                                await _api.post('/api/payments', {
                                  'customerId': custId,
                                  'amount': paidNow,
                                  'paymentMethod': payMethod,
                                  'deliveryBoyId': d['deliveryBoyId']?.toString() ?? '',
                                  'notes': 'Doorstep Add-ons: ${newItems.map((a) => '${a['name']} x${a['quantity']}').join(', ')}',
                                });
                              }
                              final existingAddons = d['addons'] is List ? List<Map<String, dynamic>>.from((d['addons'] as List).whereType<Map>().map((e) => Map<String, dynamic>.from(e))) : <Map<String, dynamic>>[];
                              final mergedAddons = [...existingAddons, ...newItems];
                              final prevAddonsTot = (num.tryParse((d['addonsTotal'] ?? '0').toString()) ?? 0).toDouble();
                              final prevAddonPaid = (num.tryParse((d['addonPaidAmount'] ?? '0').toString()) ?? 0).toDouble();
                              final prevPayAmt = (num.tryParse((d['paymentAmount'] ?? '0').toString()) ?? 0).toDouble();
                              final prevTotal = (num.tryParse((d['totalAmount'] ?? '0').toString()) ?? 0).toDouble();

                              d['addons'] = mergedAddons;
                              d['addonsTotal'] = prevAddonsTot + subtotal;
                              d['totalAmount'] = prevTotal + subtotal;
                              if (paidNow > 0) {
                                d['addonPaymentMethod'] = payMethod;
                                d['addonPaidAmount'] = prevAddonPaid + paidNow;
                                d['paymentAmount'] = prevPayAmt + paidNow;
                              } else if ((d['addonPaymentMethod'] ?? '').toString().isEmpty) {
                                d['addonPaymentMethod'] = payMethod;
                              }

                              await _saveLocalAddonCache(deliveryId, {
                                'addons': d['addons'],
                                'addonsTotal': d['addonsTotal'],
                                'totalAmount': d['totalAmount'],
                                'paymentMethod': d['paymentMethod'],
                                'paymentAmount': d['paymentAmount'],
                                'addonPaymentMethod': d['addonPaymentMethod'],
                                'addonPaidAmount': d['addonPaidAmount'],
                              });

                              if (modalCtx.mounted) Navigator.of(modalCtx).pop();
                              if (mounted) setState(() {});
                              _loadData(silent: true);
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('✓ Added ₹${subtotal.toStringAsFixed(0)} add-on${paidNow > 0 ? ' (₹${paidNow.toStringAsFixed(0)} ${payMethod.toUpperCase()} recorded)' : ''} for $custName!'),
                                    backgroundColor: const Color(0xFF059669),
                                  ),
                                );
                              }
                            } catch (e) {
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to save add-on: $e'), backgroundColor: const Color(0xFFDC2626)));
                              }
                            } finally {
                              if (modalCtx.mounted) setModalState(() => isSaving = false);
                            }
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF059669),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: isSaving
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : Text('Save Add-ons (₹${subtotal.toStringAsFixed(0)})', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _showMarkDeliveredDialog(Map<String, dynamic> delivery) {
    if (!_isOnDuty) {
      _showOfflineBlockedDialog();
      return;
    }
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (ctx) => _FullScreenMarkDeliveredPage(
          delivery: delivery,
          api: _api,
          onSuccess: () {
            if (mounted) setState(() {});
            _loadData(silent: true);
          },
        ),
      ),
    );
  }

  void _showOfflineBlockedDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.pause_circle_filled_rounded, color: Color(0xFFDC2626), size: 24),
            SizedBox(width: 8),
            Text('Partner Shift Offline', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
          ],
        ),
        content: const Text(
          'You are currently in Offline / Off Duty mode. Please toggle your status to Online in the navigation bar to mark deliveries as delivered.',
          style: TextStyle(fontSize: 13.5, color: Color(0xFF475569)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              _updateOnlineDutyStatus(true);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF059669),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('Go Online Now', style: TextStyle(fontWeight: FontWeight.w800, color: Colors.white)),
          ),
        ],
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
          if (_activeProfileSubScreen == 'vehicle' && _isEditingVehicle) {
            setState(() => _isEditingVehicle = false);
          } else {
            setState(() {
              _isEditingVehicle = false;
              _activeProfileSubScreen = null;
            });
          }
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
        onBack = () {
          if (_activeProfileSubScreen == 'vehicle' && _isEditingVehicle) {
            setState(() => _isEditingVehicle = false);
          } else {
            setState(() {
              _isEditingVehicle = false;
              _activeProfileSubScreen = null;
            });
          }
        };
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
            title = _isEditingVehicle ? 'Edit Vehicle Details' : 'Vehicle & Equipment';
            break;
          case 'support':
            title = 'Help & Support Desk';
            break;
          case 'deliveries_details':
            title = 'All Deliveries';
            break;
          case 'subscriptions_history':
            title = 'Subscriptions & History';
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
      height: 60,
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Left: Dairy Logo + Partner Name & Area
          Align(
            alignment: Alignment.centerLeft,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Dairy Logo Box
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0FDF4),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFBBF7D0)),
                  ),
                  padding: const EdgeInsets.all(4),
                  child: Image.asset(
                    'assets/images/logo.png',
                    fit: BoxFit.contain,
                    errorBuilder: (_, _, _) => const Icon(Icons.water_drop_rounded, color: Color(0xFF059669), size: 20),
                  ),
                ),
                const SizedBox(width: 8),
                ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 100),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Flexible(
                            child: Text(
                              boyName.toLowerCase(),
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5, color: Color(0xFF0F172A)),
                            ),
                          ),
                          const SizedBox(width: 4),
                          Container(
                            width: 6,
                            height: 6,
                            decoration: BoxDecoration(
                              color: _isOnDuty ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                              shape: BoxShape.circle,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 1),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.location_on_outlined, size: 11, color: Color(0xFF059669)),
                          const SizedBox(width: 2),
                          Flexible(
                            child: Text(
                              boyArea.toLowerCase(),
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: Color(0xFF059669)),
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

          // EXACT MATHEMATICAL CENTER OF THE NAV BAR (50% SCREEN WIDTH)
          Align(
            alignment: Alignment.center,
            child: _buildOnlineToggle(),
          ),

          // Right: Notification Bell with Interactive InkWell
          Align(
            alignment: Alignment.centerRight,
            child: InkWell(
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
                    child: const Icon(Icons.notifications_none_rounded, color: Color(0xFF059669), size: 21),
                  ),
                  if (_unreadNotifCount > 0)
                    Positioned(
                      top: -4,
                      right: -4,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                        constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE11D48),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                        child: Center(
                          child: Text(
                            _unreadNotifCount > 9 ? '9+' : '$_unreadNotifCount',
                            style: const TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.w800),
                          ),
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
  }

  Future<void> _updateOnlineDutyStatus(bool newStatus) async {
    HapticFeedback.lightImpact();
    setState(() => _isOnDuty = newStatus);

    final auth = context.read<AuthProvider>();
    await auth.setOnlineDutyStatus(newStatus);

    // Call API to persist online/offline timing and notify admin in real-time
    try {
      final authUser = auth.user;
      final boyId = (authUser != null && authUser.id.isNotEmpty) ? authUser.id : null;
      final mobile = (authUser != null && authUser.mobile.isNotEmpty) ? authUser.mobile : _profilePhone;
      final name = (authUser != null && authUser.name.isNotEmpty) ? authUser.name : _profileName;
      final area = (authUser != null && authUser.assignedArea.isNotEmpty) ? authUser.assignedArea : _profileArea;

      final res = await _api.post('/api/delivery-boys/duty-status', {
        'isOnline': newStatus,
        'boyId': boyId,
        'id': boyId,
        'area': area,
        'mobile': mobile,
        'name': name,
      });
      debugPrint('⚡ Duty status update result: $res');
      if (res['success'] == true && res['isOnline'] is bool) {
        if (mounted) {
          setState(() => _isOnDuty = res['isOnline'] as bool);
        }
        await auth.setOnlineDutyStatus(
          res['isOnline'] as bool,
          lastOnlineAt: res['lastOnlineAt']?.toString(),
          lastOfflineAt: res['lastOfflineAt']?.toString(),
        );
      }
      if (!RealtimeService().isConnected) {
        RealtimeService().connect();
      }
    } catch (e) {
      debugPrint('Duty status sync note: $e');
    }

    if (!mounted) return;
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              newStatus ? Icons.check_circle_rounded : Icons.pause_circle_filled_rounded,
              color: Colors.white,
              size: 20,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                newStatus
                    ? '🟢 Shift Online: Ready for live deliveries'
                    : '⏸ Shift Offline: Deliveries paused',
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
        backgroundColor: newStatus ? const Color(0xFF059669) : const Color(0xFF475569),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  // ONLINE / OFFLINE TOGGLE WIDGET (Located in the exact middle of the nav bar)
  Widget _buildOnlineToggle() {
    return InkWell(
      onTap: () => _updateOnlineDutyStatus(!_isOnDuty),
      borderRadius: BorderRadius.circular(20),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
        decoration: BoxDecoration(
          color: _isOnDuty ? const Color(0xFFECFDF5) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: _isOnDuty ? const Color(0xFF86EFAC) : const Color(0xFFCBD5E1),
            width: 1.2,
          ),
          boxShadow: [
            BoxShadow(
              color: _isOnDuty ? const Color(0xFF10B981).withValues(alpha: 0.15) : Colors.black.withValues(alpha: 0.02),
              blurRadius: 4,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: _isOnDuty ? const Color(0xFF10B981) : const Color(0xFF94A3B8),
                shape: BoxShape.circle,
                boxShadow: _isOnDuty
                    ? [
                        BoxShadow(
                          color: const Color(0xFF10B981).withValues(alpha: 0.6),
                          blurRadius: 4,
                          spreadRadius: 1,
                        ),
                      ]
                    : null,
              ),
            ),
            const SizedBox(width: 5),
            Text(
              _isOnDuty ? 'Online' : 'Offline',
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w800,
                color: _isOnDuty ? const Color(0xFF065F46) : const Color(0xFF64748B),
                letterSpacing: 0.2,
              ),
            ),
            const SizedBox(width: 5),
            Container(
              width: 24,
              height: 14,
              padding: const EdgeInsets.all(1.5),
              decoration: BoxDecoration(
                color: _isOnDuty ? const Color(0xFF059669) : const Color(0xFFCBD5E1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: AnimatedAlign(
                duration: const Duration(milliseconds: 180),
                alignment: _isOnDuty ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  width: 11,
                  height: 11,
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            ),
          ],
        ),
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
      onTap: () {
        setState(() => _selectedTabIndex = index);
        if (index == 1 && !_hasLiveGps && !_isLocatingPartner) {
          _detectPartnerLocation(requestPermission: true, silent: true);
        }
      },
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
            case 'deliveries_details':
              return _buildDeliveriesDetailsFullScreen();
            case 'subscriptions_history':
              return _buildSubscriptionsHistoryFullScreen();
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
          // 1. PAGE TITLE & SUBTITLE WITH QUICK ACTIONS (ADD CUSTOMER & REPORT PDF)
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
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
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _showAddCustomerModal,
                      icon: const Icon(Icons.person_add_alt_1_rounded, size: 17, color: Colors.white),
                      label: const Text(
                        'Add Customer',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Colors.white),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF059669),
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 11),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(11)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => ReportDownloadSheet.show(
                        context,
                        role: 'partner',
                        initialCustomers: _assignedCustomers,
                        initialDeliveries: _deliveries,
                      ),
                      icon: const Icon(Icons.picture_as_pdf_rounded, size: 17, color: Color(0xFF0D5C3A)),
                      label: const Text(
                        'Report PDF',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFF0D5C3A)),
                      ),
                      style: OutlinedButton.styleFrom(
                        backgroundColor: const Color(0xFFECFDF5),
                        side: const BorderSide(color: Color(0xFFA7F3D0), width: 1.2),
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 11),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(11)),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          if (!_isOnDuty) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFFECACA)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.pause_circle_filled_rounded, color: Color(0xFFDC2626), size: 20),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Text(
                      'You are currently Offline. Turn on the toggle in the nav bar to resume deliveries.',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF991B1B)),
                    ),
                  ),
                  const SizedBox(width: 8),
                  TextButton(
                    onPressed: () {
                      _updateOnlineDutyStatus(true);
                    },
                    style: TextButton.styleFrom(
                      backgroundColor: const Color(0xFF059669),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: const Text('Go Online', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800)),
                  ),
                ],
              ),
            ),
          ],
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
                  const SizedBox(height: 14),
                  ElevatedButton.icon(
                    onPressed: _showAddCustomerModal,
                    icon: const Icon(Icons.person_add_alt_1_rounded, size: 16, color: Colors.white),
                    label: const Text('Add Customer to Route', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Colors.white)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF059669),
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
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

          // Product Tags: 🥛 1L Milk + Add-ons
          Wrap(
            spacing: 8,
            runSpacing: 6,
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
              if (curdQty > 0)
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
              if (d['addons'] is List && (d['addons'] as List).isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFFBEB),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFFDE68A)),
                  ),
                  child: Text(
                    '+ ${(d['addons'] as List).length} Add-on(s) · ₹${d['addonsTotal'] ?? 0}${(d['addonPaidAmount'] is num && (d['addonPaidAmount'] as num) > 0) ? " (Paid ₹${d['addonPaidAmount']})" : ""}',
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 11.5, color: Color(0xFF92400E)),
                  ),
                ),
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
                  onPressed: () => _openMap(
                    address,
                    d['latitude'] as num? ?? d['customerLatitude'] as num?,
                    d['longitude'] as num? ?? d['customerLongitude'] as num?,
                  ),
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
                flex: isDelivered ? 3 : 3,
                child: ElevatedButton.icon(
                  onPressed: isDelivered ? null : () => _showMarkDeliveredDialog(d),
                  icon: Icon(isDelivered ? Icons.verified_rounded : Icons.check_rounded, size: 16, color: Colors.white),
                  label: Text(
                    isDelivered ? '✓ Done' : 'Delivered',
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

              if (isDelivered) ...[
                const SizedBox(width: 6),
                Expanded(
                  flex: 3,
                  child: OutlinedButton.icon(
                    onPressed: () => _showPostDeliveryAddonSheet(d),
                    icon: const Icon(Icons.add_shopping_cart_rounded, size: 14, color: Color(0xFFB45309)),
                    label: const Text('+ Add-on', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Color(0xFFB45309))),
                    style: OutlinedButton.styleFrom(
                      backgroundColor: const Color(0xFFFFFBEB),
                      side: const BorderSide(color: Color(0xFFFDE68A)),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9)),
                    ),
                  ),
                ),
              ],

              // Skip (Removed completely for delivered users)
              if (!isDelivered) ...[
                const SizedBox(width: 6),
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
            ],
          ),

          // Captured Doorstep Photo Proof (Prominently displayed for delivered users)
          if (isDelivered) _buildProofPhotoPreviewCard(d),
        ],
      ),
    );
  }

  // HELPER: BUILD CAPTURED PHOTO PROOF CARD FOR DELIVERED ITEMS
  Widget _buildProofPhotoPreviewCard(Map<String, dynamic> d) {
    final proofStr = (d['proofImage'] ?? d['proofUrl'] ?? '').toString();
    final deliveredTime = d['deliveredAt'] != null
        ? DateTime.tryParse(d['deliveredAt'].toString())
        : null;
    final timeStr = deliveredTime != null
        ? '${deliveredTime.hour.toString().padLeft(2, '0')}:${deliveredTime.minute.toString().padLeft(2, '0')}'
        : 'Morning';

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF0FDF4),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFBBF7D0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.verified_rounded, size: 16, color: Color(0xFF059669)),
              const SizedBox(width: 6),
              const Expanded(
                child: Text(
                  'Doorstep Proof Photo Verified',
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF065F46),
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFF86EFAC)),
                ),
                child: Text(
                  'Delivered $timeStr',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF059669),
                  ),
                ),
              ),
            ],
          ),
          if (proofStr.isNotEmpty) ...[
            const SizedBox(height: 10),
            GestureDetector(
              onTap: () => DeliveryProofHelper.showLightbox(
                context: context,
                proofStr: proofStr,
                customerName: d['customerName']?.toString() ?? 'Customer',
                address: d['customerAddress']?.toString() ?? d['deliveryAddress']?.toString() ?? d['area']?.toString() ?? '',
                lat: num.tryParse((d['customerLatitude'] ?? d['latitude'])?.toString() ?? ''),
                lng: num.tryParse((d['customerLongitude'] ?? d['longitude'])?.toString() ?? ''),
                timestamp: d['deliveredAt'] != null ? d['deliveredAt'].toString() : (d['deliveryDate'] != null ? '${d['deliveryDate']} • Morning Drop' : null),
                partnerName: d['deliveryBoyName']?.toString() ?? _profileName,
              ),
              child: Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      width: double.infinity,
                      height: 140,
                      color: const Color(0xFFE2E8F0),
                      child: DeliveryProofHelper.buildImageFromSource(proofStr),
                    ),
                  ),
                  Positioned(
                    bottom: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.7),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.zoom_in_rounded, size: 14, color: Colors.white),
                          SizedBox(width: 4),
                          Text(
                            'Tap to Zoom',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 6),
            const Center(
              child: Text(
                'Live camera photo captured by delivery partner',
                style: TextStyle(fontSize: 11, color: Color(0xFF047857), fontWeight: FontWeight.w600),
              ),
            ),
          ] else ...[
            const SizedBox(height: 6),
            const Text(
              'Doorstep drop completed & verified with live delivery proof.',
              style: TextStyle(fontSize: 12, color: Color(0xFF047857), fontWeight: FontWeight.w600),
            ),
          ],
        ],
      ),
    );
  }

  // =========================================================
  // TAB 1: ROUTE & STOPS (LOCATION-WISE & NEAREST FIRST)
  // =========================================================
  Map<String, dynamic>? _findMatchingCustomer(Map<String, dynamic> d) {
    final custId = d['customerId']?.toString() ?? '';
    final phone = _cleanPhone(d['customerPhone']?.toString());
    for (final c in _assignedCustomers) {
      final cid = c['customerId']?.toString() ?? '';
      final oid = (c['_id'] ?? c['id'] ?? '').toString();
      final cmob = _cleanPhone(c['mobile']?.toString());
      if ((custId.isNotEmpty && (cid == custId || oid == custId)) ||
          (phone.isNotEmpty && cmob == phone)) {
        return c;
      }
    }
    return null;
  }

  Widget _buildRouteStopCard(Map<String, dynamic> entry, int rankIndex, {bool isNearestPending = false}) {
    final originalIndex = entry['originalIndex'] as int;
    final d = entry['delivery'] as Map<String, dynamic>;
    final areaName = entry['area'] as String;
    final distKm = entry['distanceKm'] as double;
    final distLabel = _formatDistanceLabel(distKm);
    final lat = entry['lat'] as num?;
    final lng = entry['lng'] as num?;
    final isDelivered = d['status'] == 'delivered';
    final isNotDelivered = d['status'] == 'not_delivered';
    final address = (d['customerAddress'] ?? '$areaName Doorstep').toString();

    return InkWell(
      onTap: () => _openStopDetails(d, originalIndex),
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isNearestPending
                ? const Color(0xFF059669)
                : (isDelivered ? const Color(0xFFBBF7D0) : const Color(0xFFE2E8F0)),
            width: isNearestPending ? 1.5 : 1.0,
          ),
          boxShadow: isNearestPending
              ? [BoxShadow(color: const Color(0xFF059669).withValues(alpha: 0.08), blurRadius: 8, offset: const Offset(0, 2))]
              : null,
        ),
        child: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: isDelivered
                    ? const Color(0xFF059669)
                    : (isNearestPending ? const Color(0xFF065F46) : const Color(0xFFF1F5F9)),
                borderRadius: BorderRadius.circular(9),
              ),
              child: Center(
                child: Text(
                  '${rankIndex + 1}',
                  style: TextStyle(
                    color: (isDelivered || isNearestPending) ? Colors.white : const Color(0xFF334155),
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
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          d['customerName'] ?? 'Customer',
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Color(0xFF0F172A)),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (isNearestPending) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFFDCFCE7),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: const Color(0xFF86EFAC)),
                          ),
                          child: const Text(
                            'NEAREST',
                            style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w900, color: Color(0xFF047857)),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 3),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(5),
                          border: Border.all(color: const Color(0xFFBFDBFE)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.near_me_rounded, size: 10, color: Color(0xFF1D4ED8)),
                            const SizedBox(width: 3),
                            Text(
                              distLabel,
                              style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF1D4ED8)),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(5),
                        ),
                        child: Text(
                          areaName,
                          style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Color(0xFF475569)),
                        ),
                      ),
                      if (isDelivered)
                        const Text('✓ Done', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF059669)))
                      else if (isNotDelivered)
                        const Text('✕ Not Done', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFFDC2626))),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    address,
                    style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            const SizedBox(width: 6),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '${d['plannedMilk'] ?? 1}L',
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: Color(0xFF059669)),
                ),
                IconButton(
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                  icon: const Icon(Icons.navigation_rounded, size: 19, color: Color(0xFF1D4ED8)),
                  tooltip: 'Navigate',
                  onPressed: () => _openMap(address, lat, lng),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRouteTab(String boyArea) {
    final refCoords = _getReferenceCoords(boyArea);
    final refLat = refCoords[0];
    final refLng = refCoords[1];

    // 1. Enrich every delivery stop with resolved area, lat/lng & distance from partner
    final List<Map<String, dynamic>> enrichedAll = _deliveries.asMap().entries.map((entry) {
      final idx = entry.key;
      final d = entry.value;
      final cust = _findMatchingCustomer(d);
      final areaName = _resolveStopArea(d, cust, boyArea);

      num? rawLat = num.tryParse((d['latitude'] ?? d['customerLatitude'])?.toString() ?? '');
      num? rawLng = num.tryParse((d['longitude'] ?? d['customerLongitude'])?.toString() ?? '');
      if (rawLat == null || rawLat == 0) {
        rawLat = num.tryParse(cust?['latitude']?.toString() ?? '');
      }
      if (rawLng == null || rawLng == 0) {
        rawLng = num.tryParse(cust?['longitude']?.toString() ?? '');
      }
      if ((rawLat == null || rawLat == 0) && cust?['addresses'] is List && (cust!['addresses'] as List).isNotEmpty) {
        final addr0 = (cust['addresses'] as List).first;
        if (addr0 is Map) {
          rawLat = num.tryParse(addr0['latitude']?.toString() ?? '');
          rawLng = num.tryParse(addr0['longitude']?.toString() ?? '');
        }
      }

      final areaCoords = _areaCenterCoords[areaName.toLowerCase()];
      final double? calcLat = (rawLat != null && rawLat != 0) ? rawLat.toDouble() : areaCoords?[0];
      final double? calcLng = (rawLng != null && rawLng != 0) ? rawLng.toDouble() : areaCoords?[1];
      final double distanceKm = (calcLat != null && calcLng != null)
          ? _haversineKm(refLat, refLng, calcLat, calcLng)
          : double.infinity;

      return {
        'originalIndex': idx,
        'delivery': d,
        'customer': cust,
        'area': areaName,
        'lat': calcLat,
        'lng': calcLng,
        'distanceKm': distanceKm,
      };
    }).toList();

    // Sort all stops strictly nearest first (tie-breaker: pending first, then name)
    enrichedAll.sort((a, b) {
      final da = a['distanceKm'] as double;
      final db = b['distanceKm'] as double;
      final cmp = da.compareTo(db);
      if (cmp != 0) return cmp;
      final sa = (a['delivery']['status'] == 'pending') ? 0 : 1;
      final sb = (b['delivery']['status'] == 'pending') ? 0 : 1;
      if (sa != sb) return sa.compareTo(sb);
      final na = (a['delivery']['customerName'] ?? '').toString().toLowerCase();
      final nb = (b['delivery']['customerName'] ?? '').toString().toLowerCase();
      return na.compareTo(nb);
    });

    // 2. Build location metadata sorted nearest-location-first
    final Map<String, Map<String, dynamic>> areaMetaMap = {};
    for (final item in enrichedAll) {
      final area = item['area'] as String;
      final dist = item['distanceKm'] as double;
      final isPend = item['delivery']['status'] == 'pending';
      if (!areaMetaMap.containsKey(area)) {
        areaMetaMap[area] = {
          'name': area,
          'minDist': dist,
          'minPendingDist': isPend ? dist : double.infinity,
          'count': 0,
          'pendingCount': 0,
        };
      }
      final m = areaMetaMap[area]!;
      m['count'] = (m['count'] as int) + 1;
      if (isPend) {
        m['pendingCount'] = (m['pendingCount'] as int) + 1;
        if (dist < (m['minPendingDist'] as double)) {
          m['minPendingDist'] = dist;
        }
      }
      if (dist < (m['minDist'] as double)) {
        m['minDist'] = dist;
      }
    }
    final sortedLocations = areaMetaMap.values.toList()
      ..sort((a, b) {
        final da = (a['minPendingDist'] as double).isFinite ? a['minPendingDist'] as double : a['minDist'] as double;
        final db = (b['minPendingDist'] as double).isFinite ? b['minPendingDist'] as double : b['minDist'] as double;
        return da.compareTo(db);
      });

    // Reset area filter if area no longer present
    final activeAreaFilter = (_routeSelectedArea == 'All' || areaMetaMap.containsKey(_routeSelectedArea))
        ? _routeSelectedArea
        : 'All';

    // Closest pending stop overall for hero highlight
    final nearestPendingEntry = enrichedAll.cast<Map<String, dynamic>?>().firstWhere(
      (e) => e?['delivery']?['status'] == 'pending',
      orElse: () => null,
    );

    // 3. Apply status, area, and search filters while keeping nearest-first sort
    final filteredEntries = enrichedAll.where((item) {
      final d = item['delivery'] as Map<String, dynamic>;
      final area = item['area'] as String;
      final idx = (item['originalIndex'] as int) + 1;

      if (_routeStatusFilter == 'pending' && d['status'] != 'pending') return false;
      if (_routeStatusFilter == 'delivered' && d['status'] != 'delivered') return false;
      if (activeAreaFilter != 'All' && area.toLowerCase() != activeAreaFilter.toLowerCase()) return false;

      if (_routeSearchQuery.isNotEmpty) {
        final name = (d['customerName'] ?? '').toString().toLowerCase();
        final addr = (d['customerAddress'] ?? '').toString().toLowerCase();
        final phone = (d['customerPhone'] ?? '').toString().toLowerCase();
        final custId = (d['customerId'] ?? d['id'] ?? '').toString().toLowerCase();
        return name.contains(_routeSearchQuery) ||
            addr.contains(_routeSearchQuery) ||
            area.toLowerCase().contains(_routeSearchQuery) ||
            phone.contains(_routeSearchQuery) ||
            custId.contains(_routeSearchQuery) ||
            idx.toString() == _routeSearchQuery;
      }
      return true;
    }).toList();

    // Group filtered entries by location (ordered nearest location first!) for Location-Wise mode
    final Map<String, List<Map<String, dynamic>>> groupedByLocation = {};
    for (final locMeta in sortedLocations) {
      groupedByLocation[locMeta['name'] as String] = [];
    }
    for (final item in filteredEntries) {
      final area = item['area'] as String;
      groupedByLocation.putIfAbsent(area, () => []).add(item);
    }
    final nonEmptyLocationGroups = groupedByLocation.entries.where((e) => e.value.isNotEmpty).toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row + GPS Detection Trigger
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Route & Nearest Stops',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: Color(0xFF0F172A)),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${sortedLocations.length} locations • ${_deliveries.length} drops (nearest first)',
                      style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              InkWell(
                onTap: _isLocatingPartner ? null : () => _detectPartnerLocation(requestPermission: true, silent: false),
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: _hasLiveGps ? const Color(0xFFECFDF5) : const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: _hasLiveGps ? const Color(0xFF86EFAC) : const Color(0xFFBFDBFE),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (_isLocatingPartner)
                        const SizedBox(
                          width: 12,
                          height: 12,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF059669)),
                        )
                      else
                        Icon(
                          _hasLiveGps ? Icons.my_location_rounded : Icons.location_searching_rounded,
                          size: 14,
                          color: _hasLiveGps ? const Color(0xFF059669) : const Color(0xFF1D4ED8),
                        ),
                      const SizedBox(width: 5),
                      Text(
                        _hasLiveGps ? 'Live GPS' : 'Use GPS',
                        style: TextStyle(
                          color: _hasLiveGps ? const Color(0xFF065F46) : const Color(0xFF1D4ED8),
                          fontWeight: FontWeight.w800,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Nearest Next Stop Hero Card (First Nearest Customer)
          if (nearestPendingEntry != null && _routeSearchQuery.isEmpty) ...[
            Builder(
              builder: (context) {
                final nd = nearestPendingEntry['delivery'] as Map<String, dynamic>;
                final nArea = nearestPendingEntry['area'] as String;
                final nDist = _formatDistanceLabel(nearestPendingEntry['distanceKm'] as double);
                final nAddr = (nd['customerAddress'] ?? '$nArea Doorstep').toString();
                final nLat = nearestPendingEntry['lat'] as num?;
                final nLng = nearestPendingEntry['lng'] as num?;
                final origIdx = nearestPendingEntry['originalIndex'] as int;

                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF064E3B), Color(0xFF059669)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF059669).withValues(alpha: 0.24),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(
                        width: double.infinity,
                        child: Wrap(
                          spacing: 8,
                          runSpacing: 6,
                          alignment: WrapAlignment.spaceBetween,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.near_me_rounded, size: 12, color: Colors.white),
                                  const SizedBox(width: 4),
                                  Text(
                                    'NEAREST NEXT • $nDist AWAY',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 0.3),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                '📍 $nArea',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(color: Color(0xFF065F46), fontSize: 10.5, fontWeight: FontWeight.w800),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: InkWell(
                              onTap: () => _openStopDetails(nd, origIdx),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    nd['customerName'] ?? 'Customer',
                                    style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    nAddr,
                                    style: TextStyle(color: Colors.white.withValues(alpha: 0.88), fontSize: 12),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.16),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              '${nd['plannedMilk'] ?? 1}L',
                              style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w900),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () => _openMap(nAddr, nLat, nLng),
                              icon: const Icon(Icons.navigation_rounded, size: 15, color: Colors.white),
                              label: const Text('Navigate', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w800)),
                              style: OutlinedButton.styleFrom(
                                side: BorderSide(color: Colors.white.withValues(alpha: 0.55)),
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: () => _showMarkDeliveredDialog(nd),
                              icon: const Icon(Icons.check_circle_rounded, size: 15, color: Color(0xFF065F46)),
                              label: const Text('Deliver Now', style: TextStyle(color: Color(0xFF065F46), fontSize: 12, fontWeight: FontWeight.w800)),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.white,
                                elevation: 0,
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
          ],

          // View Mode & Status Toggle Bar
          Row(
            children: [
              Expanded(
                child: InkWell(
                  onTap: () => setState(() => _routeSortMode = 'nearest'),
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 9),
                    decoration: BoxDecoration(
                      color: _routeSortMode == 'nearest' ? const Color(0xFF059669) : Colors.white,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: _routeSortMode == 'nearest' ? const Color(0xFF059669) : const Color(0xFFCBD5E1),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.near_me_rounded,
                          size: 15,
                          color: _routeSortMode == 'nearest' ? Colors.white : const Color(0xFF475569),
                        ),
                        const SizedBox(width: 5),
                        Text(
                          'Nearest First',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: _routeSortMode == 'nearest' ? Colors.white : const Color(0xFF475569),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: InkWell(
                  onTap: () => setState(() => _routeSortMode = 'location'),
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 9),
                    decoration: BoxDecoration(
                      color: _routeSortMode == 'location' ? const Color(0xFF059669) : Colors.white,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: _routeSortMode == 'location' ? const Color(0xFF059669) : const Color(0xFFCBD5E1),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.location_city_rounded,
                          size: 15,
                          color: _routeSortMode == 'location' ? Colors.white : const Color(0xFF475569),
                        ),
                        const SizedBox(width: 5),
                        Text(
                          'Location Wise',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: _routeSortMode == 'location' ? Colors.white : const Color(0xFF475569),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Location-Wise Filter Chips (Ordered Nearest Location First!)
          if (sortedLocations.isNotEmpty) ...[
            SizedBox(
              height: 40,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: ChoiceChip(
                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      visualDensity: VisualDensity.compact,
                      label: Text('All Locations (${enrichedAll.length})'),
                      selected: activeAreaFilter == 'All',
                      onSelected: (_) => setState(() => _routeSelectedArea = 'All'),
                      selectedColor: const Color(0xFFECFDF5),
                      backgroundColor: Colors.white,
                      labelStyle: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w800,
                        color: activeAreaFilter == 'All' ? const Color(0xFF065F46) : const Color(0xFF475569),
                      ),
                      side: BorderSide(
                        color: activeAreaFilter == 'All' ? const Color(0xFF059669) : const Color(0xFFCBD5E1),
                      ),
                    ),
                  ),
                  ...sortedLocations.map((loc) {
                    final locName = loc['name'] as String;
                    final locCount = loc['count'] as int;
                    final minD = (loc['minPendingDist'] as double).isFinite
                        ? loc['minPendingDist'] as double
                        : loc['minDist'] as double;
                    final isSel = activeAreaFilter.toLowerCase() == locName.toLowerCase();
                    return Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: ChoiceChip(
                        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        visualDensity: VisualDensity.compact,
                        label: Text('📍 $locName · ${_formatDistanceLabel(minD)} ($locCount)'),
                        selected: isSel,
                        onSelected: (_) => setState(() => _routeSelectedArea = locName),
                        selectedColor: const Color(0xFFECFDF5),
                        backgroundColor: Colors.white,
                        labelStyle: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                          color: isSel ? const Color(0xFF065F46) : const Color(0xFF475569),
                        ),
                        side: BorderSide(
                          color: isSel ? const Color(0xFF059669) : const Color(0xFFCBD5E1),
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ),
            const SizedBox(height: 10),
          ],

          // Route Search Bar + Status Chips
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFCBD5E1)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.02),
                  blurRadius: 4,
                  offset: const Offset(0, 1),
                ),
              ],
            ),
            child: TextField(
              controller: _routeSearchCtrl,
              onChanged: (val) => setState(() => _routeSearchQuery = val.trim().toLowerCase()),
              decoration: InputDecoration(
                hintText: 'Search stops by name, location, address or phone...',
                hintStyle: const TextStyle(fontSize: 12.5, color: Color(0xFF94A3B8)),
                prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF059669), size: 20),
                suffixIcon: _routeSearchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.close_rounded, size: 18, color: Color(0xFF64748B)),
                        onPressed: () {
                          _routeSearchCtrl.clear();
                          setState(() => _routeSearchQuery = '');
                        },
                      )
                    : null,
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
              ),
            ),
          ),
          const SizedBox(height: 10),

          // Status quick filter row
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (final st in [
                  {'id': 'all', 'label': 'All (${enrichedAll.length})'},
                  {'id': 'pending', 'label': 'Pending (${enrichedAll.where((e) => e['delivery']['status'] == 'pending').length})'},
                  {'id': 'delivered', 'label': 'Delivered (${enrichedAll.where((e) => e['delivery']['status'] == 'delivered').length})'},
                ])
                  Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: InkWell(
                      onTap: () => setState(() => _routeStatusFilter = st['id']!),
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 5),
                        decoration: BoxDecoration(
                          color: _routeStatusFilter == st['id'] ? const Color(0xFF0F172A) : Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: _routeStatusFilter == st['id'] ? const Color(0xFF0F172A) : const Color(0xFFE2E8F0),
                          ),
                        ),
                        child: Text(
                          st['label']!,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: _routeStatusFilter == st['id'] ? Colors.white : const Color(0xFF64748B),
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          if (_deliveries.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFE2E8F0))),
              child: const Center(child: Text('No route stops scheduled for today')),
            )
          else if (filteredEntries.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Center(
                child: Column(
                  children: [
                    const Icon(Icons.search_off_rounded, size: 36, color: Color(0xFF94A3B8)),
                    const SizedBox(height: 8),
                    Text(
                      _routeSearchQuery.isNotEmpty
                          ? 'No stops found matching "$_routeSearchQuery"'
                          : 'No stops match this location/status filter',
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF64748B), fontSize: 13),
                    ),
                    const SizedBox(height: 10),
                    TextButton(
                      onPressed: () {
                        _routeSearchCtrl.clear();
                        setState(() {
                          _routeSearchQuery = '';
                          _routeSelectedArea = 'All';
                          _routeStatusFilter = 'all';
                        });
                      },
                      child: const Text('Reset Filters', style: TextStyle(color: Color(0xFF059669), fontWeight: FontWeight.w800)),
                    ),
                  ],
                ),
              ),
            )
          else if (_routeSortMode == 'location')
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: nonEmptyLocationGroups.map((group) {
                final locName = group.key;
                final stops = group.value;
                final closestDist = _formatDistanceLabel(stops.first['distanceKm'] as double);
                final pendingInGroup = stops.where((s) => s['delivery']['status'] == 'pending').length;

                return Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Location Header (Nearest Location First!)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                        margin: const EdgeInsets.only(bottom: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFECFDF5),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFA7F3D0)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Row(
                                children: [
                                  const Icon(Icons.location_on_rounded, size: 16, color: Color(0xFF059669)),
                                  const SizedBox(width: 6),
                                  Flexible(
                                    child: Text(
                                      locName,
                                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13.5, color: Color(0xFF065F46)),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      'Nearest: $closestDist',
                                      style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF1D4ED8)),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              '$pendingInGroup/${stops.length} left',
                              style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Color(0xFF047857)),
                            ),
                          ],
                        ),
                      ),
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: stops.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 10),
                        itemBuilder: (ctx, idx) {
                          final item = stops[idx];
                          final isNearestPending = nearestPendingEntry != null &&
                              identical(item['delivery'], nearestPendingEntry['delivery']);
                          return _buildRouteStopCard(item, idx, isNearestPending: isNearestPending);
                        },
                      ),
                    ],
                  ),
                );
              }).toList(),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: filteredEntries.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (ctx, i) {
                final item = filteredEntries[i];
                final isNearestPending = nearestPendingEntry != null &&
                    identical(item['delivery'], nearestPendingEntry['delivery']);
                return _buildRouteStopCard(item, i, isNearestPending: isNearestPending);
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
                final sub = c['subscription'] is Map ? c['subscription'] : {};
                final subPlan = sub['plan'] is Map ? sub['plan'] : {};
                final num rawMilk = num.tryParse(plan['milkQty']?.toString() ?? '') ?? 0;
                final num rawSubMilk = num.tryParse(subPlan['milkQty']?.toString() ?? sub['milkQty']?.toString() ?? '') ?? 0;
                final num milk = rawMilk > 0 ? rawMilk : (rawSubMilk > 0 ? rawSubMilk : 1);
                final endDateStr = (sub['endDate'] ?? c['subscriptionEnd'] ?? '').toString();
                final endDate = DateTime.tryParse(endDateStr);
                final now = DateTime.now();
                final isExpired = endDate != null && endDate.isBefore(now);
                final daysRemaining = endDate?.difference(now).inDays;
                final balance = num.tryParse(c['currentBalance']?.toString() ?? '0') ?? 0;

                return InkWell(
                  onTap: () => _openCustomerDetails(c),
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: isExpired ? const Color(0xFFFECACA) : const Color(0xFFE2E8F0),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.02),
                          blurRadius: 4,
                          offset: const Offset(0, 1),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 38,
                              height: 38,
                              decoration: BoxDecoration(
                                color: isExpired ? const Color(0xFFFEF2F2) : const Color(0xFFF0FDF4),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: isExpired ? const Color(0xFFFECACA) : const Color(0xFFBBF7D0),
                                ),
                              ),
                              child: Center(
                                child: Text(
                                  name.isNotEmpty ? name[0].toUpperCase() : 'C',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w900,
                                    color: isExpired ? const Color(0xFFDC2626) : const Color(0xFF059669),
                                  ),
                                ),
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
                                        child: Text(
                                          name,
                                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5, color: Color(0xFF0F172A)),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      if (c['customerId'] != null && c['customerId'].toString().isNotEmpty) ...[
                                        const SizedBox(width: 6),
                                        Text(
                                          '#${c['customerId']}',
                                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                                        ),
                                      ],
                                    ],
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    address,
                                    style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.picture_as_pdf_rounded, size: 20, color: Color(0xFF059669)),
                              tooltip: 'Download Statement PDF',
                              onPressed: () {
                                ReportDownloadSheet.show(
                                  context,
                                  role: 'customer',
                                  customerId: c['customerId'] ?? c['_id'] ?? c['id'],
                                  customTitle: '${c['name'] ?? 'Customer'} Statement',
                                  initialCustomers: _assignedCustomers,
                                );
                              },
                            ),
                            IconButton(
                              icon: const Icon(Icons.phone_rounded, size: 18, color: Color(0xFF059669)),
                              onPressed: () => _callCustomer(mobile),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: [
                            // Milk Plan Tag
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFFECFDF5),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: const Color(0xFFBBF7D0)),
                              ),
                              child: Text(
                                '🥛 ${milk}L ${plan['frequency'] == 'alternate' ? 'Alternate' : 'Daily'}',
                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 11, color: Color(0xFF065F46)),
                              ),
                            ),

                            // Expiry Date Tag
                            if (endDate != null)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: isExpired
                                      ? const Color(0xFFFEF2F2)
                                      : (daysRemaining != null && daysRemaining <= 5 ? const Color(0xFFFFFBEB) : const Color(0xFFF5F3FF)),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(
                                    color: isExpired
                                        ? const Color(0xFFFECACA)
                                        : (daysRemaining != null && daysRemaining <= 5 ? const Color(0xFFFDE68A) : const Color(0xFFDDD6FE)),
                                  ),
                                ),
                                child: Text(
                                  isExpired
                                      ? '⚠️ Expired'
                                      : (daysRemaining != null && daysRemaining <= 5
                                          ? '⏳ Expiring (${daysRemaining}d)'
                                          : '📅 Till ${endDate.day}/${endDate.month}/${endDate.year}'),
                                  style: TextStyle(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 11,
                                    color: isExpired
                                        ? const Color(0xFFDC2626)
                                        : (daysRemaining != null && daysRemaining <= 5 ? const Color(0xFFB45309) : const Color(0xFF7C3AED)),
                                  ),
                                ),
                              ),

                            // Overdue / Settled Tag
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: balance > 0 ? const Color(0xFFFEF2F2) : const Color(0xFFF0FDF4),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(
                                  color: balance > 0 ? const Color(0xFFFECACA) : const Color(0xFFBBF7D0),
                                ),
                              ),
                              child: Text(
                                balance > 0 ? '⚠️ ₹${balance.toInt()} Overdue' : '✓ Settled',
                                style: TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 11,
                                  color: balance > 0 ? const Color(0xFFDC2626) : const Color(0xFF059669),
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
          partnerName: _profileName,
          onSuccess: () {
            _loadData(silent: true);
            _loadNotifications(silent: true);
          },
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
          onMap: (addr) => _openMap(
            addr,
            stop['latitude'] as num? ?? stop['customerLatitude'] as num?,
            stop['longitude'] as num? ?? stop['customerLongitude'] as num?,
          ),
        ),
      ),
    );
  }

  void _openCustomerDetails(Map<String, dynamic> customer) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (ctx) => _FullScreenCustomerDetailsPage(
          customer: customer,
          api: _api,
          deliveries: _deliveries,
          payments: _payments,
          onCustomerUpdated: () => _loadData(silent: true),
          onCall: (phone) => _callCustomer(phone),
          onMap: (addr) => _openMap(
            addr,
            customer['latitude'] as num?,
            customer['longitude'] as num?,
          ),
        ),
      ),
    );
  }


  // =========================================================
  // TAB 3: CASH RECONCILIATION
  // =========================================================
  Widget _buildCashTab() {
    final bool isToday = _cashPeriod == 'today';
    final List<Map<String, dynamic>> periodDrops = (isToday
            ? _deliveries
            : (_allDeliveries.isNotEmpty ? _allDeliveries : _deliveries))
        .where((d) => d['status'] == 'delivered')
        .toList();

    final List<Map<String, dynamic>> periodNonDelPayments = isToday
        ? _todayNonDeliveryPayments
        : _payments
            .where((p) => !(p['referenceNumber'] ?? '').toString().toUpperCase().contains('DELIVERY-'))
            .toList();

    final double delCash = periodDrops.fold(0.0, (s, d) => s + _cashCollectedFor(d));
    final double delUpi = periodDrops.fold(0.0, (s, d) => s + _upiCollectedFor(d));
    final double addonCash = periodDrops.fold(0.0, (s, d) => s + _addonCashFor(d));
    final double addonUpi = periodDrops.fold(0.0, (s, d) => s + _addonUpiFor(d));
    final double baseCash = (delCash - addonCash) > 0 ? (delCash - addonCash) : 0.0;
    final double baseUpi = (delUpi - addonUpi) > 0 ? (delUpi - addonUpi) : 0.0;

    final double custCash = periodNonDelPayments
        .where((p) => (p['paymentMethod'] ?? '').toString().toLowerCase() == 'cash')
        .fold(0.0, (s, p) => s + (num.tryParse((p['amount'] ?? '0').toString()) ?? 0).toDouble());
    final double custUpi = periodNonDelPayments
        .where((p) => (p['paymentMethod'] ?? '').toString().toLowerCase() == 'upi')
        .fold(0.0, (s, p) => s + (num.tryParse((p['amount'] ?? '0').toString()) ?? 0).toDouble());

    final double totalCash = isToday ? _todayCash : (delCash + custCash);
    final double totalUpi = isToday ? _todayUpi : (delUpi + custUpi);
    final double grandTotal = totalCash + totalUpi;

    final nowIst = IstDateTime.toIst(DateTime.now());
    final todayStr = '${nowIst.year}-${nowIst.month.toString().padLeft(2, '0')}-${nowIst.day.toString().padLeft(2, '0')}';
    final List<Map<String, dynamic>> todayHandovers = _handovers.where((h) {
      final rawDt = (h['handoverDate'] ?? h['createdAt'] ?? '').toString();
      final dt = DateTime.tryParse(rawDt);
      if (dt == null) return false;
      final istDt = IstDateTime.toIst(dt);
      final hStr = '${istDt.year}-${istDt.month.toString().padLeft(2, '0')}-${istDt.day.toString().padLeft(2, '0')}';
      return hStr == todayStr;
    }).toList();

    final double handedOverToday = todayHandovers
        .where((h) => h['status'] == 'pending' || h['status'] == 'accepted')
        .fold(0.0, (s, h) => s + (num.tryParse((h['amount'] ?? '0').toString()) ?? 0).toDouble());
    final double remainingCashInHand = (_todayCash - handedOverToday) > 0 ? (_todayCash - handedOverToday) : 0.0;
    Map<String, dynamic>? pendingHandover;
    for (final h in todayHandovers) {
      if (h['status'] == 'pending') {
        pendingHandover = h;
        break;
      }
    }

    final List<Map<String, dynamic>> filteredNonDel = periodNonDelPayments.where((p) {
      final pm = (p['paymentMethod'] ?? '').toString().toLowerCase();
      if (_cashFilter == 'cash') return pm == 'cash';
      if (_cashFilter == 'upi') return pm == 'upi';
      if (_cashFilter == 'addons') return false;
      return true;
    }).toList();

    final List<Map<String, dynamic>> filteredDrops = periodDrops.where((d) {
      final cashAmt = _cashCollectedFor(d);
      final upiAmt = _upiCollectedFor(d);
      final hasAddons = (d['addons'] is List && (d['addons'] as List).isNotEmpty) ||
          (num.tryParse((d['addonsTotal'] ?? '0').toString()) ?? 0) > 0;
      if (_cashFilter == 'cash') return cashAmt > 0;
      if (_cashFilter == 'upi') return upiAmt > 0;
      if (_cashFilter == 'addons') return hasAddons;
      return true;
    }).toList();

    return RefreshIndicator(
      onRefresh: () => _loadData(),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Cash & Collections', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: Color(0xFF0F172A))),
                      Text('All Cash, UPI, Add-ons & Customer payments', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                InkWell(
                  borderRadius: BorderRadius.circular(10),
                  onTap: () => ReportDownloadSheet.show(
                    context,
                    role: 'partner',
                    initialCustomers: _assignedCustomers,
                    initialDeliveries: periodDrops.isNotEmpty ? periodDrops : _deliveries,
                  ),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0D5C3A),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.download_rounded, color: Colors.white, size: 14),
                        SizedBox(width: 4),
                        Text('PDF Report', style: TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.w800)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Period Switcher: Today vs All Time
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () => setState(() => _cashPeriod = 'today'),
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(
                          color: isToday ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(8),
                          boxShadow: isToday ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4)] : null,
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          'Today Collections',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: isToday ? const Color(0xFF059669) : const Color(0xFF64748B)),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: InkWell(
                      onTap: () => setState(() => _cashPeriod = 'all'),
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(
                          color: !isToday ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(8),
                          boxShadow: !isToday ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4)] : null,
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          'All History',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: !isToday ? const Color(0xFF059669) : const Color(0xFF64748B)),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Hero Summary Card: Total + Cash + UPI + Cash In Hand
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [Color(0xFF065F46), Color(0xFF059669)]),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isToday ? 'TOTAL COLLECTED TODAY (CASH + UPI)' : 'ALL-TIME COLLECTED (CASH + UPI)',
                    style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Text('₹${grandTotal.toInt()}', style: const TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w900)),
                      if (addonCash + addonUpi > 0)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.18),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            '+₹${(addonCash + addonUpi).toInt()} Add-ons',
                            style: const TextStyle(color: Color(0xFFFEF3C7), fontSize: 11, fontWeight: FontWeight.w800),
                          ),
                        ),
                      if (custCash + custUpi > 0)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.18),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            '+₹${(custCash + custUpi).toInt()} Customer Pays',
                            style: const TextStyle(color: Color(0xFFD1FAE5), fontSize: 11, fontWeight: FontWeight.w800),
                          ),
                        ),
                    ],
                  ),
                  const Divider(height: 22, color: Colors.white24),
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('CASH COLLECTED', style: TextStyle(color: Colors.white70, fontSize: 9.5, fontWeight: FontWeight.w700)),
                            Text('₹${totalCash.toInt()}', style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900)),
                          ],
                        ),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('UPI COLLECTED', style: TextStyle(color: Colors.white70, fontSize: 9.5, fontWeight: FontWeight.w700)),
                            Text('₹${totalUpi.toInt()}', style: const TextStyle(color: Color(0xFFBAE6FD), fontSize: 16, fontWeight: FontWeight.w900)),
                          ],
                        ),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            const Text('CASH IN HAND', style: TextStyle(color: Colors.white70, fontSize: 9.5, fontWeight: FontWeight.w700)),
                            Text(
                              '₹${remainingCashInHand.toInt()}',
                              style: const TextStyle(color: Color(0xFFFDE68A), fontSize: 16, fontWeight: FontWeight.w900),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // 2x2 Complete Breakdown Grid (Doorstep, Add-ons, UPI, Customer/Sub)
            Row(
              children: [
                Expanded(
                  child: _buildCashSourceTile(
                    title: 'Doorstep Cash',
                    amount: '₹${baseCash.toInt()}',
                    subtitle: baseUpi > 0 ? '+ ₹${baseUpi.toInt()} Doorstep UPI' : 'Base Milk & Curd',
                    accentColor: const Color(0xFF059669),
                    bgColor: const Color(0xFFECFDF5),
                    borderColor: const Color(0xFFBBF7D0),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _buildCashSourceTile(
                    title: 'Add-ons Collected',
                    amount: '₹${(addonCash + addonUpi).toInt()}',
                    subtitle: 'Cash ₹${addonCash.toInt()} • UPI ₹${addonUpi.toInt()}',
                    accentColor: const Color(0xFFB45309),
                    bgColor: const Color(0xFFFFFBEB),
                    borderColor: const Color(0xFFFDE68A),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: _buildCashSourceTile(
                    title: 'UPI Direct Total',
                    amount: '₹${totalUpi.toInt()}',
                    subtitle: 'Doorstep + Add-ons + Cust',
                    accentColor: const Color(0xFF2563EB),
                    bgColor: const Color(0xFFEFF6FF),
                    borderColor: const Color(0xFFBFDBFE),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _buildCashSourceTile(
                    title: 'Customer / Sub Pays',
                    amount: '₹${(custCash + custUpi).toInt()}',
                    subtitle: 'Cash ₹${custCash.toInt()} • UPI ₹${custUpi.toInt()}',
                    accentColor: const Color(0xFF7C3AED),
                    bgColor: const Color(0xFFF5F3FF),
                    borderColor: const Color(0xFFDDD6FE),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Cash Handover to Admin Section
            Container(
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
                      const Expanded(
                        child: Text('Cash Handover to Admin', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Color(0xFF0F172A))),
                      ),
                      if (pendingHandover != null)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(color: const Color(0xFFFFF7ED), borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFFFDBA74))),
                          child: Text('Pending ₹${pendingHandover['amount'] ?? 0}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFFC2410C))),
                        )
                      else if (handedOverToday > 0)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(color: const Color(0xFFECFDF5), borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFFBBF7D0))),
                          child: Text('Handed ₹${handedOverToday.toInt()}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF059669))),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (pendingHandover != null)
                    Text(
                      'Your handover of ₹${pendingHandover['amount'] ?? 0} is awaiting admin verification.',
                      style: const TextStyle(fontSize: 12, color: Color(0xFF9A3412), fontWeight: FontWeight.w600),
                    )
                  else if (remainingCashInHand > 0)
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: () => _showSubmitHandoverSheet(remainingCashInHand),
                        icon: const Icon(Icons.account_balance_wallet_rounded, size: 17, color: Colors.white),
                        label: Text(
                          'Handover Cash to Admin (₹${remainingCashInHand.toInt()})',
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 13),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF059669),
                          padding: const EdgeInsets.symmetric(vertical: 11),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    )
                  else
                    const Text(
                      '✓ No pending cash in hand to deposit right now.',
                      style: TextStyle(fontSize: 12, color: Color(0xFF059669), fontWeight: FontWeight.w700),
                    ),
                  if (_handovers.isNotEmpty) ...[
                    const Divider(height: 18, color: Color(0xFFF1F5F9)),
                    ..._handovers.take(3).map((h) {
                      final st = (h['status'] ?? 'pending').toString().toLowerCase();
                      final stColor = st == 'accepted'
                          ? const Color(0xFF059669)
                          : st == 'rejected'
                              ? const Color(0xFFDC2626)
                              : const Color(0xFFD97706);
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                '₹${h['amount'] ?? 0} • ${(h['handoverMethod'] ?? 'counter').toString().replaceAll('_', ' ').toUpperCase()}',
                                style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF334155)),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            Text(
                              st.toUpperCase(),
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: stColor),
                            ),
                          ],
                        ),
                      );
                    }),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Filter Pills for Transactions
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final f in [
                    {'id': 'all', 'label': 'All (${filteredDrops.length + filteredNonDel.length})'},
                    {'id': 'cash', 'label': '💵 Cash'},
                    {'id': 'upi', 'label': '📱 UPI'},
                    {'id': 'addons', 'label': '🛒 Add-ons'},
                  ])
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: InkWell(
                        onTap: () => setState(() => _cashFilter = f['id']!),
                        borderRadius: BorderRadius.circular(20),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                          decoration: BoxDecoration(
                            color: _cashFilter == f['id'] ? const Color(0xFF0D5C3A) : Colors.white,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: _cashFilter == f['id'] ? const Color(0xFF0D5C3A) : const Color(0xFFCBD5E1)),
                          ),
                          child: Text(
                            f['label']!,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: _cashFilter == f['id'] ? Colors.white : const Color(0xFF475569),
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            if (filteredNonDel.isNotEmpty) ...[
              const Text('Customer & Subscription Collections', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Color(0xFF0F172A))),
              const SizedBox(height: 10),
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: filteredNonDel.length,
                separatorBuilder: (_, _) => const SizedBox(height: 8),
                itemBuilder: (ctx, i) {
                  final p = filteredNonDel[i];
                  final pAmt = (num.tryParse((p['amount'] ?? '0').toString()) ?? 0).toInt();
                  final pMethod = (p['paymentMethod'] ?? 'cash').toString().toUpperCase();
                  final isCashPay = pMethod == 'CASH';
                  return Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFBBF7D0)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(p['customerName'] ?? 'Customer', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5, color: Color(0xFF0F172A))),
                              Text(
                                '$pMethod • ${(p['notes'] ?? 'Customer Payment').toString()}',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 11, color: Color(0xFF065F46), fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '₹$pAmt Collected',
                          style: TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 13.5,
                            color: isCashPay ? const Color(0xFF059669) : const Color(0xFF2563EB),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
              const SizedBox(height: 18),
            ],
            Text(
              isToday ? 'Today Paid Drops & Add-ons' : 'All Paid Drops & Add-ons',
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 10),
            if (filteredDrops.isEmpty && filteredNonDel.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: const Text(
                  'No matching collections recorded for this filter.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: filteredDrops.length,
                separatorBuilder: (_, _) => const SizedBox(height: 8),
                itemBuilder: (ctx, i) {
                  final d = filteredDrops[i];
                  final cashAmt = _cashCollectedFor(d);
                  final upiAmt = _upiCollectedFor(d);
                  final paidAmt = cashAmt + upiAmt;
                  final addonCashAmt = _addonCashFor(d);
                  final addonsList = d['addons'] is List ? (d['addons'] as List) : const [];
                  final addonsTotal = (num.tryParse((d['addonsTotal'] ?? '0').toString()) ?? 0).toDouble();
                  final baseMethod = (d['paymentMethod'] ?? 'advance').toString().toUpperCase();
                  final addonMethod = (d['addonPaymentMethod'] ?? '').toString().toUpperCase();
                  final delDateStr = (d['deliveryDate'] ?? '').toString();

                  final methodLabel = addonMethod.isNotEmpty && addonMethod != baseMethod
                      ? '${!isToday && delDateStr.isNotEmpty ? '$delDateStr • ' : ''}Method: $baseMethod · Add-ons $addonMethod'
                      : '${!isToday && delDateStr.isNotEmpty ? '$delDateStr • ' : ''}Method: $baseMethod';

                  return Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: addonCashAmt > 0 ? const Color(0xFFFDE68A) : const Color(0xFFE2E8F0)),
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
                                  Text(d['customerName'] ?? 'Customer', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5, color: Color(0xFF0F172A))),
                                  Text(methodLabel, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                                ],
                              ),
                            ),
                            Text(
                              paidAmt > 0 ? '₹${paidAmt.toInt()} ${cashAmt > 0 ? 'CASH' : 'UPI'}' : (baseMethod == 'ADVANCE' ? 'Prepaid ₹0' : 'Credit Due'),
                              style: TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 13.5,
                                color: cashAmt > 0
                                    ? const Color(0xFF059669)
                                    : upiAmt > 0
                                        ? const Color(0xFF2563EB)
                                        : const Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                        if (addonsList.isNotEmpty || addonsTotal > 0) ...[
                          const SizedBox(height: 6),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFFFBEB),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFFFDE68A)),
                            ),
                            child: Text(
                              '+ ${addonsList.isNotEmpty ? addonsList.map((a) => '${a['name']} × ${a['quantity']}').join(', ') : 'Add-ons'} · ₹${addonsTotal.toInt()}${addonCashAmt > 0 ? ' (Cash ₹${addonCashAmt.toInt()})' : (addonMethod == 'UPI' ? ' (UPI ₹${(num.tryParse((d['addonPaidAmount'] ?? '0').toString()) ?? 0).toInt()})' : '')}',
                              style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF92400E)),
                            ),
                          ),
                        ],
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

  Widget _buildCashSourceTile({
    required String title,
    required String amount,
    required String subtitle,
    required Color accentColor,
    required Color bgColor,
    required Color borderColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: accentColor), maxLines: 1, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 4),
          Text(amount, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: accentColor)),
          const SizedBox(height: 2),
          Text(subtitle, style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: Color(0xFF475569)), maxLines: 1, overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }

  void _showSubmitHandoverSheet(double availableCash) {
    final amtCtrl = TextEditingController(text: availableCash.toInt().toString());
    final notesCtrl = TextEditingController();
    String method = 'dairy_counter';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) => StatefulBuilder(
        builder: (modalCtx, setModalState) => Container(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(modalCtx).viewInsets.bottom + 20,
            top: 20,
            left: 20,
            right: 20,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Handover Cash to Admin', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                  IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.of(modalCtx).pop()),
                ],
              ),
              const SizedBox(height: 8),
              TextField(
                controller: amtCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Amount to Handover (₹)',
                  prefixText: '₹ ',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: method,
                isExpanded: true,
                decoration: const InputDecoration(labelText: 'Handover Method', border: OutlineInputBorder(), isDense: true),
                items: const [
                  DropdownMenuItem(value: 'dairy_counter', child: Text('💵 Dairy Counter')),
                  DropdownMenuItem(value: 'bank_deposit', child: Text('🏦 Bank Safe')),
                  DropdownMenuItem(value: 'upi', child: Text('📱 UPI to Admin')),
                ],
                onChanged: (v) {
                  if (v != null) setModalState(() => method = v);
                },
              ),
              const SizedBox(height: 12),
              TextField(
                controller: notesCtrl,
                decoration: const InputDecoration(labelText: 'Notes (Optional)', border: OutlineInputBorder(), isDense: true),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isSubmittingHandover
                      ? null
                      : () async {
                          final amt = num.tryParse(amtCtrl.text.trim()) ?? 0;
                          if (amt <= 0) return;
                          setModalState(() => _isSubmittingHandover = true);
                          setState(() => _isSubmittingHandover = true);
                          try {
                            final authUser = context.read<AuthProvider>().user;
                            final res = await _api.post('/api/payments/handover', {
                              'deliveryBoyId': authUser?.id ?? '',
                              'deliveryBoyName': _profileName.isNotEmpty ? _profileName : (authUser?.name ?? 'Delivery Partner'),
                              'deliveryBoyMobile': _profilePhone.isNotEmpty ? _profilePhone : (authUser?.mobile ?? ''),
                              'assignedArea': _profileArea,
                              'amount': amt,
                              'physicalCashCollected': _todayCash.toInt(),
                              'upiCollected': _todayUpi.toInt(),
                              'handoverMethod': method,
                              'notes': notesCtrl.text.trim(),
                            });
                            if (!mounted) return;
                            if (res['success'] == true) {
                              if (modalCtx.mounted) Navigator.of(modalCtx).pop();
                              await _loadData(silent: true);
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('✓ Cash handover of ₹$amt submitted!'), backgroundColor: const Color(0xFF059669)),
                                );
                              }
                            } else {
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text(res['message']?.toString() ?? 'Failed to submit handover'), backgroundColor: const Color(0xFFDC2626)),
                                );
                              }
                            }
                          } finally {
                            if (mounted) setState(() => _isSubmittingHandover = false);
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF059669),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _isSubmittingHandover
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Submit Handover Request', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // =========================================================
  // =========================================================
  // TAB 4: PARTNER PROFILE (MATCHING EXACT REFERENCE IMAGE)
  // =========================================================
  Widget _buildProfileTab(String boyName, String boyArea) {
    final displayName = _profileName.isNotEmpty ? _profileName : (boyName.isNotEmpty ? boyName : 'Naveen');
    final partnerDisplayId = _partnerId.isNotEmpty ? _partnerId : 'PART-43A4';
    final pendingDrops = _deliveries.where((d) => d['status'] == 'pending').length;
    final dropsBadge = pendingDrops > 0 ? '$pendingDrops Drops' : '${_deliveries.length} Drops';

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Header: Title & Subtitle + Top-Right Milk Illustration
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text(
                      'My Profile',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF0C2340),
                        letterSpacing: -0.3,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Manage your account, deliveries and preferences.',
                      style: TextStyle(
                        fontSize: 12.5,
                        color: Color(0xFF6B7280),
                      ),
                    ),
                  ],
                ),
              ),
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: SizedBox(
                  width: 52,
                  height: 52,
                  child: Image.asset(
                    'assets/images/cat_img_milk.png',
                    fit: BoxFit.cover,
                    errorBuilder: (c, e, s) => Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0FDF4),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE2EBE5)),
                      ),
                      child: const Icon(Icons.local_shipping_outlined, color: Color(0xFF0D5C3A), size: 26),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // 2. Partner Identity Card matching reference image
          InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: () => setState(() => _activeProfileSubScreen = 'personal'),
            child: Container(
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
              child: Row(
                children: [
                  Container(
                    width: 54,
                    height: 54,
                    decoration: const BoxDecoration(
                      color: Color(0xFFE2F1EA),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.person_outline_rounded,
                      color: Color(0xFF0D5C3A),
                      size: 28,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          displayName,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF0C2340),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'ID: $partnerDisplayId',
                          style: const TextStyle(
                            fontSize: 12,
                            color: Color(0xFF6B7280),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        Text(
                          _profilePhone,
                          style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE2F1EA),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Text(
                      'Active',
                      style: TextStyle(
                        color: Color(0xFF0D5C3A),
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  const Icon(Icons.chevron_right_rounded, color: Color(0xFF9CA3AF), size: 20),
                ],
              ),
            ),
          ),
          const SizedBox(height: 18),

          // 3. SECTION 1: Deliveries & Operations
          _buildPartnerProfileSection(
            headerIcon: Icons.local_shipping_outlined,
            headerTitle: 'Deliveries & Operations',
            items: [
              _buildPartnerProfileItemRow(
                icon: Icons.local_shipping_outlined,
                title: 'Deliveries',
                subtitle: 'View all deliveries, drops & fulfillment details',
                badgeText: dropsBadge,
                badgeBg: const Color(0xFFE2F1EA),
                badgeColor: const Color(0xFF0D5C3A),
                onTap: () => setState(() => _activeProfileSubScreen = 'deliveries_details'),
              ),
              _buildPartnerProfileItemRow(
                icon: Icons.receipt_long_rounded,
                title: 'Subscription History & Orders',
                subtitle: 'Customer recurring plans, vacation holds & order ledger',
                badgeText: 'History',
                badgeBg: const Color(0xFFE2F1EA),
                badgeColor: const Color(0xFF0D5C3A),
                onTap: () {
                  setState(() => _activeProfileSubScreen = 'subscriptions_history');
                  _fetchSubscriptions();
                },
              ),
              _buildPartnerProfileItemRow(
                icon: Icons.location_on_outlined,
                title: 'Addresses',
                subtitle: 'Manage your doorstep delivery route & hub',
                badgeText: _profileArea.isNotEmpty ? _profileArea : 'Route',
                badgeBg: const Color(0xFFE2F1EA),
                badgeColor: const Color(0xFF0D5C3A),
                onTap: () => setState(() => _activeProfileSubScreen = 'territory'),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // 4. SECTION 2: Support & Help
          _buildPartnerProfileSection(
            headerIcon: Icons.headset_mic_outlined,
            headerTitle: 'Support & Help',
            items: [
              _buildPartnerProfileItemRow(
                icon: Icons.chat_bubble_outline_rounded,
                title: 'Customer Care & Helplines',
                subtitle: 'WhatsApp chat & 24/7 depot support',
                onTap: () => setState(() => _activeProfileSubScreen = 'support'),
              ),
              _buildPartnerProfileItemRow(
                icon: Icons.two_wheeler_outlined,
                title: 'Vehicle & Equipment',
                subtitle: '$_vehiclePlate · $_vehicleModel',
                onTap: () => setState(() => _activeProfileSubScreen = 'vehicle'),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // 5. SECTION 3: Account Actions
          _buildPartnerProfileSection(
            headerIcon: Icons.security_outlined,
            headerTitle: 'Account Actions',
            items: [
              _buildPartnerProfileItemRow(
                icon: Icons.logout_rounded,
                title: 'Log out',
                subtitle: 'Sign out from partner account',
                isDestructive: true,
                onTap: _showLogoutDialog,
              ),
              _buildPartnerProfileItemRow(
                icon: Icons.delete_outline_rounded,
                title: 'Delete Account',
                subtitle: 'Permanently remove your account & records',
                isDestructive: true,
                onTap: _showDeleteAccountDialog,
              ),
            ],
          ),
          const SizedBox(height: 30),
        ],
      ),
    );
  }

  Widget _buildPartnerProfileSection({
    required IconData headerIcon,
    required String headerTitle,
    required List<Widget> items,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2EBE5)),
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
              Icon(headerIcon, color: const Color(0xFF0D5C3A), size: 18),
              const SizedBox(width: 8),
              Text(
                headerTitle,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0C2340),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Column(children: items),
        ],
      ),
    );
  }

  Widget _buildPartnerProfileItemRow({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    String? badgeText,
    Color? badgeBg,
    Color? badgeColor,
    bool isDestructive = false,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 9.0, horizontal: 4.0),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: isDestructive ? const Color(0xFFFEE2E2) : const Color(0xFFF3F7F4),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                icon,
                color: isDestructive ? const Color(0xFFDC2626) : const Color(0xFF0D5C3A),
                size: 19,
              ),
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
                      color: isDestructive ? const Color(0xFFDC2626) : const Color(0xFF0C2340),
                    ),
                  ),
                  const SizedBox(height: 1),
                  Text(
                    subtitle,
                    style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280)),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            if (badgeText != null) ...[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: badgeBg ?? const Color(0xFFE2F1EA),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  badgeText,
                  style: TextStyle(
                    color: badgeColor ?? const Color(0xFF0D5C3A),
                    fontSize: 10.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(width: 6),
            ],
            const Icon(Icons.chevron_right_rounded, color: Color(0xFF9CA3AF), size: 18),
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
                          onChanged: (val) => _updateOnlineDutyStatus(val),
                        ),
                      ],
                    ),
                  ],
                ),
                const Divider(height: 24, color: Color(0xFFF1F5F9)),
                _buildFullScreenRow('Blood Group', _bloodGroup),
                const Divider(height: 24, color: Color(0xFFF1F5F9)),
                _buildFullScreenRow('Primary Mobile', _profilePhone.isNotEmpty ? _profilePhone : 'Not provided'),
                const Divider(height: 24, color: Color(0xFFF1F5F9)),
                _buildFullScreenRow('Official Email', _profileEmail.isNotEmpty ? _profileEmail : 'Not provided'),
                const Divider(height: 24, color: Color(0xFFF1F5F9)),
                _buildFullScreenRow('Assigned Route Area', _profileArea.isNotEmpty ? _profileArea : 'Madhapur'),
                const Divider(height: 24, color: Color(0xFFF1F5F9)),
                _buildFullScreenRow('Allocated Vehicle', '$_vehiclePlate · $_vehicleModel'),
                const Divider(height: 24, color: Color(0xFFF1F5F9)),
                _buildFullScreenRow('Driving License', _drivingLicense),
                const Divider(height: 24, color: Color(0xFFF1F5F9)),
                _buildFullScreenRow('Dispatch Hub Depot', _depotAddress),
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
                  children: [
                    const Text('Mobile Phone', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Flexible(
                            child: Text(
                              _profilePhone,
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 4),
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
                    ),
                  ],
                ),
                const Divider(height: 20, color: Color(0xFFF1F5F9)),
                Row(
                  children: [
                    const Text('Email Address', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Flexible(
                            child: Text(
                              _profileEmail,
                              style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
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
                    ),
                  ],
                ),
                const Divider(height: 20, color: Color(0xFFF1F5F9)),
                _buildFullScreenRow('Dispatch Hub', _depotAddress),
                const Divider(height: 20, color: Color(0xFFF1F5F9)),
                Row(
                  children: [
                    const Text('Supervisor Hotline', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Flexible(
                            child: Text(
                              _supervisorHotline,
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF059669)),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 4),
                          IconButton(
                            icon: const Icon(Icons.phone_forwarded_rounded, size: 18, color: Color(0xFF059669)),
                            onPressed: () => _callCustomer(_supervisorHotline),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const Divider(height: 20, color: Color(0xFFF1F5F9)),
                Row(
                  children: [
                    const Text('Emergency Contact', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Flexible(
                            child: Text(
                              _emergencyContact,
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFFDC2626)),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 4),
                          IconButton(
                            icon: const Icon(Icons.phone_rounded, size: 18, color: Color(0xFFDC2626)),
                            onPressed: () => _callCustomer(_emergencyContact),
                          ),
                        ],
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
  // FULL SCREEN 5: VEHICLE & EQUIPMENT (REDESIGNED & EDITABLE)
  // =========================================================
  Widget _buildVehicleEquipmentFullScreen() {
    if (_isEditingVehicle) {
      return _buildEditVehicleForm();
    }

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: _buildSubScreenHeader(
                  'Vehicle & Equipment',
                  'Delivery cargo vehicle specs, insulated crates & gear status.',
                ),
              ),
              IconButton(
                onPressed: () => setState(() => _isEditingVehicle = true),
                icon: const Icon(Icons.edit_outlined, color: Color(0xFF0D5C3A), size: 22),
                tooltip: 'Edit Vehicle Details',
              ),
            ],
          ),
          const SizedBox(height: 14),

          // 1. Vehicle Hero Card (Minimalist Indian HSRP Plate design)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.025),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Center(
                    child: Icon(Icons.two_wheeler_rounded, color: Color(0xFF0D5C3A), size: 26),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Authentic Indian HSRP Registration Plate Replica
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFF0F172A), width: 1.5),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 4,
                                  height: 4,
                                  decoration: const BoxDecoration(
                                    color: Color(0xFF1D4ED8),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const Text(
                                  'IND',
                                  style: TextStyle(
                                    fontSize: 7.5,
                                    fontWeight: FontWeight.w900,
                                    color: Color(0xFF1D4ED8),
                                    letterSpacing: -0.2,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(width: 6),
                            Text(
                              _vehiclePlate.toUpperCase(),
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 1.2,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '$_vehicleModel • $_vehicleType',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFF86EFAC)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.check_circle_rounded, size: 11, color: Color(0xFF059669)),
                      SizedBox(width: 4),
                      Text(
                        'Assigned',
                        style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF065F46)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // 2. 4-Card Quick Specs Grid (Clean, Simple, Professional)
          Row(
            children: [
              _buildModernMetricCard('CAPACITY', '4 Crates', const Color(0xFF0F172A), const Color(0xFFF1F5F9)),
              const SizedBox(width: 8),
              _buildModernMetricCard('BATTERY', '88% ⚡', const Color(0xFF059669), const Color(0xFFECFDF5)),
              const SizedBox(width: 8),
              _buildModernMetricCard('COLD BOX', '3.8°C', const Color(0xFF1D4ED8), const Color(0xFFEFF6FF)),
              const SizedBox(width: 8),
              _buildModernMetricCard('GEAR KIT', '5/5 OK', const Color(0xFF0D5C3A), const Color(0xFFF0FDF4)),
            ],
          ),
          const SizedBox(height: 14),

          // 3. Technical Specifications Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
              boxShadow: [
                BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 6, offset: const Offset(0, 2)),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.directions_bike_rounded, color: Color(0xFF0D5C3A), size: 18),
                    SizedBox(width: 8),
                    Text(
                      'VEHICLE SPECIFICATIONS',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF0D5C3A), letterSpacing: 0.6),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _buildFullScreenRow('Registration Plate', _vehiclePlate),
                const Divider(height: 20, color: Color(0xFFF1F5F9)),
                _buildFullScreenRow('Vehicle Model & Make', _vehicleModel),
                const Divider(height: 20, color: Color(0xFFF1F5F9)),
                _buildFullScreenRow('Propulsion / Fuel', _vehicleType),
                const Divider(height: 20, color: Color(0xFFF1F5F9)),
                _buildFullScreenRow('Crate Carrying Capacity', _crateCapacity),
                const Divider(height: 20, color: Color(0xFFF1F5F9)),
                _buildFullScreenRow('Assigned Depot & Hub', '${_profileArea.isNotEmpty ? _profileArea : 'Madhapur'} Hub, Bay #4'),
                const Divider(height: 20, color: Color(0xFFF1F5F9)),
                _buildFullScreenRow('Driving License Number', _drivingLicense),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // 4. Equipment & Safety Checklist Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
              boxShadow: [
                BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 6, offset: const Offset(0, 2)),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.checklist_rounded, color: Color(0xFF0D5C3A), size: 18),
                    SizedBox(width: 8),
                    Text(
                      'SAFETY GEAR & EQUIPMENT CHECKLIST',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF0D5C3A), letterSpacing: 0.6),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                _buildEquipmentItemRow(
                  icon: Icons.ac_unit_rounded,
                  title: 'Insulated Milk Cold-Box',
                  detail: 'Pre-cooled verified 3.8°C • 4-Crate Sealed',
                  isVerified: true,
                ),
                const SizedBox(height: 10),
                _buildEquipmentItemRow(
                  icon: Icons.security_rounded,
                  title: 'Reflective Safety Jacket',
                  detail: 'High-visibility neon green • Issued & Active',
                  isVerified: true,
                ),
                const SizedBox(height: 10),
                _buildEquipmentItemRow(
                  icon: Icons.sports_motorsports_rounded,
                  title: 'ISI Approved Safety Helmet',
                  detail: 'Personal safety gear • Compliant',
                  isVerified: true,
                ),
                const SizedBox(height: 10),
                _buildEquipmentItemRow(
                  icon: Icons.phone_android_rounded,
                  title: 'Handlebar Phone Mount',
                  detail: 'Vibration-damped waterproof mount installed',
                  isVerified: true,
                ),
                const SizedBox(height: 10),
                _buildEquipmentItemRow(
                  icon: Icons.all_inclusive_rounded,
                  title: 'Thermal Crate Liners & Straps',
                  detail: 'Heavy-duty cargo bungees • 4/4 Available',
                  isVerified: true,
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // 5. Compliance & Documents Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
              boxShadow: [
                BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 6, offset: const Offset(0, 2)),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.assignment_turned_in_outlined, color: Color(0xFF0D5C3A), size: 18),
                    SizedBox(width: 8),
                    Text(
                      'DOCUMENTS & COMPLIANCE',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF0D5C3A), letterSpacing: 0.6),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _buildFullScreenRow('Vehicle Commercial Insurance', 'Valid (Expires 24 Nov 2027)'),
                const Divider(height: 20, color: Color(0xFFF1F5F9)),
                _buildFullScreenRow('Pollution Under Control (PUC)', 'Exempt (Green Zero-Emission EV)'),
                const Divider(height: 20, color: Color(0xFFF1F5F9)),
                _buildFullScreenRow('Road Tax & Depot Clearance', 'Up to date • Approved'),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // 6. Action Buttons
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              icon: const Icon(Icons.edit_outlined, size: 18, color: Colors.white),
              label: const Text('Edit Vehicle Details', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Colors.white)),
              onPressed: () => setState(() => _isEditingVehicle = true),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0D5C3A),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              icon: const Icon(Icons.report_problem_outlined, color: Color(0xFFDC2626), size: 18),
              label: const Text('Report Breakdown / Vehicle Issue', style: TextStyle(color: Color(0xFFDC2626), fontWeight: FontWeight.w800, fontSize: 13.5)),
              onPressed: () => setState(() => _activeProfileSubScreen = 'support'),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Color(0xFFFCA5A5)),
                backgroundColor: const Color(0xFFFEF2F2),
                padding: const EdgeInsets.symmetric(vertical: 13),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildEditVehicleForm() {
    final plateCtrl = TextEditingController(text: _vehiclePlate);
    final modelCtrl = TextEditingController(text: _vehicleModel);
    final typeCtrl = TextEditingController(text: _vehicleType);
    final capacityCtrl = TextEditingController(text: _crateCapacity);
    final licenseCtrl = TextEditingController(text: _drivingLicense);

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: _buildSubScreenHeader(
                  'Edit Vehicle Details',
                  'Update registration number, vehicle model, and crate capacity.',
                ),
              ),
              IconButton(
                onPressed: () => setState(() => _isEditingVehicle = false),
                icon: const Icon(Icons.close_rounded, color: Color(0xFF64748B), size: 22),
                tooltip: 'Cancel',
              ),
            ],
          ),
          const SizedBox(height: 14),

          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
              boxShadow: [
                BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 6, offset: const Offset(0, 2)),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Vehicle Identification', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Color(0xFF0F172A))),
                const SizedBox(height: 14),

                // Registration Plate
                TextField(
                  controller: plateCtrl,
                  textCapitalization: TextCapitalization.characters,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                  decoration: InputDecoration(
                    labelText: 'Vehicle Registration Plate *',
                    hintText: 'e.g. TS-09-EV-4412',
                    prefixIcon: const Icon(Icons.pin_outlined, color: Color(0xFF0D5C3A), size: 20),
                    filled: true,
                    fillColor: const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF0D5C3A), width: 1.5)),
                  ),
                ),
                const SizedBox(height: 14),

                // Vehicle Model
                TextField(
                  controller: modelCtrl,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                  decoration: InputDecoration(
                    labelText: 'Vehicle Model & Make *',
                    hintText: 'e.g. Commercial Cargo EV / Hero Electric Nyx',
                    prefixIcon: const Icon(Icons.two_wheeler_outlined, color: Color(0xFF0D5C3A), size: 20),
                    filled: true,
                    fillColor: const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF0D5C3A), width: 1.5)),
                  ),
                ),
                const SizedBox(height: 14),

                // Vehicle Type
                TextField(
                  controller: typeCtrl,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                  decoration: InputDecoration(
                    labelText: 'Vehicle Propulsion / Type',
                    hintText: 'e.g. Electric Cargo EV, Petrol Two-Wheeler',
                    prefixIcon: const Icon(Icons.bolt_outlined, color: Color(0xFF0D5C3A), size: 20),
                    filled: true,
                    fillColor: const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF0D5C3A), width: 1.5)),
                  ),
                ),
                const SizedBox(height: 14),

                // Crate Capacity
                TextField(
                  controller: capacityCtrl,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                  decoration: InputDecoration(
                    labelText: 'Crate Carrying Capacity',
                    hintText: 'e.g. 4 Insulated Crates (48 Litres)',
                    prefixIcon: const Icon(Icons.inventory_2_outlined, color: Color(0xFF0D5C3A), size: 20),
                    filled: true,
                    fillColor: const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF0D5C3A), width: 1.5)),
                  ),
                ),
                const SizedBox(height: 14),

                // Driving License
                TextField(
                  controller: licenseCtrl,
                  textCapitalization: TextCapitalization.characters,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                  decoration: InputDecoration(
                    labelText: 'Commercial Driving License',
                    hintText: 'e.g. TS-09-2023-0091',
                    prefixIcon: const Icon(Icons.badge_outlined, color: Color(0xFF0D5C3A), size: 20),
                    filled: true,
                    fillColor: const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF0D5C3A), width: 1.5)),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Hub Notice
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF3C7),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFFDE68A)),
            ),
            child: const Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.info_outline_rounded, color: Color(0xFFB45309), size: 18),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Updated vehicle details will be saved to your delivery partner credentials and synced with the depot dispatch ledger.',
                    style: TextStyle(fontSize: 11.5, color: Color(0xFF92400E), height: 1.35, fontWeight: FontWeight.w500),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),

          // Save & Cancel Buttons
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              icon: const Icon(Icons.check_rounded, color: Colors.white, size: 18),
              label: const Text('Save Vehicle Details', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14)),
              onPressed: () => _saveVehicleDetails(
                plateCtrl.text,
                modelCtrl.text,
                typeCtrl.text,
                capacityCtrl.text,
                licenseCtrl.text,
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF059669),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () => setState(() => _isEditingVehicle = false),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 13),
                side: const BorderSide(color: Color(0xFFCBD5E1)),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Cancel & Discard', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w700, fontSize: 13.5)),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildEquipmentItemRow({
    required IconData icon,
    required String title,
    required String detail,
    required bool isVerified,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: isVerified ? const Color(0xFFECFDF5) : const Color(0xFFFEF3C7),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: isVerified ? const Color(0xFF059669) : const Color(0xFFD97706), size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                const SizedBox(height: 2),
                Text(detail, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
            decoration: BoxDecoration(
              color: const Color(0xFFECFDF5),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: const Color(0xFF86EFAC)),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.check_rounded, size: 11, color: Color(0xFF059669)),
                SizedBox(width: 3),
                Text('OK', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF059669))),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _saveVehicleDetails(
    String newPlate,
    String newModel,
    String newType,
    String newCapacity,
    String newLicense,
  ) async {
    final p = newPlate.trim();
    final m = newModel.trim();
    final t = newType.trim();
    final c = newCapacity.trim();
    final l = newLicense.trim();

    setState(() {
      if (p.isNotEmpty) _vehiclePlate = p;
      if (m.isNotEmpty) _vehicleModel = m;
      if (t.isNotEmpty) _vehicleType = t;
      if (c.isNotEmpty) _crateCapacity = c;
      if (l.isNotEmpty) _drivingLicense = l;
      _isEditingVehicle = false;
    });

    try {
      final authUser = context.read<AuthProvider>().user;
      final boyId = authUser?.id ?? '';
      if (boyId.isNotEmpty) {
        await _api.put('/api/delivery-boys/$boyId', {
          'vehicleNumber': _vehiclePlate,
          'assignedArea': _profileArea,
        });
      }
    } catch (e) {
      debugPrint('Vehicle update sync note: $e');
    }

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Row(
            children: [
              Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  '✓ Vehicle and equipment details updated successfully!',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
          backgroundColor: const Color(0xFF059669),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          duration: const Duration(seconds: 2),
        ),
      );
    }
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
                    isExpanded: true,
                    decoration: const InputDecoration(border: OutlineInputBorder(), isDense: true),
                    items: const [
                      DropdownMenuItem(value: 'Route Delay', child: Text('Route Delay / Traffic Hold', overflow: TextOverflow.ellipsis)),
                      DropdownMenuItem(value: 'Vehicle Breakdown', child: Text('Vehicle Breakdown / Puncture', overflow: TextOverflow.ellipsis)),
                      DropdownMenuItem(value: 'Customer Issue', child: Text('Customer Door Locked / Unreachable', overflow: TextOverflow.ellipsis)),
                      DropdownMenuItem(value: 'Milk Shortage', child: Text('Extra Milk / Curd Crates Needed', overflow: TextOverflow.ellipsis)),
                      DropdownMenuItem(value: 'Payment Dispute', child: Text('Cash / QR Payment Dispute', overflow: TextOverflow.ellipsis)),
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
  // FULL SCREEN 7: ALL DELIVERIES OVERVIEW & DETAILS
  // =========================================================
  Widget _buildDeliveriesDetailsFullScreen() {
    final total = _deliveries.length;
    final delivered = _deliveries.where((d) => d['status'] == 'delivered').length;
    final pending = _deliveries.where((d) => d['status'] == 'pending').length;
    final missed = _deliveries.where((d) => d['status'] == 'not_delivered').length;
    final completionPct = total > 0 ? ((delivered / total) * 100).toInt() : 0;

    double cashCollected = 0.0;
    double upiCollected = 0.0;
    int cashCount = 0;
    int upiCount = 0;
    for (final d in _deliveries) {
      final method = (d['paymentMethod'] ?? '').toString().toLowerCase();
      final addonMethod = (d['addonPaymentMethod'] ?? '').toString().toLowerCase();
      final amt = (num.tryParse(d['paymentAmount']?.toString() ?? '0') ?? 0).toDouble();
      final addonAmt = (num.tryParse((d['addonPaidAmount'] ?? d['paymentAmount'])?.toString() ?? '0') ?? 0).toDouble();
      if (method == 'cash') {
        cashCount++;
        if (d['status'] == 'delivered') cashCollected += amt;
      } else if (addonMethod == 'cash') {
        cashCount++;
        if (d['status'] == 'delivered') cashCollected += addonAmt;
      } else if (method == 'upi') {
        upiCount++;
        if (d['status'] == 'delivered') upiCollected += amt;
      } else if (addonMethod == 'upi') {
        upiCount++;
        if (d['status'] == 'delivered') upiCollected += addonAmt;
      }
    }

    List<Map<String, dynamic>> list = List.from(_deliveries);
    if (_delSubFilter == 'pending') {
      list = list.where((d) => d['status'] == 'pending').toList();
    } else if (_delSubFilter == 'delivered') {
      list = list.where((d) => d['status'] == 'delivered').toList();
    } else if (_delSubFilter == 'not_delivered') {
      list = list.where((d) => d['status'] == 'not_delivered').toList();
    } else if (_delSubFilter == 'cash') {
      list = list.where((d) =>
          (d['paymentMethod'] ?? '').toString().toLowerCase() == 'cash' ||
          (d['addonPaymentMethod'] ?? '').toString().toLowerCase() == 'cash').toList();
    } else if (_delSubFilter == 'upi') {
      list = list.where((d) =>
          (d['paymentMethod'] ?? '').toString().toLowerCase() == 'upi' ||
          (d['addonPaymentMethod'] ?? '').toString().toLowerCase() == 'upi').toList();
    }

    if (_delSubSearch.trim().isNotEmpty) {
      final q = _delSubSearch.trim().toLowerCase();
      list = list.where((d) {
        final name = (d['customerName'] ?? '').toString().toLowerCase();
        final phone = (d['customerPhone'] ?? '').toString().toLowerCase();
        final addr = (d['customerAddress'] ?? '').toString().toLowerCase();
        final milk = (d['plannedMilk'] ?? '').toString().toLowerCase();
        final instructions = (d['specialInstructions'] ?? '').toString().toLowerCase();
        return name.contains(q) || phone.contains(q) || addr.contains(q) || milk.contains(q) || instructions.contains(q);
      }).toList();
    }

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: _buildSubScreenHeader(
                  'All Deliveries & Fulfillment',
                  'Live doorstep drops, milk volumes, customer directions & collections.',
                ),
              ),
              IconButton(
                onPressed: () => _loadData(silent: false),
                icon: const Icon(Icons.refresh_rounded, color: Color(0xFF0D5C3A), size: 22),
                tooltip: 'Refresh Deliveries',
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Completion Progress & 4-Metric Grid
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF0D5C3A), Color(0xFF09442A)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF0D5C3A).withValues(alpha: 0.25),
                  blurRadius: 10,
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
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'TODAY\'S ROUTE FULFILLMENT',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.8,
                            color: Color(0xFF86EFAC),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '$delivered of $total Drops Completed',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.18),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '$completionPct%',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: total > 0 ? (delivered / total) : 0,
                    minHeight: 8,
                    backgroundColor: Colors.white.withValues(alpha: 0.2),
                    valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF34D399)),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    _buildDeliveryStatBox('Total', '$total', Colors.white.withValues(alpha: 0.15), Colors.white),
                    const SizedBox(width: 8),
                    _buildDeliveryStatBox('Delivered', '$delivered', const Color(0xFF059669).withValues(alpha: 0.4), const Color(0xFF86EFAC)),
                    const SizedBox(width: 8),
                    _buildDeliveryStatBox('Pending', '$pending', const Color(0xFFD97706).withValues(alpha: 0.4), const Color(0xFFFDE68A)),
                    const SizedBox(width: 8),
                    _buildDeliveryStatBox('Missed', '$missed', const Color(0xFFDC2626).withValues(alpha: 0.4), const Color(0xFFFCA5A5)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Cash & UPI Collections Pill Row
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(color: const Color(0xFFECFDF5), borderRadius: BorderRadius.circular(8)),
                      child: const Icon(Icons.payments_outlined, color: Color(0xFF059669), size: 18),
                    ),
                    const SizedBox(width: 8),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Cash In Hand', style: TextStyle(fontSize: 10.5, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                        Text('₹${cashCollected.toStringAsFixed(0)}', style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                      ],
                    ),
                  ],
                ),
                Container(height: 28, width: 1, color: const Color(0xFFE2E8F0)),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(8)),
                      child: const Icon(Icons.qr_code_2_rounded, color: Color(0xFF2563EB), size: 18),
                    ),
                    const SizedBox(width: 8),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('UPI Online', style: TextStyle(fontSize: 10.5, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                        Text('₹${upiCollected.toStringAsFixed(0)}', style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                      ],
                    ),
                  ],
                ),
                Container(height: 28, width: 1, color: const Color(0xFFE2E8F0)),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(8)),
                      child: const Icon(Icons.account_balance_wallet_outlined, color: Color(0xFF475569), size: 18),
                    ),
                    const SizedBox(width: 8),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Total Today', style: TextStyle(fontSize: 10.5, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                        Text('₹${(cashCollected + upiCollected).toStringAsFixed(0)}', style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: Color(0xFF059669))),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Search Box
          TextField(
            controller: _delSubSearchCtrl,
            onChanged: (val) => setState(() => _delSubSearch = val),
            style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600),
            decoration: InputDecoration(
              hintText: 'Search by customer, flat, phone, or milk type...',
              hintStyle: const TextStyle(fontSize: 12.5, color: Color(0xFF94A3B8)),
              prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF64748B), size: 20),
              suffixIcon: _delSubSearch.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.close_rounded, size: 18),
                      onPressed: () {
                        _delSubSearchCtrl.clear();
                        setState(() => _delSubSearch = '');
                      },
                    )
                  : null,
              filled: true,
              fillColor: Colors.white,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFF059669), width: 1.5)),
            ),
          ),
          const SizedBox(height: 12),

          // Horizontal Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildDelSubFilterChip('all', 'All ($total)'),
                const SizedBox(width: 8),
                _buildDelSubFilterChip('pending', 'Pending ($pending)'),
                const SizedBox(width: 8),
                _buildDelSubFilterChip('delivered', 'Delivered ($delivered)'),
                const SizedBox(width: 8),
                _buildDelSubFilterChip('not_delivered', 'Missed ($missed)'),
                const SizedBox(width: 8),
                _buildDelSubFilterChip('cash', 'Cash ($cashCount)'),
                const SizedBox(width: 8),
                _buildDelSubFilterChip('upi', 'UPI ($upiCount)'),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Detailed List of Deliveries
          if (list.isEmpty)
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
                  const Icon(Icons.local_shipping_outlined, size: 44, color: Color(0xFF94A3B8)),
                  const SizedBox(height: 12),
                  const Text('No deliveries match this filter', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: Color(0xFF0F172A))),
                  const SizedBox(height: 4),
                  const Text('Try changing the search keyword or filter tab.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                  const SizedBox(height: 14),
                  OutlinedButton(
                    onPressed: () {
                      _delSubSearchCtrl.clear();
                      setState(() {
                        _delSubFilter = 'all';
                        _delSubSearch = '';
                      });
                    },
                    child: const Text('Reset Filters'),
                  ),
                ],
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: list.length,
              separatorBuilder: (_, _) => const SizedBox(height: 14),
              itemBuilder: (ctx, idx) => _buildDeliveryDetailsCard(list[idx], idx),
            ),
          const SizedBox(height: 30),
        ],
      ),
    );
  }

  Widget _buildDeliveryDetailsCard(Map<String, dynamic> d, int index) {
    final status = d['status']?.toString().toLowerCase() ?? 'pending';
    final isDelivered = status == 'delivered';
    final isPending = status == 'pending';
    final isMissed = status == 'not_delivered';
    final customerName = d['customerName']?.toString() ?? 'Customer';
    final phone = d['customerPhone']?.toString() ?? '';
    final address = d['customerAddress']?.toString() ?? 'Doorstep Drop, Madhapur';
    final notes = d['specialInstructions']?.toString() ?? 'Leave outside doorstep in milk bag.';
    final milkQty = d['plannedMilk'] ?? 1;
    final curdQty = d['plannedCurd'] ?? 0;
    final paymentMethod = (d['paymentMethod']?.toString() ?? 'Prepaid').toUpperCase();
    final paymentAmount = d['paymentAmount']?.toString() ?? (d['totalAmount']?.toString() ?? '0');
    final deliveredAt = d['deliveredAt']?.toString();
    final proofImage = d['proofImage']?.toString();
    final missedReason = d['notDeliveredReason']?.toString() ?? 'Door locked / No response';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isDelivered
              ? const Color(0xFF86EFAC)
              : isMissed
                  ? const Color(0xFFFCA5A5)
                  : const Color(0xFFE2E8F0),
          width: isDelivered || isMissed ? 1.5 : 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Text(
                        '#${index + 1}',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Color(0xFF475569)),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        customerName,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0F172A),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              _buildStatusPill(status, deliveredAt, missedReason),
            ],
          ),
          const SizedBox(height: 10),

          // Address with map icon & phone with call button
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.location_on_rounded, size: 16, color: Color(0xFF059669)),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  address,
                  style: const TextStyle(fontSize: 12.5, color: Color(0xFF475569), fontWeight: FontWeight.w500, height: 1.3),
                ),
              ),
              if (address.isNotEmpty)
                InkWell(
                  onTap: () => _openMap(address),
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFBBF7D0)),
                    ),
                    child: const Icon(Icons.navigation_rounded, size: 14, color: Color(0xFF059669)),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),

          if (phone.isNotEmpty) ...[
            Row(
              children: [
                const Icon(Icons.phone_outlined, size: 15, color: Color(0xFF64748B)),
                const SizedBox(width: 6),
                Text(
                  phone,
                  style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                ),
                const Spacer(),
                InkWell(
                  onTap: () => _callCustomer(phone),
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFBBF7D0)),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.call_rounded, size: 12, color: Color(0xFF059669)),
                        SizedBox(width: 4),
                        Text('Call', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Color(0xFF059669))),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
          ],

          // Product & Order Breakdown Container
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
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
                        Icon(Icons.local_drink_rounded, size: 15, color: Color(0xFF059669)),
                        SizedBox(width: 6),
                        Text('Order Items & Milk Breakdown', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF334155))),
                      ],
                    ),
                    Text(
                      '₹$paymentAmount',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF059669)),
                    ),
                  ],
                ),
                const Divider(height: 16, color: Color(0xFFE2E8F0)),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Pure Farm Milk (${d['bottleType'] ?? 'Glass Bottle'})',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                          ),
                          Text(
                            '$milkQty Litre(s) planned drop',
                            style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                          ),
                        ],
                      ),
                    ),
                    if (curdQty > 0)
                      Text(
                        '+ $curdQty Curd Pkt(s)',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF059669)),
                      ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // Instructions Pill
          if (notes.isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF3C7).withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFFDE68A)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.info_outline_rounded, size: 14, color: Color(0xFFB45309)),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Note: $notes',
                      style: const TextStyle(fontSize: 11.5, color: Color(0xFF92400E), fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 10),

          // Payment Mode & Empty Bottles
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: paymentMethod.contains('CASH')
                      ? const Color(0xFFECFDF5)
                      : paymentMethod.contains('UPI')
                          ? const Color(0xFFEFF6FF)
                          : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: paymentMethod.contains('CASH')
                        ? const Color(0xFFBBF7D0)
                        : paymentMethod.contains('UPI')
                            ? const Color(0xFFBFDBFE)
                            : const Color(0xFFE2E8F0),
                  ),
                ),
                child: Text(
                  'Payment: $paymentMethod',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: paymentMethod.contains('CASH')
                        ? const Color(0xFF059669)
                        : paymentMethod.contains('UPI')
                            ? const Color(0xFF2563EB)
                            : const Color(0xFF475569),
                  ),
                ),
              ),
              Row(
                children: [
                  const Icon(Icons.recycling_rounded, size: 14, color: Color(0xFF64748B)),
                  const SizedBox(width: 4),
                  Text(
                    'Empty bottles: ${d['emptyBottlesReturned'] ?? 0}',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Interactive Action Buttons
          if (isPending)
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _showMarkDeliveredDialog(d),
                    icon: const Icon(Icons.check_circle_rounded, size: 16, color: Colors.white),
                    label: const Text('Mark Delivered', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 13)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF059669),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      elevation: 0,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                OutlinedButton(
                  onPressed: () => _showMarkNotDeliveredDialog(d),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFFDC2626),
                    side: const BorderSide(color: Color(0xFFFCA5A5)),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text('Undelivered', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12)),
                ),
              ],
            )
          else if (isDelivered)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFECFDF5),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFBBF7D0)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.verified_rounded, size: 16, color: Color(0xFF059669)),
                  const SizedBox(width: 6),
                  const Expanded(
                    child: Text(
                      'Successfully delivered to doorstep',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF065F46)),
                    ),
                  ),
                  if (proofImage != null && proofImage.isNotEmpty)
                    InkWell(
                      onTap: () => _showProofImageDialog(proofImage, customerName),
                      child: const Row(
                        children: [
                          Icon(Icons.photo_camera_rounded, size: 14, color: Color(0xFF059669)),
                          SizedBox(width: 4),
                          Text('View Proof', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF059669))),
                        ],
                      ),
                    ),
                ],
              ),
            )
          else
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFFECACA)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.cancel_rounded, size: 16, color: Color(0xFFDC2626)),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Failed: $missedReason',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF991B1B)),
                    ),
                  ),
                  TextButton(
                    onPressed: () => _showMarkDeliveredDialog(d),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      visualDensity: VisualDensity.compact,
                    ),
                    child: const Text('Retry Drop', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Color(0xFF059669))),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  // =========================================================
  // FULL SCREEN 8: SUBSCRIPTIONS & ORDER HISTORY
  // =========================================================
  Widget _buildSubscriptionsHistoryFullScreen() {
    final allCustomers = _assignedCustomers;
    final activeCount = allCustomers.where((c) => (c['deliveryPlan']?['status'] ?? 'active') == 'active').length;
    final pausedCount = allCustomers.where((c) => (c['deliveryPlan']?['status'] ?? '').toString().toLowerCase() == 'paused').length;
    double totalDailyVolume = 0.0;
    for (final c in allCustomers) {
      final p = c['deliveryPlan'];
      if (p is Map) {
        totalDailyVolume += (num.tryParse(p['quantity']?.toString() ?? '1') ?? 1).toDouble();
      } else {
        totalDailyVolume += 1.0;
      }
    }

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: _buildSubScreenHeader(
                  'Subscriptions & Orders',
                  'Manage active household plans, daily fulfillment history, and crate counts.',
                ),
              ),
              IconButton(
                onPressed: () {
                  _loadData(silent: false);
                  _fetchSubscriptions();
                },
                icon: const Icon(Icons.refresh_rounded, color: Color(0xFF0D5C3A), size: 22),
                tooltip: 'Refresh Plans',
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Clean, Professional 4-Metric Grid (Replaces loud dark gradient)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.025),
                  blurRadius: 8,
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
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: const Color(0xFFECFDF5),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.local_shipping_rounded, color: Color(0xFF0D5C3A), size: 16),
                        ),
                        const SizedBox(width: 8),
                        const Text(
                          'ROUTE DISPATCH SUMMARY',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.6,
                            color: Color(0xFF0D5C3A),
                          ),
                        ),
                      ],
                    ),
                    Text(
                      '${allCustomers.length} Households',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF64748B),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    _buildModernMetricCard('ACTIVE PLANS', '$activeCount', const Color(0xFF059669), const Color(0xFFECFDF5)),
                    const SizedBox(width: 8),
                    _buildModernMetricCard('ON HOLD', '$pausedCount', const Color(0xFFD97706), const Color(0xFFFEF3C7)),
                    const SizedBox(width: 8),
                    _buildModernMetricCard('DAILY DEMAND', '${totalDailyVolume.toStringAsFixed(1)}L', const Color(0xFF0F172A), const Color(0xFFF1F5F9)),
                    const SizedBox(width: 8),
                    _buildModernMetricCard('ROUTE AREA', _profileArea.isNotEmpty ? _profileArea : 'Madhapur', const Color(0xFF1D4ED8), const Color(0xFFEFF6FF)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // 3-Segmented Tab Switcher (Modern high-contrast pill design)
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                _buildSubHistSegment('subscriptions', 'Subscriptions', Icons.autorenew_rounded),
                _buildSubHistSegment('history', 'Order History', Icons.receipt_long_outlined),
                _buildSubHistSegment('crates', 'Crates & Hub', Icons.inventory_2_outlined),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Render Selected View
          if (_subHistTab == 'subscriptions')
            _buildSubHistSubscriptionsView(allCustomers)
          else if (_subHistTab == 'history')
            _buildSubHistOrdersHistoryView()
          else
            _buildSubHistCratesView(allCustomers),

          const SizedBox(height: 30),
        ],
      ),
    );
  }

  Widget _buildSubHistSubscriptionsView(List<Map<String, dynamic>> customers) {
    List<Map<String, dynamic>> list = List.from(customers);

    // Merge any online subscriptions fetched from server
    if (_extraSubscriptions.isNotEmpty) {
      for (final sub in _extraSubscriptions) {
        final custId = sub['customerId']?.toString() ?? sub['customer']?['_id']?.toString() ?? '';
        final alreadyListed = list.any((c) => (c['customerId']?.toString() ?? c['_id']?.toString() ?? '') == custId);
        if (!alreadyListed && custId.isNotEmpty) {
          final custMap = sub['customer'] is Map ? sub['customer'] as Map : {};
          list.add({
            'customerId': custId,
            'name': sub['customerName'] ?? custMap['name'] ?? 'Subscriber',
            'mobile': sub['whatsapp'] ?? custMap['mobile'] ?? '',
            'address': sub['address'] ?? custMap['address'] ?? 'Doorstep drop',
            'deliveryPlan': {
              'product': sub['planName'] ?? sub['product'] ?? 'Pure Farm Milk',
              'quantity': sub['dailyQuantity'] ?? 1,
              'frequency': sub['deliveryFrequency'] ?? 'Daily',
              'status': sub['status'] ?? 'active',
              'startDate': sub['startDate']?.toString() ?? '01/11/2026',
              'endDate': sub['endDate']?.toString() ?? '30/11/2026',
              'specialInstructions': sub['specialInstructions'] ?? 'Registered via online portal',
            },
          });
        }
      }
    }

    if (_subHistFilter == 'active') {
      list = list.where((c) => (c['deliveryPlan']?['status'] ?? 'active') == 'active').toList();
    } else if (_subHistFilter == 'paused') {
      list = list.where((c) => (c['deliveryPlan']?['status'] ?? '').toString().toLowerCase() == 'paused').toList();
    } else if (_subHistFilter == 'daily') {
      list = list.where((c) => (c['deliveryPlan']?['frequency'] ?? 'daily').toString().toLowerCase() == 'daily').toList();
    } else if (_subHistFilter == 'alternate') {
      list = list.where((c) => (c['deliveryPlan']?['frequency'] ?? '').toString().toLowerCase() == 'alternate').toList();
    }

    if (_subHistSearch.trim().isNotEmpty) {
      final q = _subHistSearch.trim().toLowerCase();
      list = list.where((c) {
        final name = (c['name'] ?? '').toString().toLowerCase();
        final mobile = (c['mobile'] ?? '').toString().toLowerCase();
        final addr = (c['address'] ?? '').toString().toLowerCase();
        final prod = (c['deliveryPlan']?['product'] ?? '').toString().toLowerCase();
        return name.contains(q) || mobile.contains(q) || addr.contains(q) || prod.contains(q);
      }).toList();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          controller: _subHistSearchCtrl,
          onChanged: (val) => setState(() => _subHistSearch = val),
          style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600),
          decoration: InputDecoration(
            hintText: 'Search customer name, flat, mobile or plan...',
            hintStyle: const TextStyle(fontSize: 12.5, color: Color(0xFF94A3B8)),
            prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF64748B), size: 20),
            suffixIcon: _subHistSearch.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.close_rounded, size: 18),
                    onPressed: () {
                      _subHistSearchCtrl.clear();
                      setState(() => _subHistSearch = '');
                    },
                  )
                : null,
            filled: true,
            fillColor: Colors.white,
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFF0D5C3A), width: 1.5)),
          ),
        ),
        const SizedBox(height: 10),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _buildSubHistFilterChip('all', 'All Plans (${customers.length})'),
              const SizedBox(width: 8),
              _buildSubHistFilterChip('active', 'Active Plans'),
              const SizedBox(width: 8),
              _buildSubHistFilterChip('daily', 'Daily Drops'),
              const SizedBox(width: 8),
              _buildSubHistFilterChip('alternate', 'Alternate Days'),
              const SizedBox(width: 8),
              _buildSubHistFilterChip('paused', 'Paused (Vacation)'),
            ],
          ),
        ),
        const SizedBox(height: 14),

        if (list.isEmpty)
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
                const Icon(Icons.receipt_long_rounded, size: 44, color: Color(0xFF94A3B8)),
                const SizedBox(height: 12),
                const Text('No subscriptions match this filter', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: Color(0xFF0F172A))),
                const SizedBox(height: 4),
                const Text('Try changing search query or selecting another filter.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
              ],
            ),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: list.length,
            separatorBuilder: (_, _) => const SizedBox(height: 12),
            itemBuilder: (ctx, i) => _buildSubscriptionCard(list[i], i),
          ),
      ],
    );
  }

  Widget _buildSubscriptionCard(Map<String, dynamic> c, int index) {
    final name = c['name']?.toString() ?? 'Subscriber';
    final mobile = c['mobile']?.toString() ?? '';
    final address = c['address']?.toString() ?? 'Doorstep Drop';
    final customerId = c['customerId']?.toString() ?? 'CUST-${101 + index}';
    final plan = c['deliveryPlan'] is Map ? c['deliveryPlan'] as Map : {};
    final isPaused = (plan['status'] ?? '').toString().toLowerCase() == 'paused';
    final product = plan['product']?.toString() ?? 'Pure Farm Buffalo Milk';
    final quantity = plan['quantity']?.toString() ?? '1';
    final frequency = plan['frequency']?.toString() ?? 'Daily';
    final startDate = plan['startDate']?.toString() ?? '01/11/2026';
    final endDate = plan['endDate']?.toString() ?? '30/11/2026';
    final notes = plan['specialInstructions']?.toString() ?? 'Leave in doorstep milk pouch.';
    final completedDays = plan['completedDays'] ?? 18;
    final totalDays = plan['totalDays'] ?? 30;
    final progress = totalDays > 0 ? (completedDays / totalDays).clamp(0.0, 1.0) : 0.6;
    final initial = name.isNotEmpty ? name.trim()[0].toUpperCase() : 'S';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isPaused ? const Color(0xFFFDE68A) : const Color(0xFFE2E8F0),
          width: isPaused ? 1.5 : 1.0,
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
          // Header: Avatar, Name, ID, Status
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: isPaused ? const Color(0xFFFEF3C7) : const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Center(
                  child: Text(
                    initial,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      color: isPaused ? const Color(0xFFB45309) : const Color(0xFF0D5C3A),
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
                      name,
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'ID: $customerId • ${_profileArea.isNotEmpty ? _profileArea : 'Madhapur'}',
                      style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: isPaused ? const Color(0xFFFEF3C7) : const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: isPaused ? const Color(0xFFFDE68A) : const Color(0xFF86EFAC)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: isPaused ? const Color(0xFFD97706) : const Color(0xFF059669),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 5),
                    Text(
                      isPaused ? 'Vacation Hold' : 'Active Plan',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: isPaused ? const Color(0xFF92400E) : const Color(0xFF065F46),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Address with Directions button
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.location_on_outlined, size: 15, color: Color(0xFF0D5C3A)),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  address,
                  style: const TextStyle(fontSize: 12.5, color: Color(0xFF475569), fontWeight: FontWeight.w500),
                ),
              ),
              if (address.isNotEmpty) ...[
                const SizedBox(width: 6),
                InkWell(
                  onTap: () => _openMap(address),
                  borderRadius: BorderRadius.circular(6),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3.5),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: const Color(0xFFBBF7D0)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.directions_rounded, size: 12, color: Color(0xFF0D5C3A)),
                        SizedBox(width: 3),
                        Text('Map', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF0D5C3A))),
                      ],
                    ),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 8),

          // Phone Row
          if (mobile.isNotEmpty) ...[
            Row(
              children: [
                const Icon(Icons.phone_outlined, size: 14, color: Color(0xFF64748B)),
                const SizedBox(width: 6),
                Text(mobile, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
                const Spacer(),
                InkWell(
                  onTap: () => _callCustomer(mobile),
                  borderRadius: BorderRadius.circular(6),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3.5),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: const Color(0xFF86EFAC)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.call_rounded, size: 11, color: Color(0xFF0D5C3A)),
                        SizedBox(width: 4),
                        Text('Call', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF0D5C3A))),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
          ],

          // Plan details container
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
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
                        product,
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        frequency.toUpperCase(),
                        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF1D4ED8)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'Daily Quantity: $quantity Litre(s) • Morning Slot (5:00 AM – 7:30 AM)',
                  style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 10),

                // Cycle duration and progress
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        'Start: $startDate',
                        style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B)),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Renewal: $endDate',
                        textAlign: TextAlign.end,
                        style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Color(0xFF0D5C3A)),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: progress,
                    minHeight: 5,
                    backgroundColor: const Color(0xFFE2E8F0),
                    valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF059669)),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Fulfillment: $completedDays of $totalDays days completed (${(progress * 100).toInt()}%)',
                  style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Color(0xFF059669)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),

          if (notes.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 4, bottom: 8),
              child: Row(
                children: [
                  const Icon(Icons.info_outline_rounded, size: 13, color: Color(0xFFD97706)),
                  const SizedBox(width: 5),
                  Expanded(
                    child: Text(
                      'Drop Note: $notes',
                      style: const TextStyle(fontSize: 11, color: Color(0xFFB45309), fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),

          // Actions
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _openCustomerDetails(c),
                  icon: const Icon(Icons.person_pin_circle_outlined, size: 15),
                  label: const Text('View Customer Profile', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF0D5C3A),
                    side: const BorderSide(color: Color(0xFF86EFAC)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSubHistOrdersHistoryView() {
    final completedList = _deliveries.where((d) => d['status'] == 'delivered').toList();
    final allList = _deliveries;
    final completionPct = allList.isNotEmpty ? ((completedList.length / allList.length) * 100).toInt() : 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Clean fulfillment ledger summary card
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
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'TODAY\'S FULFILLMENT LEDGER',
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF059669),
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        '${completedList.length} of ${allList.length} Orders Delivered',
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFECFDF5),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFF86EFAC)),
                    ),
                    child: Text(
                      '$completionPct% Done',
                      style: const TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF065F46),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: allList.isNotEmpty ? (completedList.length / allList.length).clamp(0.0, 1.0) : 0.0,
                  minHeight: 5,
                  backgroundColor: const Color(0xFFE2E8F0),
                  valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF059669)),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        if (allList.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: const Column(
              children: [
                Icon(Icons.receipt_long_rounded, size: 40, color: Color(0xFF94A3B8)),
                SizedBox(height: 10),
                Text(
                  'No orders recorded for today',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: Color(0xFF0F172A)),
                ),
                SizedBox(height: 4),
                Text(
                  'Dispatches and doorstep drops will appear here.',
                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                ),
              ],
            ),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: allList.length,
            separatorBuilder: (_, _) => const SizedBox(height: 10),
            itemBuilder: (ctx, i) {
              final d = allList[i];
              final isDelivered = d['status'] == 'delivered';
              final isMissed = d['status'] == 'not_delivered';
              final amt = d['paymentAmount'] ?? d['totalAmount'] ?? '0';

              return Container(
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
                child: Row(
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: isDelivered
                            ? const Color(0xFFECFDF5)
                            : isMissed
                                ? const Color(0xFFFEF2F2)
                                : const Color(0xFFFEF3C7),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        isDelivered
                            ? Icons.check_circle_rounded
                            : isMissed
                                ? Icons.cancel_rounded
                                : Icons.schedule_rounded,
                        color: isDelivered
                            ? const Color(0xFF059669)
                            : isMissed
                                ? const Color(0xFFDC2626)
                                : const Color(0xFFD97706),
                        size: 20,
                      ),
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
                                  d['customerName']?.toString() ?? 'Household Drop',
                                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF1F5F9),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  'Stop #${d['sequenceNumber'] ?? (i + 1)}',
                                  style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: Color(0xFF64748B)),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 3),
                          Text(
                            '${d['plannedMilk'] ?? 1}L Farm Milk • ${d['customerAddress'] ?? 'Madhapur'}',
                            style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          if (isDelivered)
                            Padding(
                              padding: const EdgeInsets.only(top: 3),
                              child: Text(
                                '✓ Delivered at ${d['deliveredAt'] != null ? d['deliveredAt'].toString().split('T').last.substring(0, 5) : '06:15 AM'}',
                                style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Color(0xFF059669)),
                              ),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text('₹$amt', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF059669))),
                        const SizedBox(height: 3),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            (d['paymentMethod'] ?? 'Prepaid').toString().toUpperCase(),
                            style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: Color(0xFF475569)),
                          ),
                        ),
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

  Widget _buildSubHistCratesView(List<Map<String, dynamic>> customers) {
    int totalOutstanding = 0;
    for (final c in customers) {
      totalOutstanding += (num.tryParse(c['outstandingBottles']?.toString() ?? '1') ?? 1).toInt();
    }
    final totalDispatched = _deliveries.length;
    final bottlesCollected = _deliveries.where((d) => d['status'] == 'delivered').length;
    final cratesTaken = (totalDispatched / 12).ceil() > 0 ? (totalDispatched / 12).ceil() : 4;
    final pendingReturn = (totalDispatched - bottlesCollected) > 0 ? (totalDispatched - bottlesCollected) : 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Clean 4-card logistics grid
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            boxShadow: [
              BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 6, offset: const Offset(0, 2)),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.inventory_2_outlined, color: Color(0xFF0D5C3A), size: 18),
                  SizedBox(width: 8),
                  Text(
                    'CRATE & BOTTLE RECONCILIATION',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF0D5C3A),
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  _buildCrateStatBox('Crates Out', '$cratesTaken', const Color(0xFFF1F5F9), const Color(0xFF0F172A)),
                  const SizedBox(width: 8),
                  _buildCrateStatBox('Bottles Out', '$totalDispatched', const Color(0xFFEFF6FF), const Color(0xFF1D4ED8)),
                  const SizedBox(width: 8),
                  _buildCrateStatBox('Returned', '$bottlesCollected', const Color(0xFFECFDF5), const Color(0xFF059669)),
                  const SizedBox(width: 8),
                  _buildCrateStatBox('Pending', '$pendingReturn', const Color(0xFFFEF3C7), const Color(0xFFB45309)),
                ],
              ),
              const Divider(height: 24, color: Color(0xFFF1F5F9)),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Outstanding Empty Bottles with Households:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF475569))),
                  Text('$totalOutstanding Bottles', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Depot guidelines and supervisor call card
        Container(
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
                  const Icon(Icons.hub_outlined, color: Color(0xFF0D5C3A), size: 18),
                  const SizedBox(width: 8),
                  Text(
                    '${_profileArea.isNotEmpty ? _profileArea : 'Madhapur'} Hub Bay Instructions',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              const Text(
                'Please return crates and collected empty glass bottles to the depot bay by 8:30 AM after completing your morning drop sequence.',
                style: TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.4),
              ),
              const SizedBox(height: 10),
              OutlinedButton.icon(
                onPressed: () => _callCustomer(_supervisorHotline),
                icon: const Icon(Icons.phone_rounded, size: 14),
                label: const Text('Call Hub Supervisor', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF0D5C3A),
                  side: const BorderSide(color: Color(0xFF86EFAC)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        const Text('Household Bottle Ledger', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
        const SizedBox(height: 8),
        ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: customers.length,
          separatorBuilder: (_, _) => const SizedBox(height: 8),
          itemBuilder: (ctx, i) {
            final c = customers[i];
            final out = c['outstandingBottles'] ?? (1 + (i % 2));
            final cName = c['name'] ?? 'Household';
            final initial = cName.toString().isNotEmpty ? cName.toString().trim()[0].toUpperCase() : 'H';

            return Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(color: const Color(0xFFECFDF5), borderRadius: BorderRadius.circular(8)),
                    child: Center(
                      child: Text(
                        initial,
                        style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0D5C3A), fontSize: 14),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(cName.toString(), style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                        Text(c['address'] ?? 'Madhapur', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF3C7),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFFDE68A)),
                    ),
                    child: Text(
                      '$out Due',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF92400E)),
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

  Widget _buildModernMetricCard(String label, String value, Color textColor, Color bgColor) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w900,
                color: textColor,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 3),
            Text(
              label,
              style: TextStyle(
                fontSize: 9.5,
                fontWeight: FontWeight.w700,
                color: textColor.withValues(alpha: 0.8),
                letterSpacing: 0.3,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCrateStatBox(String label, String value, Color bg, Color textCol) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(10)),
        child: Column(
          children: [
            Text(value, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, color: textCol), textAlign: TextAlign.center),
            const SizedBox(height: 2),
            Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: textCol.withValues(alpha: 0.85))),
          ],
        ),
      ),
    );
  }

  Widget _buildDelSubFilterChip(String key, String label) {
    final isSelected = _delSubFilter == key;
    return InkWell(
      onTap: () => setState(() => _delSubFilter = key),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0D5C3A) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isSelected ? const Color(0xFF0D5C3A) : const Color(0xFFCBD5E1)),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w800,
            color: isSelected ? Colors.white : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }

  Widget _buildSubHistFilterChip(String key, String label) {
    final isSelected = _subHistFilter == key;
    return InkWell(
      onTap: () => setState(() => _subHistFilter = key),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0D5C3A) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isSelected ? const Color(0xFF0D5C3A) : const Color(0xFFCBD5E1)),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w800,
            color: isSelected ? Colors.white : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }

  Widget _buildDeliveryStatBox(String label, String value, Color bg, Color textColor) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          children: [
            Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: textColor)),
            const SizedBox(height: 2),
            Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: textColor.withValues(alpha: 0.85))),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusPill(String status, String? deliveredAt, String? missedReason) {
    if (status == 'delivered') {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(color: const Color(0xFFECFDF5), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFF86EFAC))),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.check_circle_rounded, size: 12, color: Color(0xFF059669)),
            SizedBox(width: 4),
            Text('Delivered', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF059669))),
          ],
        ),
      );
    } else if (status == 'not_delivered') {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(color: const Color(0xFFFEF2F2), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFFCA5A5))),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.cancel_rounded, size: 12, color: Color(0xFFDC2626)),
            SizedBox(width: 4),
            Text('Missed', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFFDC2626))),
          ],
        ),
      );
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFFDE68A))),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.schedule_rounded, size: 12, color: Color(0xFFD97706)),
          SizedBox(width: 4),
          Text('Pending Drop', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFFD97706))),
        ],
      ),
    );
  }

  Widget _buildSubHistSegment(String tabKey, String label, IconData icon) {
    final isSelected = _subHistTab == tabKey;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _subHistTab = tabKey),
        borderRadius: BorderRadius.circular(12),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFF0D5C3A) : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 15, color: isSelected ? Colors.white : const Color(0xFF64748B)),
              const SizedBox(width: 5),
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: isSelected ? Colors.white : const Color(0xFF64748B),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showProofImageDialog(String proofUrl, String customerName) {
    DeliveryProofHelper.showLightbox(
      context: context,
      proofStr: proofUrl,
      customerName: customerName,
      address: 'Doorstep Delivery Location',
      timestamp: 'Verified Morning Shift Drop',
      partnerName: _profileName,
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
  late final TextEditingController _addonCollectedController;
  final TextEditingController _addonSearchController = TextEditingController();
  late String _paymentMethod;
  String _addonPaymentMethod = 'cash'; // 'cash' | 'upi' | 'credit'
  bool _isSubmitting = false;
  bool _manualCollectedEdited = false;
  bool _manualAddonCollectedEdited = false;

  // Add-ons Catalog States
  bool _showAddonsPicker = false;
  bool _isLoadingProducts = false;
  String _addonSearchQuery = '';
  List<ProductModel> _availableProducts = [];
  final Map<String, double> _addonQuantities = {};
  StreamSubscription? _wsProductSub;

  // Real-time Camera Doorstep Photo Proof
  String? _capturedPhotoBase64;
  Uint8List? _capturedPhotoBytes;
  bool _isCapturing = false;
  DateTime? _capturedAt;

  @override
  void initState() {
    super.initState();
    _milkController = TextEditingController(text: (widget.delivery['plannedMilk'] ?? 1).toString());
    _curdController = TextEditingController(text: (widget.delivery['plannedCurd'] ?? 0).toString());

    final rawPayMethod = (widget.delivery['paymentMethod'] ?? 'advance').toString().toLowerCase();
    if (rawPayMethod == 'prepaid' || widget.delivery['subscriptionEndDate'] != null) {
      _paymentMethod = 'advance';
    } else if (['advance', 'cash', 'upi', 'credit'].contains(rawPayMethod)) {
      _paymentMethod = rawPayMethod;
    } else {
      _paymentMethod = 'credit';
    }

    _collectedController = TextEditingController(text: _computeGrandTotal().toStringAsFixed(0));
    _addonCollectedController = TextEditingController(text: '0');

    _milkController.addListener(_onQtyOrAddonChanged);
    _curdController.addListener(_onQtyOrAddonChanged);

    _loadProducts();
    _initProductRealtime();
  }

  void _initProductRealtime() {
    try {
      _wsProductSub = RealtimeService().eventStream.listen((event) {
        final type = event['type']?.toString();
        if (type == 'PRODUCT_UPDATED' ||
            type == 'PRICE_UPDATED' ||
            type == 'STOCK_UPDATED' ||
            type == 'INVENTORY_UPDATED') {
          _loadProducts(silent: true);
        }
      });
    } catch (_) {}
  }

  Future<void> _loadProducts({bool silent = false}) async {
    if (!silent) setState(() => _isLoadingProducts = true);
    try {
      final list = await widget.api.getProducts();
      if (mounted) {
        setState(() {
          _availableProducts = list.isNotEmpty ? list : ProductModel.defaultCatalog;
          _isLoadingProducts = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          if (_availableProducts.isEmpty) _availableProducts = ProductModel.defaultCatalog;
          _isLoadingProducts = false;
        });
      }
    }
  }

  double get _milkPrice => (num.tryParse(widget.delivery['milkPrice']?.toString() ?? '60') ?? 60).toDouble();
  double get _curdPrice => (num.tryParse(widget.delivery['curdPrice']?.toString() ?? '30') ?? 30).toDouble();
  bool get _isPrepaidSubscription => widget.delivery['subscriptionEndDate'] != null || _paymentMethod == 'advance';

  double _unitPriceOf(ProductModel prod) {
    return prod.numericPrice > 0
        ? prod.numericPrice
        : (double.tryParse(prod.price.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 60.0);
  }

  double _computeBaseAmount() {
    final milk = double.tryParse(_milkController.text.trim()) ?? 0.0;
    final curd = double.tryParse(_curdController.text.trim()) ?? 0.0;
    return (milk * _milkPrice) + ((curd / 500.0) * _curdPrice);
  }

  double _computeAddonsTotal() {
    double sum = 0.0;
    for (final prod in _availableProducts) {
      final qty = _addonQuantities[prod.id] ?? 0.0;
      if (qty > 0) sum += qty * _unitPriceOf(prod);
    }
    return sum;
  }

  double _computeGrandTotal() => _computeBaseAmount() + _computeAddonsTotal();

  List<Map<String, dynamic>> _buildAddonsPayload() {
    final items = <Map<String, dynamic>>[];
    for (final prod in _availableProducts) {
      final qty = _addonQuantities[prod.id] ?? 0.0;
      if (qty > 0) {
        items.add({
          'productId': prod.id,
          'name': prod.name,
          'quantity': qty,
          'unit': prod.unit,
          'price': _unitPriceOf(prod),
        });
      }
    }
    return items;
  }

  void _onQtyOrAddonChanged() {
    if (!mounted) return;
    setState(() {
      if (!_manualCollectedEdited) {
        _collectedController.text = _computeGrandTotal().toStringAsFixed(0);
      }
      if (!_manualAddonCollectedEdited) {
        _addonCollectedController.text = _computeAddonsTotal().toStringAsFixed(0);
      }
    });
  }

  @override
  void dispose() {
    _wsProductSub?.cancel();
    _milkController.removeListener(_onQtyOrAddonChanged);
    _curdController.removeListener(_onQtyOrAddonChanged);
    _milkController.dispose();
    _curdController.dispose();
    _collectedController.dispose();
    _addonCollectedController.dispose();
    _addonSearchController.dispose();
    super.dispose();
  }

  /// Open device camera to click real-time doorstep delivery photo proof with burned timestamp & location
  Future<void> _openCameraAndCapture() async {
    setState(() => _isCapturing = true);
    try {
      final photoBase64 = await LauncherService.takePhoto();
      if (!mounted) return;
      if (photoBase64 != null && photoBase64.isNotEmpty) {
        final cleanBase64 = photoBase64.contains(',') ? photoBase64.split(',')[1] : photoBase64;
        final rawBytes = base64Decode(cleanBase64);

        final now = DateTime.now();
        // Indian Standard Time (IST) formatting
        final timestampStr = IstDateTime.formatFull(now);

        final custName = widget.delivery['customerName']?.toString() ?? 'Household Customer';
        final custAddr = widget.delivery['customerAddress']?.toString() ??
            widget.delivery['deliveryAddress']?.toString() ??
            widget.delivery['area']?.toString() ??
            'Doorstep Drop Location';
        final partnerName = widget.delivery['deliveryBoyName']?.toString() ?? 'Dairy Partner';

        // Burn real-time timestamp & location watermark onto the photo pixels
        final watermarkedBytes = await DeliveryProofWatermarker.stampWatermark(
          rawBytes,
          timestamp: timestampStr,
          location: custAddr,
          customerName: custName,
          partnerName: partnerName,
        );

        final watermarkedBase64 = 'data:image/png;base64,${base64Encode(watermarkedBytes)}';

        if (!mounted) return;
        setState(() {
          _capturedPhotoBase64 = watermarkedBase64;
          _capturedPhotoBytes = watermarkedBytes;
          _capturedAt = now;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✓ Doorstep delivery photo captured with live timestamp & location!'),
            backgroundColor: Color(0xFF059669),
            duration: Duration(seconds: 3),
          ),
        );
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Camera capture cancelled or no photo taken')),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Camera error: $e')),
      );
    } finally {
      if (mounted) setState(() => _isCapturing = false);
    }
  }

  Future<void> _submit() async {
    if (_capturedPhotoBase64 == null || _capturedPhotoBase64!.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('⚠️ Photo proof is required! Please click Open Camera to capture delivery photo.'),
          backgroundColor: Color(0xFFDC2626),
          duration: Duration(seconds: 3),
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    final deliveryId = widget.delivery['_id'] ?? widget.delivery['id'];
    final milk = num.tryParse(_milkController.text) ?? 1;
    final curd = num.tryParse(_curdController.text) ?? 0;
    final collected = num.tryParse(_collectedController.text) ?? _computeGrandTotal();
    final addonsPayload = _buildAddonsPayload();
    final addonsTotal = _computeAddonsTotal();
    final addonCollected = num.tryParse(_addonCollectedController.text) ?? addonsTotal;

    // Store proof photo directly in Cloudinary first so MongoDB saves only the Cloudinary URL
    String proofPayload = _capturedPhotoBase64!;
    try {
      final uploadedUrl = await widget.api.uploadBase64Image(
        _capturedPhotoBase64!,
        folder: 'natural-milk-dairy/delivery-proofs',
      );
      if (uploadedUrl != null && uploadedUrl.isNotEmpty) {
        proofPayload = uploadedUrl;
      }
    } catch (_) {}

    final res = await widget.api.post('/api/deliveries/$deliveryId/delivered', {
      'actualMilk': milk,
      'actualCurd': curd,
      'paymentMethod': _paymentMethod,
      'collectedAmount': (_paymentMethod == 'cash' || _paymentMethod == 'upi') ? collected : 0,
      if (addonsPayload.isNotEmpty) 'addons': addonsPayload,
      if (addonsPayload.isNotEmpty) 'addonPaymentMethod': (_paymentMethod == 'cash' || _paymentMethod == 'upi') ? _paymentMethod : _addonPaymentMethod,
      if (addonsPayload.isNotEmpty && ((_paymentMethod == 'cash' || _paymentMethod == 'upi') || _addonPaymentMethod == 'cash' || _addonPaymentMethod == 'upi'))
        'addonCollectedAmount': (_paymentMethod == 'cash' || _paymentMethod == 'upi') ? addonsTotal : addonCollected,
      'proofImage': proofPayload,
      'proofLocation': widget.delivery['customerAddress'] ?? widget.delivery['deliveryAddress'] ?? widget.delivery['area'] ?? '',
      'latitude': widget.delivery['customerLatitude'] ?? widget.delivery['latitude'],
      'longitude': widget.delivery['customerLongitude'] ?? widget.delivery['longitude'],
      'actor': widget.delivery['deliveryBoyName']?.toString() ?? 'Mobile Driver',
    });

    if (!mounted) return;
    setState(() => _isSubmitting = false);

    if (res['success'] == true) {
      final rawServerDelivery = res['delivery'];
      final serverDelivery = rawServerDelivery is Map ? Map<String, dynamic>.from(rawServerDelivery) : null;
      final effectiveCollectedAmt = (_paymentMethod == 'cash' || _paymentMethod == 'upi')
          ? collected.toDouble()
          : (addonsPayload.isNotEmpty && (_addonPaymentMethod == 'cash' || _addonPaymentMethod == 'upi')
              ? addonCollected.toDouble()
              : 0.0);
      final effectivePayMethod = (_paymentMethod == 'cash' || _paymentMethod == 'upi')
          ? _paymentMethod
          : _addonPaymentMethod;

      // Check if server persisted the payment / addon amounts (older un-deployed server builds ignore addons/addonCollectedAmount)
      final serverSavedPay = (num.tryParse((serverDelivery?['paymentAmount'] ?? '0').toString()) ?? 0).toDouble();
      final serverSavedAddonPay = (num.tryParse((serverDelivery?['addonPaidAmount'] ?? '0').toString()) ?? 0).toDouble();
      final bool serverPersistedPayment =
          (serverSavedPay >= effectiveCollectedAmt && effectiveCollectedAmt > 0) ||
          (serverSavedAddonPay >= effectiveCollectedAmt && effectiveCollectedAmt > 0);

      if (effectiveCollectedAmt > 0 &&
          (effectivePayMethod == 'cash' || effectivePayMethod == 'upi') &&
          !serverPersistedPayment &&
          widget.delivery['customerId'] != null) {
        try {
          await widget.api.post('/api/payments', {
            'customerId': widget.delivery['customerId'].toString(),
            'amount': effectiveCollectedAmt,
            'paymentMethod': effectivePayMethod,
            'deliveryBoyId': widget.delivery['deliveryBoyId']?.toString() ?? '',
            'notes': addonsPayload.isNotEmpty
                ? 'Doorstep Add-ons: ${addonsPayload.map((a) => '${a['name']} x${a['quantity']}').join(', ')}'
                : 'Doorstep Delivery Collection',
          });
        } catch (_) {}
      }

      final optimisticPaidAmt = effectiveCollectedAmt;
      final optimisticAddonMethod = addonsPayload.isNotEmpty
          ? ((_paymentMethod == 'cash' || _paymentMethod == 'upi') ? _paymentMethod : _addonPaymentMethod)
          : '';
      final optimisticAddonPaid = (_paymentMethod == 'cash' || _paymentMethod == 'upi')
          ? addonsTotal
          : ((_addonPaymentMethod == 'cash' || _addonPaymentMethod == 'upi') ? addonCollected : 0);

      final persistedProof = serverDelivery?['proofImage']?.toString().trim();
      widget.delivery['proofImage'] = (persistedProof != null && persistedProof.isNotEmpty)
          ? persistedProof
          : proofPayload;
      widget.delivery['status'] = 'delivered';
      widget.delivery['actualMilk'] = milk;
      widget.delivery['actualCurd'] = curd;
      widget.delivery['addons'] = addonsPayload;
      widget.delivery['addonsTotal'] = addonsTotal;
      widget.delivery['totalAmount'] = serverDelivery?['totalAmount'] ?? _computeGrandTotal();
      widget.delivery['paymentMethod'] = serverDelivery?['paymentMethod'] ?? _paymentMethod;
      widget.delivery['paymentAmount'] = (serverDelivery?['paymentAmount'] != null && serverSavedPay > 0)
          ? serverDelivery!['paymentAmount']
          : optimisticPaidAmt;
      widget.delivery['addonPaymentMethod'] = (serverDelivery?['addonPaymentMethod'] ?? '').toString().isNotEmpty
          ? serverDelivery!['addonPaymentMethod']
          : optimisticAddonMethod;
      widget.delivery['addonPaidAmount'] = (serverDelivery?['addonPaidAmount'] != null && serverSavedAddonPay > 0)
          ? serverDelivery!['addonPaidAmount']
          : optimisticAddonPaid;
      widget.delivery['deliveredAt'] = DateTime.now().toIso8601String();

      await _saveLocalAddonCache(deliveryId.toString(), {
        if (addonsPayload.isNotEmpty) 'addons': addonsPayload,
        if (addonsTotal > 0) 'addonsTotal': addonsTotal,
        'totalAmount': widget.delivery['totalAmount'],
        'paymentMethod': widget.delivery['paymentMethod'],
        'paymentAmount': widget.delivery['paymentAmount'],
        'addonPaymentMethod': widget.delivery['addonPaymentMethod'],
        'addonPaidAmount': widget.delivery['addonPaidAmount'],
      });

      if (!mounted) return;
      widget.onSuccess();
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            addonsPayload.isNotEmpty
                ? '✓ Delivery + ${addonsPayload.length} add-on item(s) completed!'
                : '✓ Delivery marked completed with photo proof!',
          ),
          backgroundColor: const Color(0xFF059669),
        ),
      );
    } else {
      final msg = res['message']?.toString() ?? 'Failed to update delivery';
      final friendlyMsg = msg.contains('TimeoutException')
          ? 'Network is slow. Please tap Confirm Delivery again to retry.'
          : msg;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(friendlyMsg),
          backgroundColor: const Color(0xFFDC2626),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final customerName = widget.delivery['customerName'] ?? 'Customer';
    final customerAddress = widget.delivery['customerAddress'] ?? 'Doorstep Delivery';
    final customerPhone = widget.delivery['customerPhone'] ?? '';
    final baseAmount = _computeBaseAmount();
    final addonsTotal = _computeAddonsTotal();
    final grandTotal = baseAmount + addonsTotal;
    final selectedAddons = _buildAddonsPayload();
    final filteredCatalog = _availableProducts.where((p) {
      if (_addonSearchQuery.isEmpty) return true;
      return p.name.toLowerCase().contains(_addonSearchQuery) ||
          p.category.toLowerCase().contains(_addonSearchQuery);
    }).toList();

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
            const SizedBox(height: 22),
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
            const SizedBox(height: 18),

            // ADD-ONS BUTTON & PRODUCT PICKER SECTION
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Extra Doorstep Add-ons', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Color(0xFF0F172A))),
                      Text(
                        selectedAddons.isEmpty ? 'Add extra items from live catalog' : '${selectedAddons.length} item(s) • ₹${addonsTotal.toStringAsFixed(0)}',
                        style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: selectedAddons.isEmpty ? const Color(0xFF64748B) : const Color(0xFF059669)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton.icon(
                  onPressed: () {
                    setState(() => _showAddonsPicker = !_showAddonsPicker);
                    if (_showAddonsPicker && _availableProducts.isEmpty) {
                      _loadProducts();
                    }
                  },
                  icon: Icon(_showAddonsPicker ? Icons.expand_less_rounded : Icons.add_shopping_cart_rounded, size: 16, color: Colors.white),
                  label: Text(
                    _showAddonsPicker ? 'Hide Add-ons' : (selectedAddons.isEmpty ? '+ Add-ons' : '+ Add-ons (${selectedAddons.length})'),
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.white),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF059669),
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ],
            ),

            if (selectedAddons.isNotEmpty) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFBBF7D0)),
                ),
                child: Column(
                  children: [
                    ...selectedAddons.map((a) {
                      final pId = a['productId'].toString();
                      final qty = (a['quantity'] as num).toDouble();
                      final price = (a['price'] as num).toDouble();
                      final lineTot = qty * price;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                '${a['name']} × ${qty == qty.truncateToDouble() ? qty.toInt() : qty}',
                                style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Color(0xFF065F46)),
                              ),
                            ),
                            Text(
                              '₹${lineTot.toStringAsFixed(0)}',
                              style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, color: Color(0xFF047857)),
                            ),
                            const SizedBox(width: 8),
                            InkWell(
                              onTap: () {
                                _addonQuantities.remove(pId);
                                _onQtyOrAddonChanged();
                              },
                              child: const Icon(Icons.close_rounded, size: 16, color: Color(0xFFDC2626)),
                            ),
                          ],
                        ),
                      );
                    }),
                  ],
                ),
              ),
            ],

            if (_showAddonsPicker) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFCBD5E1)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TextField(
                      controller: _addonSearchController,
                      onChanged: (v) => setState(() => _addonSearchQuery = v.trim().toLowerCase()),
                      decoration: InputDecoration(
                        hintText: 'Search all available products...',
                        hintStyle: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                        prefixIcon: const Icon(Icons.search_rounded, size: 18, color: Color(0xFF059669)),
                        filled: true,
                        fillColor: Colors.white,
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(9), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(9), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                      ),
                    ),
                    const SizedBox(height: 10),
                    if (_isLoadingProducts)
                      const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator(color: Color(0xFF059669), strokeWidth: 2)))
                    else if (filteredCatalog.isEmpty)
                      const Padding(
                        padding: EdgeInsets.all(12),
                        child: Center(child: Text('No matching products found', style: TextStyle(fontSize: 12, color: Color(0xFF64748B)))),
                      )
                    else
                      ...filteredCatalog.map((prod) {
                        final qty = _addonQuantities[prod.id] ?? 0.0;
                        final uPrice = _unitPriceOf(prod);
                        final pName = prod.name.toLowerCase();
                        final pUnit = prod.unit.toLowerCase();
                        final isFixedHalfOrPack = pName.contains('half') ||
                            pName.contains('500') ||
                            pUnit.contains('500') ||
                            pUnit.contains('ml') ||
                            pUnit.contains('pack');
                        final isMilk = (prod.category.toLowerCase() == 'milk' || pName.contains('milk')) && !isFixedHalfOrPack;
                        final step = isMilk ? 0.5 : 1.0;

                        return Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: qty > 0 ? const Color(0xFFF0FDF4) : Colors.white,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: qty > 0 ? const Color(0xFF86EFAC) : const Color(0xFFE2E8F0)),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      prod.name,
                                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: Color(0xFF0F172A)),
                                    ),
                                    Text(
                                      '₹${uPrice.toStringAsFixed(0)} / ${prod.unit}',
                                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 11.5, color: Color(0xFF059669)),
                                    ),
                                  ],
                                ),
                              ),
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  InkWell(
                                    onTap: qty > 0
                                        ? () {
                                            final next = (qty - step).clamp(0.0, 99.0);
                                            if (next <= 0) {
                                              _addonQuantities.remove(prod.id);
                                            } else {
                                              _addonQuantities[prod.id] = next;
                                            }
                                            _onQtyOrAddonChanged();
                                          }
                                        : null,
                                    child: Container(
                                      padding: const EdgeInsets.all(6),
                                      decoration: BoxDecoration(
                                        color: qty > 0 ? const Color(0xFFF1F5F9) : const Color(0xFFF8FAFC),
                                        borderRadius: BorderRadius.circular(7),
                                      ),
                                      child: Icon(Icons.remove, size: 15, color: qty > 0 ? const Color(0xFF0F172A) : const Color(0xFFCBD5E1)),
                                    ),
                                  ),
                                  Container(
                                    constraints: const BoxConstraints(minWidth: 34),
                                    alignment: Alignment.center,
                                    child: Text(
                                      qty > 0 ? (qty == qty.truncateToDouble() ? '${qty.toInt()}' : '$qty') : '0',
                                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13),
                                    ),
                                  ),
                                  InkWell(
                                    onTap: () {
                                      _addonQuantities[prod.id] = qty + step;
                                      _onQtyOrAddonChanged();
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.all(6),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF059669),
                                        borderRadius: BorderRadius.circular(7),
                                      ),
                                      child: const Icon(Icons.add, size: 15, color: Colors.white),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        );
                      }),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 16),

            // LIVE AMOUNT BREAKDOWN CARD
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFBBF7D0)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Base Milk & Curd', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: Color(0xFF334155))),
                      Text(
                        _isPrepaidSubscription ? 'Prepaid Subscription' : '₹${baseAmount.toStringAsFixed(0)}',
                        style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFF065F46)),
                      ),
                    ],
                  ),
                  if (addonsTotal > 0) ...[
                    const SizedBox(height: 5),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Add-ons (${selectedAddons.length} items)', style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Color(0xFF047857))),
                        Text('₹${addonsTotal.toStringAsFixed(0)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Color(0xFF047857))),
                      ],
                    ),
                  ],
                  const Divider(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        _isPrepaidSubscription ? 'Extra Due (Add-ons)' : 'Grand Total',
                        style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                      ),
                      Text(
                        '₹${(_isPrepaidSubscription ? addonsTotal : grandTotal).toStringAsFixed(0)}',
                        style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: Color(0xFF059669)),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 18),
            const Text('Payment Settlement', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Color(0xFF0F172A))),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              initialValue: _paymentMethod,
              isExpanded: true,
              decoration: const InputDecoration(border: OutlineInputBorder(), isDense: true),
              items: const [
                DropdownMenuItem(value: 'advance', child: Text('Prepaid / Advance Subscription', overflow: TextOverflow.ellipsis)),
                DropdownMenuItem(value: 'cash', child: Text('Cash on Delivery', overflow: TextOverflow.ellipsis)),
                DropdownMenuItem(value: 'upi', child: Text('UPI on Delivery', overflow: TextOverflow.ellipsis)),
                DropdownMenuItem(value: 'credit', child: Text('Monthly Credit Ledger', overflow: TextOverflow.ellipsis)),
              ],
              onChanged: (v) {
                if (v == null) return;
                setState(() {
                  _paymentMethod = v;
                  if (!_manualCollectedEdited) {
                    _collectedController.text = _computeGrandTotal().toStringAsFixed(0);
                  }
                });
              },
            ),

            if (_paymentMethod == 'cash' || _paymentMethod == 'upi') ...[
              const SizedBox(height: 14),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Flexible(
                    child: Text('Total Cash / Amount Collected (₹)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: Color(0xFF334155))),
                  ),
                  const SizedBox(width: 8),
                  InkWell(
                    onTap: () => setState(() {
                      _manualCollectedEdited = false;
                      _collectedController.text = grandTotal.toStringAsFixed(0);
                    }),
                    child: Text('Full: ₹${grandTotal.toStringAsFixed(0)}', style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Color(0xFF059669))),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              TextFormField(
                controller: _collectedController,
                onChanged: (_) => _manualCollectedEdited = true,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(border: OutlineInputBorder(), isDense: true, prefixText: '₹ '),
              ),
            ],

            // SEPARATE ADD-ONS PAYMENT SETTLEMENT WHEN DELIVERY IS ON PREPAID OR MONTHLY CREDIT
            if (addonsTotal > 0 && (_paymentMethod == 'advance' || _paymentMethod == 'credit')) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFFBEB),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFFDE68A)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Add-ons Payment Settlement',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5, color: Color(0xFF92400E)),
                    ),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      initialValue: _addonPaymentMethod,
                      isExpanded: true,
                      decoration: const InputDecoration(
                        border: OutlineInputBorder(),
                        isDense: true,
                        filled: true,
                        fillColor: Colors.white,
                      ),
                      items: const [
                        DropdownMenuItem(value: 'credit', child: Text('Add to Customer Credit Ledger', overflow: TextOverflow.ellipsis)),
                        DropdownMenuItem(value: 'cash', child: Text('💵 Cash Given for Add-ons', overflow: TextOverflow.ellipsis)),
                        DropdownMenuItem(value: 'upi', child: Text('📱 UPI Paid for Add-ons', overflow: TextOverflow.ellipsis)),
                      ],
                      onChanged: (v) {
                        if (v == null) return;
                        setState(() {
                          _addonPaymentMethod = v;
                          if (!_manualAddonCollectedEdited) {
                            _addonCollectedController.text = addonsTotal.toStringAsFixed(0);
                          }
                        });
                      },
                    ),
                    if (_addonPaymentMethod == 'cash' || _addonPaymentMethod == 'upi') ...[
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Flexible(
                            child: Text('Cash / Amount Given for Add-ons (₹)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: Color(0xFF78350F))),
                          ),
                          const SizedBox(width: 8),
                          InkWell(
                            onTap: () => setState(() {
                              _manualAddonCollectedEdited = false;
                              _addonCollectedController.text = addonsTotal.toStringAsFixed(0);
                            }),
                            child: Text('Full: ₹${addonsTotal.toStringAsFixed(0)}', style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Color(0xFF059669))),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _addonCollectedController,
                        onChanged: (_) => _manualAddonCollectedEdited = true,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          border: OutlineInputBorder(),
                          isDense: true,
                          filled: true,
                          fillColor: Colors.white,
                          prefixText: '₹ ',
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
            const SizedBox(height: 24),
            const Row(
              children: [
                Text('Doorstep Delivery Photo Proof', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Color(0xFF0F172A))),
                SizedBox(width: 6),
                Text('* (Required)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: Color(0xFFDC2626))),
              ],
            ),
            const SizedBox(height: 10),

            // Doorstep Photo Preview Card
            if (_capturedPhotoBytes != null) ...[
              Container(
                decoration: BoxDecoration(
                  color: const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF10B981), width: 1.5),
                  boxShadow: [
                    BoxShadow(color: const Color(0xFF059669).withValues(alpha: 0.08), blurRadius: 10, offset: const Offset(0, 4)),
                  ],
                ),
                clipBehavior: Clip.antiAlias,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Stack(
                      children: [
                        Image.memory(
                          _capturedPhotoBytes!,
                          height: 220,
                          width: double.infinity,
                          fit: BoxFit.cover,
                        ),
                        Positioned(
                          top: 10,
                          right: 10,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: const Color(0xFF059669),
                              borderRadius: BorderRadius.circular(20),
                              boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 4)],
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.check_circle_rounded, color: Colors.white, size: 14),
                                SizedBox(width: 4),
                                Text(
                                  'Doorstep Photo Captured',
                                  style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w800),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  '✓ Photo Proof Attached',
                                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: Color(0xFF065F46)),
                                ),
                                if (_capturedAt != null)
                                  Text(
                                    'Captured at ${_capturedAt!.hour.toString().padLeft(2, '0')}:${_capturedAt!.minute.toString().padLeft(2, '0')}:${_capturedAt!.second.toString().padLeft(2, '0')}',
                                    style: const TextStyle(fontSize: 11, color: Color(0xFF059669)),
                                  ),
                              ],
                            ),
                          ),
                          OutlinedButton.icon(
                            onPressed: _isCapturing ? null : _openCameraAndCapture,
                            icon: const Icon(Icons.refresh_rounded, size: 16, color: Color(0xFF059669)),
                            label: const Text('Retake Photo', style: TextStyle(color: Color(0xFF059669), fontWeight: FontWeight.w700, fontSize: 12)),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: Color(0xFF059669)),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ] else ...[
              // Action Card: Click Doorstep Photo (ONLY Open Camera button, no overflow)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFCBD5E1), width: 1.5),
                ),
                child: Column(
                  children: [
                    Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        color: const Color(0xFFECFDF5),
                        shape: BoxShape.circle,
                        border: Border.all(color: const Color(0xFFA7F3D0), width: 1.5),
                      ),
                      child: _isCapturing
                          ? const Center(child: SizedBox(width: 26, height: 26, child: CircularProgressIndicator(strokeWidth: 2.5, color: Color(0xFF059669))))
                          : const Icon(Icons.photo_camera_rounded, size: 32, color: Color(0xFF059669)),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Click Doorstep Photo',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Color(0xFF0F172A)),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Tap to open camera & capture live delivery proof',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: _isCapturing ? null : _openCameraAndCapture,
                      icon: const Icon(Icons.camera_alt, color: Colors.white, size: 18),
                      label: const Text('Open Camera', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF059669),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                        padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 12),
                        elevation: 1,
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 14),
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
                      'Live doorstep delivery photo ensures verified customer drop.',
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
                  backgroundColor: _capturedPhotoBase64 != null ? const Color(0xFF059669) : const Color(0xFF94A3B8),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _isSubmitting
                    ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                    : Text(
                        _capturedPhotoBase64 != null ? '✓ Confirm Delivery (Photo Attached)' : '📷 Click Photo to Confirm Delivery',
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Colors.white),
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
  final String partnerName;
  final VoidCallback onSuccess;

  const _FullScreenAddCustomerPage({
    required this.api,
    required this.defaultArea,
    this.partnerName = '',
    required this.onSuccess,
  });

  @override
  State<_FullScreenAddCustomerPage> createState() => _FullScreenAddCustomerPageState();
}

class _FullScreenAddCustomerPageState extends State<_FullScreenAddCustomerPage> {
  final _nameCtrl = TextEditingController();
  final _mobileCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _whatsappCtrl = TextEditingController();
  final _landmarkCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _googleMapsUrlCtrl = TextEditingController();
  final _milkQtyCtrl = TextEditingController(text: '1');
  final _curdQtyCtrl = TextEditingController(text: '0');
  final _notesCtrl = TextEditingController();

  late String _selectedArea;
  String _status = 'active'; // 'active', 'paused', 'inactive'
  String _frequency = 'daily'; // 'daily', 'alternate', 'custom'
  String _paymentType = 'credit'; // 'credit', 'prepaid', 'cod'
  String _paymentCycle = 'monthly'; // 'monthly', 'weekly', 'daily'

  double? _latitude;
  double? _longitude;
  bool _isSubmitting = false;

  final List<String> _serviceLocations = [
    'Madhapur',
    'Gachibowli',
    'Kondapur',
    'Jubilee Hills',
    'Banjara Hills',
    'Hitec City',
    'Financial District',
  ];

  List<ProductModel> _products = [];
  bool _isLoadingProducts = true;
  final Map<String, double> _productQuantities = {};
  StreamSubscription? _wsProductSub;

  @override
  void initState() {
    super.initState();
    _syncDefaultAreaSelection();
    _loadServiceLocations();
    _loadProducts();
    _initProductRealtime();
  }

  void _syncDefaultAreaSelection() {
    final defArea = widget.defaultArea.trim();
    final isGenericRoute = defArea.isEmpty ||
        defArea.toLowerCase().contains('all dairy') ||
        defArea.toLowerCase() == 'all areas' ||
        defArea.toLowerCase() == 'all';
    if (isGenericRoute) {
      _selectedArea = _serviceLocations.first;
      return;
    }
    final existingIdx = _serviceLocations.indexWhere((loc) => loc.toLowerCase() == defArea.toLowerCase());
    if (existingIdx != -1) {
      _selectedArea = _serviceLocations[existingIdx];
    } else {
      _serviceLocations.insert(0, defArea);
      _selectedArea = defArea;
    }
  }

  Future<void> _loadServiceLocations() async {
    try {
      final liveAreas = await widget.api.getDeliveryAreas();
      final filtered = liveAreas
          .map((a) => a.trim())
          .where((a) => a.isNotEmpty && !a.toLowerCase().contains('all dairy') && a.toLowerCase() != 'all areas')
          .toList();
      if (filtered.isNotEmpty && mounted) {
        setState(() {
          for (final area in filtered) {
            if (!_serviceLocations.any((existing) => existing.toLowerCase() == area.toLowerCase())) {
              _serviceLocations.add(area);
            }
          }
          final matched = _serviceLocations.firstWhere(
            (loc) => loc.toLowerCase() == _selectedArea.toLowerCase(),
            orElse: () => _serviceLocations.first,
          );
          _selectedArea = matched;
        });
      }
    } catch (_) {}
  }

  void _initProductRealtime() {
    try {
      _wsProductSub = RealtimeService().eventStream.listen((event) {
        final type = event['type']?.toString();
        if (type == 'PRODUCT_UPDATED' ||
            type == 'PRICE_UPDATED' ||
            type == 'STOCK_UPDATED' ||
            type == 'INVENTORY_UPDATED') {
          _loadProducts(silent: true);
        } else if (type == 'LOCATION_UPDATED') {
          _loadServiceLocations();
        }
      });
    } catch (_) {}
  }

  Future<void> _loadProducts({bool silent = false}) async {
    if (!silent) setState(() => _isLoadingProducts = true);
    try {
      final list = await widget.api.getProducts();
      if (mounted) {
        setState(() {
          _products = list.isNotEmpty ? list : ProductModel.defaultCatalog;
          _isLoadingProducts = false;
          if (_productQuantities.isEmpty && _products.isNotEmpty) {
            final defaultMilk = _products.firstWhere(
              (p) => p.category.toLowerCase() == 'milk' || p.name.toLowerCase().contains('milk'),
              orElse: () => _products.first,
            );
            _productQuantities[defaultMilk.id] = 1.0;
          }
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          if (_products.isEmpty) _products = ProductModel.defaultCatalog;
          _isLoadingProducts = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _wsProductSub?.cancel();
    _nameCtrl.dispose();
    _mobileCtrl.dispose();
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _whatsappCtrl.dispose();
    _landmarkCtrl.dispose();
    _addressCtrl.dispose();
    _googleMapsUrlCtrl.dispose();
    _milkQtyCtrl.dispose();
    _curdQtyCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  void _onMapsUrlChanged(String val) {
    final str = val.trim();
    if (str.isEmpty) return;

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

  void _showMapLocationSelector() async {
    final result = await Navigator.push<Map<String, dynamic>>(
      context,
      MaterialPageRoute(
        builder: (_) => SelectLocationMapScreen(
          initialLat: _latitude ?? 17.4483,
          initialLng: _longitude ?? 78.3915,
          initialArea: _selectedArea.isNotEmpty ? _selectedArea : widget.defaultArea,
        ),
      ),
    );

    if (result != null && mounted) {
      setState(() {
        _latitude = (result['latitude'] as num?)?.toDouble();
        _longitude = (result['longitude'] as num?)?.toDouble();
        if (_latitude != null && _longitude != null) {
          _googleMapsUrlCtrl.text = 'https://www.google.com/maps?q=$_latitude,$_longitude';
        }
        final area = result['area']?.toString();
        final addressSnippet = result['address']?.toString();
        if (area != null && area.isNotEmpty) {
          final existingIdx = _serviceLocations.indexWhere((loc) => loc.toLowerCase() == area.toLowerCase());
          if (existingIdx != -1) {
            _selectedArea = _serviceLocations[existingIdx];
          } else {
            _serviceLocations.add(area);
            _selectedArea = area;
          }
        }
        if (addressSnippet != null && addressSnippet.isNotEmpty && _addressCtrl.text.isEmpty) {
          _addressCtrl.text = addressSnippet;
        }
      });
    }
  }

  double get _dailyTotalEstimate {
    double sum = 0.0;
    for (final prod in _products) {
      final qty = _productQuantities[prod.id] ?? 0.0;
      if (qty > 0) {
        final unitPrice = prod.numericPrice > 0
            ? prod.numericPrice
            : (double.tryParse(prod.price.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 60.0);
        sum += (qty * unitPrice);
      }
    }
    return sum;
  }

  List<ProductModel> get _selectedProductsList {
    return _products.where((p) => (_productQuantities[p.id] ?? 0.0) > 0).toList();
  }

  Future<void> _submit() async {
    final name = _nameCtrl.text.trim();
    final mobile = _mobileCtrl.text.trim();
    final address = _addressCtrl.text.trim();

    if (name.length < 2) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter customer full name (at least 2 characters).')),
      );
      return;
    }

    final cleanPhone = mobile.replaceAll(RegExp(r'\D'), '');
    final phone10 = cleanPhone.length >= 10 ? cleanPhone.substring(cleanPhone.length - 10) : cleanPhone;
    if (phone10.length != 10 || !RegExp(r'^[6-9]\d{9}$').hasMatch(phone10)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid 10-digit Indian mobile number starting with 6–9.')),
      );
      return;
    }

    if (address.length < 4) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter complete delivery address (at least 4 characters).')),
      );
      return;
    }

    // Auto-generate fallback password if user leaves password blank; validate if provided
    String finalPassword = _passwordCtrl.text.trim();
    if (finalPassword.isNotEmpty && finalPassword.length < 8) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Password must be at least 8 characters (or leave blank to auto-generate).')),
      );
      return;
    }
    if (finalPassword.isEmpty) {
      final last4 = phone10.substring(phone10.length - 4);
      finalPassword = 'Nmd@${last4}123';
    }

    final extraProducts = <Map<String, dynamic>>[];
    double calculatedMilkQty = 0.0;
    double calculatedCurdQty = 0.0;
    String milkType = 'Pure A2 Cow Milk';

    for (final prod in _products) {
      final qty = _productQuantities[prod.id] ?? 0.0;
      if (qty > 0) {
        final unitPrice = prod.numericPrice > 0
            ? prod.numericPrice
            : (double.tryParse(prod.price.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 60.0);
        extraProducts.add({
          'productId': prod.id,
          'name': prod.name,
          'quantity': qty,
          'unit': prod.unit,
          'price': unitPrice,
        });
        final cat = prod.category.toLowerCase();
        final nameLower = prod.name.toLowerCase();
        if (cat == 'milk' || nameLower.contains('milk')) {
          calculatedMilkQty += qty;
          milkType = prod.name;
        } else if (cat == 'curd' || nameLower.contains('curd')) {
          calculatedCurdQty += qty * 500;
        }
      }
    }

    final double manualMilk = double.tryParse(_milkQtyCtrl.text.trim()) ?? 1.0;
    final double manualCurd = double.tryParse(_curdQtyCtrl.text.trim()) ?? 0.0;
    final double totalMilk = manualMilk != 1.0 ? manualMilk : (calculatedMilkQty > 0 ? calculatedMilkQty : manualMilk);
    final double totalCurd = manualCurd > 0 ? manualCurd : calculatedCurdQty;

    setState(() => _isSubmitting = true);

    final authUser = context.read<AuthProvider>().user;
    final partnerId = authUser?.id ?? '';
    final whatsappRaw = _whatsappCtrl.text.trim().replaceAll(RegExp(r'\D'), '');
    final whatsappFinal = whatsappRaw.length >= 10 ? whatsappRaw.substring(whatsappRaw.length - 10) : phone10;

    final payload = {
      'name': name,
      'mobile': phone10,
      'email': _emailCtrl.text.trim(),
      'password': finalPassword,
      'whatsapp': whatsappFinal,
      'address': address,
      'area': _selectedArea,
      'landmark': _landmarkCtrl.text.trim(),
      'googleMapsUrl': _googleMapsUrlCtrl.text.trim(),
      if (_latitude != null) 'latitude': _latitude,
      if (_longitude != null) 'longitude': _longitude,
      'status': _status,
      'milkQty': totalMilk,
      'milkUnit': 'L',
      'curdQty': totalCurd,
      'curdUnit': 'g',
      'milkType': milkType,
      'frequency': _frequency,
      if (partnerId.isNotEmpty) 'deliveryBoyId': partnerId,
      'paymentType': _paymentType,
      'paymentCycle': _paymentCycle,
      'notes': _notesCtrl.text.trim(),
      'extraProducts': extraProducts,
      'deliveryPlan': {
        'milkQty': totalMilk,
        'milkUnit': 'L',
        'curdQty': totalCurd,
        'curdUnit': 'g',
        'milkType': milkType,
        'planName': 'Daily Farm Pure Milk Plan',
        'extraProducts': extraProducts,
        'frequency': _frequency,
        if (partnerId.isNotEmpty) 'deliveryBoyId': partnerId,
        'deliveryBoyName': widget.partnerName,
      },
      'paymentInfo': {
        'paymentType': _paymentType,
        'paymentCycle': _paymentCycle,
      },
      'actor': widget.partnerName.isNotEmpty ? widget.partnerName : 'Delivery Partner',
    };

    final res = await widget.api.post('/api/customers', payload);

    if (!mounted) return;
    setState(() => _isSubmitting = false);

    if (res['success'] == true) {
      final messenger = ScaffoldMessenger.of(context);
      widget.onSuccess();
      Navigator.of(context).pop();
      messenger.showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFF059669),
          content: Text(
            res['emailSent'] == true
                ? '✓ Customer $name added to route & credentials emailed!'
                : '✓ Customer $name added & synced to route in real-time!',
          ),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFFE11D48),
          content: Text(res['message'] ?? 'Failed to add customer. Please try again.'),
        ),
      );
    }
  }

  InputDecoration _inputDecor({
    required String label,
    String? hint,
    IconData? icon,
    String? prefixText,
  }) {
    return InputDecoration(
      labelText: label,
      hintText: hint,
      prefixText: prefixText,
      prefixIcon: icon != null ? Icon(icon, size: 18, color: const Color(0xFF059669)) : null,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF059669), width: 1.8)),
      filled: true,
      fillColor: const Color(0xFFFAFAFA),
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
      hintStyle: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
    );
  }

  Widget _sectionTitle(String title, {IconData? icon, String? subtitle}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            if (icon != null) ...[
              Icon(icon, size: 16, color: const Color(0xFF059669)),
              const SizedBox(width: 6),
            ],
            Text(
              title,
              style: const TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 14.5,
                color: Color(0xFF0F172A),
                letterSpacing: -0.2,
              ),
            ),
          ],
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
          ),
        ],
        const SizedBox(height: 10),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A), size: 22),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Add New Customer',
              style: TextStyle(fontSize: 16.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
            ),
            Text(
              'Create profile & send login credentials via email',
              style: TextStyle(fontSize: 10.5, color: Colors.grey.shade600, fontWeight: FontWeight.w500),
            ),
          ],
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // CARD 1: Customer Details
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _sectionTitle('Customer Details', icon: Icons.person_outline_rounded),
                  TextField(
                    controller: _nameCtrl,
                    decoration: _inputDecor(label: 'Customer Name *', hint: 'e.g. Ramesh Kulkarni', icon: Icons.person_rounded),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _mobileCtrl,
                    keyboardType: TextInputType.phone,
                    decoration: _inputDecor(label: 'Mobile Number *', hint: '10 digit mobile', prefixText: '+91 ', icon: Icons.phone_android_rounded),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _emailCtrl,
                    keyboardType: TextInputType.emailAddress,
                    decoration: _inputDecor(label: 'Customer Email (For Credentials)', hint: 'e.g. customer@gmail.com', icon: Icons.alternate_email_rounded),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _passwordCtrl,
                    obscureText: true,
                    decoration: _inputDecor(label: 'Portal Password (Optional)', hint: 'Leave blank for auto-generated', icon: Icons.lock_outline_rounded),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _whatsappCtrl,
                    keyboardType: TextInputType.phone,
                    decoration: _inputDecor(label: 'WhatsApp Number', hint: 'Defaults to mobile', icon: Icons.chat_rounded),
                  ),
                  const SizedBox(height: 12),

                  // Area / Territory Dropdown
                  InputDecorator(
                    decoration: _inputDecor(label: 'Service Location / Area *', icon: Icons.map_outlined),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        isDense: true,
                        isExpanded: true,
                        value: _selectedArea,
                        items: _serviceLocations.map((area) {
                          return DropdownMenuItem<String>(
                            value: area,
                            child: Text(area, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF0F172A))),
                          );
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) setState(() => _selectedArea = val);
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Account Status Dropdown
                  InputDecorator(
                    decoration: _inputDecor(label: 'Account Status', icon: Icons.shield_outlined),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        isDense: true,
                        isExpanded: true,
                        value: _status,
                        items: const [
                          DropdownMenuItem(value: 'active', child: Text('Active (Deliveries Running)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF059669)))),
                          DropdownMenuItem(value: 'paused', child: Text('Paused (Deliveries On Hold)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFFD97706)))),
                          DropdownMenuItem(value: 'inactive', child: Text('Inactive', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF64748B)))),
                        ],
                        onChanged: (val) {
                          if (val != null) setState(() => _status = val);
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  TextField(
                    controller: _landmarkCtrl,
                    decoration: _inputDecor(label: 'Landmark', hint: 'e.g. Near Metro Station / Opp. Bank', icon: Icons.store_rounded),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _addressCtrl,
                    maxLines: 2,
                    decoration: _inputDecor(label: 'Delivery Address *', hint: 'Flat / Wing, Society Name, Street', icon: Icons.home_rounded),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // CARD 2: Location Pin & Real-time GPS Detection
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _sectionTitle(
                    'Google Maps Location / Pin',
                    icon: Icons.location_on_rounded,
                    subtitle: 'Paste Google Maps link or pick on map for live navigation',
                  ),
                  TextField(
                    controller: _googleMapsUrlCtrl,
                    onChanged: _onMapsUrlChanged,
                    decoration: _inputDecor(
                      label: 'Google Maps Link or Coordinates (Optional)',
                      hint: 'Paste maps link or "17.4483, 78.3915"',
                      icon: Icons.link_rounded,
                    ),
                  ),
                  const SizedBox(height: 12),

                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: _latitude != null ? const Color(0xFFF0FDF4) : const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: _latitude != null ? const Color(0xFFBBF7D0) : const Color(0xFFE2E8F0),
                      ),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: _latitude != null ? const Color(0xFFDCFCE7) : const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(
                            Icons.pin_drop_rounded,
                            color: _latitude != null ? const Color(0xFF059669) : const Color(0xFF64748B),
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _latitude != null ? 'Coordinates Detected' : 'Pin Customer Doorstep',
                                style: TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w800,
                                  color: _latitude != null ? const Color(0xFF065F46) : const Color(0xFF0F172A),
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                _latitude != null
                                    ? 'GPS: ${_latitude!.toStringAsFixed(5)}, ${_longitude!.toStringAsFixed(5)}'
                                    : 'Select on map for accurate partner delivery route',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: _latitude != null ? const Color(0xFF166534) : const Color(0xFF64748B),
                                ),
                              ),
                            ],
                          ),
                        ),
                        TextButton.icon(
                          onPressed: _showMapLocationSelector,
                          icon: Icon(
                            _latitude != null ? Icons.edit_location_alt_rounded : Icons.map_rounded,
                            size: 14,
                            color: const Color(0xFF059669),
                          ),
                          label: Text(
                            _latitude != null ? 'Change' : 'Pick on Map',
                            style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Color(0xFF059669)),
                          ),
                          style: TextButton.styleFrom(
                            backgroundColor: const Color(0xFFDCFCE7),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // CARD 3: Morning Subscription Plan
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _sectionTitle('Morning Subscription Plan', icon: Icons.local_drink_rounded),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _milkQtyCtrl,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          decoration: _inputDecor(label: 'Daily Milk Qty (L)', hint: '1', icon: Icons.water_drop_outlined),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: _curdQtyCtrl,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          decoration: _inputDecor(label: 'Daily Curd Qty (g)', hint: '0', icon: Icons.breakfast_dining_outlined),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  Row(
                    children: [
                      Expanded(
                        child: InputDecorator(
                          decoration: _inputDecor(label: 'Delivery Frequency', icon: Icons.repeat_rounded),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              isDense: true,
                              isExpanded: true,
                              value: _frequency,
                              items: const [
                                DropdownMenuItem(value: 'daily', child: Text('Daily (Every Day)', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600))),
                                DropdownMenuItem(value: 'alternate', child: Text('Alternate Days', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600))),
                                DropdownMenuItem(value: 'custom', child: Text('Custom Days', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600))),
                              ],
                              onChanged: (val) {
                                if (val != null) setState(() => _frequency = val);
                              },
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: InputDecorator(
                          decoration: _inputDecor(label: 'Assigned Partner', icon: Icons.delivery_dining_rounded),
                          child: Text(
                            widget.partnerName.isNotEmpty ? widget.partnerName : 'Current Partner',
                            style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Color(0xFF059669)),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Live catalog products selector
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Live Catalog Products',
                        style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: Color(0xFF0F172A)),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFECFDF5),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFA7F3D0)),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.bolt, size: 11, color: Color(0xFF059669)),
                            SizedBox(width: 2),
                            Text('Live Store', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: Color(0xFF059669))),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  if (_isLoadingProducts)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.symmetric(vertical: 16),
                        child: CircularProgressIndicator(color: Color(0xFF059669), strokeWidth: 2),
                      ),
                    )
                  else
                    Column(
                      children: _products.map((prod) {
                        final currentQty = _productQuantities[prod.id] ?? 0.0;
                        final isMilk = prod.category.toLowerCase() == 'milk' || prod.name.toLowerCase().contains('milk');
                        final step = isMilk ? 0.5 : 1.0;
                        final presets = isMilk ? [0.5, 1.0, 1.5, 2.0] : [0.0, 1.0, 2.0, 3.0];
                        final unitPrice = prod.numericPrice > 0
                            ? prod.numericPrice
                            : (double.tryParse(prod.price.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 60.0);
                        final itemTotal = (currentQty * unitPrice).toInt();

                        return Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: currentQty > 0 ? const Color(0xFFF0FDF4) : Colors.white,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: currentQty > 0 ? const Color(0xFF86EFAC) : const Color(0xFFE2E8F0),
                              width: currentQty > 0 ? 1.4 : 1.0,
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          prod.name,
                                          style: TextStyle(
                                            fontWeight: FontWeight.w800,
                                            fontSize: 12.5,
                                            color: currentQty > 0 ? const Color(0xFF065F46) : const Color(0xFF0F172A),
                                          ),
                                        ),
                                        Text(
                                          '₹${prod.price} / ${prod.unit}',
                                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 11, color: Color(0xFF059669)),
                                        ),
                                      ],
                                    ),
                                  ),
                                  if (currentQty > 0)
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                      decoration: BoxDecoration(color: const Color(0xFFDCFCE7), borderRadius: BorderRadius.circular(5)),
                                      child: Text('₹$itemTotal', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 11.5, color: Color(0xFF047857))),
                                    ),
                                ],
                              ),
                              const SizedBox(height: 8),

                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Container(
                                    decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(6)),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        InkWell(
                                          onTap: currentQty > 0
                                              ? () => setState(() => _productQuantities[prod.id] = (currentQty - step).clamp(0.0, 50.0))
                                              : null,
                                          child: const Padding(padding: EdgeInsets.all(5), child: Icon(Icons.remove, size: 14)),
                                        ),
                                        Container(
                                          constraints: const BoxConstraints(minWidth: 32),
                                          alignment: Alignment.center,
                                          child: Text(
                                            currentQty > 0
                                                ? (isMilk ? '${currentQty.toStringAsFixed(currentQty.truncateToDouble() == currentQty ? 0 : 1)}L' : '${currentQty.toInt()}')
                                                : '0',
                                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 11.5),
                                          ),
                                        ),
                                        InkWell(
                                          onTap: () => setState(() => _productQuantities[prod.id] = currentQty + step),
                                          child: Container(
                                            padding: const EdgeInsets.all(5),
                                            decoration: BoxDecoration(color: const Color(0xFF059669), borderRadius: BorderRadius.circular(5)),
                                            child: const Icon(Icons.add, size: 14, color: Colors.white),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: presets.map((pVal) {
                                      final isSel = currentQty == pVal;
                                      final label = pVal == 0
                                          ? '0'
                                          : (isMilk ? '${pVal.toStringAsFixed(pVal.truncateToDouble() == pVal ? 0 : 1)}L' : '${pVal.toInt()}x');
                                      return Padding(
                                        padding: const EdgeInsets.only(left: 3),
                                        child: InkWell(
                                          onTap: () => setState(() => _productQuantities[prod.id] = pVal),
                                          child: Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                                            decoration: BoxDecoration(
                                              color: isSel ? const Color(0xFFECFDF5) : Colors.white,
                                              borderRadius: BorderRadius.circular(5),
                                              border: Border.all(color: isSel ? const Color(0xFF059669) : const Color(0xFFCBD5E1)),
                                            ),
                                            child: Text(label, style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: isSel ? const Color(0xFF065F46) : const Color(0xFF475569))),
                                          ),
                                        ),
                                      );
                                    }).toList(),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    ),

                  // Scheduled Products Summary
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFECFDF5),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFA7F3D0)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'DAILY SCHEDULE ESTIMATE (${_selectedProductsList.length} items)',
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 10.5, color: Color(0xFF047857)),
                        ),
                        Text(
                          '₹${_dailyTotalEstimate.toStringAsFixed(0)} / day',
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: Color(0xFF065F46)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // CARD 4: Billing & Ledger Settings
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _sectionTitle('Billing & Ledger Settings', icon: Icons.receipt_long_rounded),
                  Row(
                    children: [
                      Expanded(
                        child: InputDecorator(
                          decoration: _inputDecor(label: 'Billing Type', icon: Icons.account_balance_wallet_outlined),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              isDense: true,
                              isExpanded: true,
                              value: _paymentType,
                              items: const [
                                DropdownMenuItem(value: 'credit', child: Text('Monthly Credit', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
                                DropdownMenuItem(value: 'prepaid', child: Text('Prepaid Advance', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
                                DropdownMenuItem(value: 'cod', child: Text('Cash on Delivery', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
                              ],
                              onChanged: (val) {
                                if (val != null) setState(() => _paymentType = val);
                              },
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: InputDecorator(
                          decoration: _inputDecor(label: 'Settlement Cycle', icon: Icons.calendar_today_outlined),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              isDense: true,
                              isExpanded: true,
                              value: _paymentCycle,
                              items: const [
                                DropdownMenuItem(value: 'monthly', child: Text('Monthly', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
                                DropdownMenuItem(value: 'weekly', child: Text('Weekly', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
                                DropdownMenuItem(value: 'daily', child: Text('Daily', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
                              ],
                              onChanged: (val) {
                                if (val != null) setState(() => _paymentCycle = val);
                              },
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  TextField(
                    controller: _notesCtrl,
                    maxLines: 2,
                    decoration: _inputDecor(label: 'Delivery Instructions / Notes', hint: 'e.g. Ring bell once / leave on doorstep rack', icon: Icons.note_outlined),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // ACTION BUTTONS (Cancel & Submit)
            Row(
              children: [
                Expanded(
                  flex: 2,
                  child: OutlinedButton(
                    onPressed: _isSubmitting ? null : () => Navigator.of(context).pop(),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      side: const BorderSide(color: Color(0xFFCBD5E1)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w700, fontSize: 13.5)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 3,
                  child: ElevatedButton(
                    onPressed: _isSubmitting ? null : _submit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF059669),
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: _isSubmitting
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text(
                            '✓ Save & Add to Route',
                            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Colors.white),
                          ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
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
            Builder(builder: (context) {
              final baseMethod = (stop['paymentMethod'] ?? 'advance').toString().toLowerCase();
              final addonMethod = (stop['addonPaymentMethod'] ?? '').toString().toLowerCase();
              final totalAmt = (num.tryParse((stop['totalAmount'] ?? '0').toString()) ?? 0).toDouble();
              final payAmt = (num.tryParse((stop['paymentAmount'] ?? '0').toString()) ?? 0).toDouble();
              final addonPaidAmt = (num.tryParse((stop['addonPaidAmount'] ?? '0').toString()) ?? 0).toDouble();
              final addonsTotal = (num.tryParse((stop['addonsTotal'] ?? '0').toString()) ?? 0).toDouble();
              final addonsList = stop['addons'] is List ? (stop['addons'] as List) : const [];

              double collectedAmt = 0;
              String collectedMethod = '';
              if (isDone) {
                if (baseMethod == 'cash' || baseMethod == 'upi') {
                  collectedAmt = payAmt > 0 ? payAmt : totalAmt;
                  collectedMethod = baseMethod.toUpperCase();
                } else if (addonMethod == 'cash' || addonMethod == 'upi') {
                  collectedAmt = addonPaidAmt > 0 ? addonPaidAmt : payAmt;
                  collectedMethod = addonMethod.toUpperCase();
                } else if (payAmt > 0) {
                  collectedAmt = payAmt;
                  collectedMethod = baseMethod.toUpperCase();
                }
              }

              return Container(
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
                    if (addonsList.isNotEmpty || addonsTotal > 0) ...[
                      const Divider(height: 20, color: Color(0xFFF1F5F9)),
                      _buildStopDetailRow(
                        'Doorstep Add-ons',
                        '${addonsList.map((a) => '${a['name']} ×${a['quantity']}').join(', ')} (₹${addonsTotal.toInt()})',
                      ),
                    ],
                    const Divider(height: 20, color: Color(0xFFF1F5F9)),
                    _buildStopDetailRow(
                      'Order Total',
                      totalAmt > 0 ? '₹${totalAmt.toInt()}' : (baseMethod == 'advance' ? 'Prepaid Plan' : '₹0'),
                    ),
                    const Divider(height: 20, color: Color(0xFFF1F5F9)),
                    _buildStopDetailRow(
                      'Collected Amount',
                      collectedAmt > 0
                          ? '₹${collectedAmt.toInt()} (${collectedMethod.isNotEmpty ? collectedMethod : 'PAID'})'
                          : (isDone && baseMethod == 'advance' ? 'Prepaid ₹0' : '₹0 Pending'),
                      valueColor: collectedAmt > 0 ? const Color(0xFF059669) : const Color(0xFF64748B),
                    ),
                  ],
                ),
              );
            }),

            // When delivered, display verified photo proof
            if (isDone) ...[
              const SizedBox(height: 24),
              const Text(
                'Doorstep Delivery Photo Proof',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Color(0xFF0F172A)),
              ),
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFBBF7D0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.verified_rounded, size: 16, color: Color(0xFF059669)),
                        const SizedBox(width: 6),
                        const Expanded(
                          child: Text(
                            'Doorstep Proof Verified',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF065F46),
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: const Color(0xFF86EFAC)),
                          ),
                          child: const Text(
                            'Completed',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF059669),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    if ((stop['proofImage'] ?? stop['proofUrl'] ?? '').toString().isNotEmpty) ...[
                      GestureDetector(
                        onTap: () => DeliveryProofHelper.showLightbox(
                          context: context,
                          proofStr: (stop['proofImage'] ?? stop['proofUrl'] ?? '').toString(),
                          customerName: name,
                          address: address,
                          lat: num.tryParse((stop['customerLatitude'] ?? stop['latitude'])?.toString() ?? ''),
                          lng: num.tryParse((stop['customerLongitude'] ?? stop['longitude'])?.toString() ?? ''),
                          timestamp: stop['deliveredAt']?.toString() ?? (stop['deliveryDate'] != null ? '${stop['deliveryDate']} • Morning Drop' : null),
                          partnerName: stop['deliveryBoyName']?.toString() ?? stop['driverName']?.toString() ?? context.read<AuthProvider>().user?.name ?? 'Delivery Partner',
                        ),
                        child: Stack(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                width: double.infinity,
                                height: 180,
                                color: const Color(0xFFE2E8F0),
                                child: DeliveryProofHelper.buildImageFromSource(
                                  (stop['proofImage'] ?? stop['proofUrl'] ?? '').toString(),
                                  fit: BoxFit.cover,
                                ),
                              ),
                            ),
                            Positioned(
                              bottom: 8,
                              right: 8,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                decoration: BoxDecoration(
                                  color: Colors.black.withValues(alpha: 0.7),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.zoom_in_rounded, size: 14, color: Colors.white),
                                    SizedBox(width: 4),
                                    Text(
                                      'Tap to Zoom',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Center(
                        child: Text(
                          'Tap image to view high-resolution photo proof',
                          style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                        ),
                      ),
                    ] else ...[
                      const Text(
                        'Doorstep drop confirmed & verified with live delivery proof.',
                        style: TextStyle(fontSize: 12, color: Color(0xFF047857), fontWeight: FontWeight.w600),
                      ),
                    ],
                  ],
                ),
              ),
            ],

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

  Widget _buildStopDetailRow(String label, String value, {Color valueColor = const Color(0xFF0F172A)}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
        const SizedBox(width: 12),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.right,
            style: TextStyle(fontSize: 13, color: valueColor, fontWeight: FontWeight.w800),
          ),
        ),
      ],
    );
  }
}

// ============================================================================
// FULL SCREEN PAGE: CUSTOMER ROUTE PROFILE & SUBSCRIPTION EXTENSION
// ============================================================================
class _FullScreenCustomerDetailsPage extends StatefulWidget {
  final Map<String, dynamic> customer;
  final ApiService api;
  final List<Map<String, dynamic>> deliveries;
  final List<Map<String, dynamic>> payments;
  final VoidCallback onCustomerUpdated;
  final void Function(String phone) onCall;
  final void Function(String address) onMap;

  const _FullScreenCustomerDetailsPage({
    required this.customer,
    required this.api,
    this.deliveries = const [],
    this.payments = const [],
    required this.onCustomerUpdated,
    required this.onCall,
    required this.onMap,
  });

  @override
  State<_FullScreenCustomerDetailsPage> createState() => _FullScreenCustomerDetailsPageState();
}

class _FullScreenCustomerDetailsPageState extends State<_FullScreenCustomerDetailsPage> {
  late Map<String, dynamic> _cust;
  bool _isSubmittingExtension = false;
  num _ledgerTotalPaid = 0;
  List<Map<String, dynamic>> _ledgerPayments = [];
  bool _isLoadingLedger = false;

  @override
  void initState() {
    super.initState();
    _cust = Map<String, dynamic>.from(widget.customer);
    _loadCustomerLedger();
  }

  Future<void> _loadCustomerLedger() async {
    final custId = (_cust['id'] ?? _cust['_id'] ?? _cust['customerId'] ?? '').toString();
    if (custId.isEmpty) return;
    if (mounted) setState(() => _isLoadingLedger = true);
    try {
      final res = await widget.api.get('/api/customers/$custId/ledger');
      if (mounted && res['success'] == true) {
        final summary = res['summary'] is Map ? Map<String, dynamic>.from(res['summary'] as Map) : <String, dynamic>{};
        final entries = res['ledger'] is List
            ? (res['ledger'] as List)
                .whereType<Map>()
                .map((e) => Map<String, dynamic>.from(e))
                .where((e) => e['type'] == 'payment')
                .toList()
            : <Map<String, dynamic>>[];
        setState(() {
          _ledgerTotalPaid = num.tryParse((summary['totalPaid'] ?? '0').toString()) ?? 0;
          _ledgerPayments = entries;
        });
      }
    } catch (_) {} finally {
      if (mounted) setState(() => _isLoadingLedger = false);
    }
  }

  String _formatDate(DateTime? dt) {
    if (dt == null) return 'Active / Ongoing';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${dt.day.toString().padLeft(2, '0')} ${months[dt.month - 1]} ${dt.year}';
  }

  void _showExtendSubscriptionSheet() {
    int selectedDays = 30;
    String selectedPayMode = 'cash';
    final plan = _cust['deliveryPlan'] is Map ? _cust['deliveryPlan'] : {};
    final sub = _cust['subscription'] is Map ? _cust['subscription'] : {};
    final subPlan = sub['plan'] is Map ? sub['plan'] : {};
    final num rawMilk = num.tryParse(plan['milkQty']?.toString() ?? '') ?? 0;
    final num rawSubMilk = num.tryParse(subPlan['milkQty']?.toString() ?? sub['milkQty']?.toString() ?? '') ?? 0;
    final num milk = rawMilk > 0 ? rawMilk : (rawSubMilk > 0 ? rawSubMilk : 1);
    final num curd = num.tryParse(plan['curdQty']?.toString() ?? '') ?? 0;
    const num milkPrice = 65;
    final num curdPrice = (curd / 500) * 35;
    final num dailyCost = (milk * milkPrice) + curdPrice;

    final currentEndStr = (sub['endDate'] ?? _cust['subscriptionEnd'] ?? '').toString();
    final currentEnd = DateTime.tryParse(currentEndStr);
    final now = DateTime.now();

    DateTime calculateNewExpiry(int days) {
      final base = (currentEnd != null && currentEnd.isAfter(now)) ? currentEnd : now;
      return base.add(Duration(days: days));
    }

    final amountController = TextEditingController(text: '${(dailyCost * 30).round()}');
    final notesController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (modalCtx, setModalState) {
            final newExpiry = calculateNewExpiry(selectedDays);

            return Container(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(modalCtx).viewInsets.bottom + 20,
                top: 20,
                left: 20,
                right: 20,
              ),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header Bar
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Extend Subscription',
                              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                            ),
                            Text(
                              _cust['name'] ?? 'Customer',
                              style: const TextStyle(fontSize: 13, color: Color(0xFF059669), fontWeight: FontWeight.w700),
                            ),
                          ],
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, color: Color(0xFF64748B)),
                          onPressed: () => Navigator.of(modalCtx).pop(),
                        ),
                      ],
                    ),
                    const Divider(height: 20, color: Color(0xFFF1F5F9)),

                    // Current Expiry Info
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Current Expiry:',
                            style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                          ),
                          Text(
                            _formatDate(currentEnd),
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: (currentEnd != null && currentEnd.isBefore(now)) ? const Color(0xFFDC2626) : const Color(0xFF0F172A),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Extension Duration Pills
                    const Text(
                      'Select Extension Period',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _buildDurationChip(modalCtx, setModalState, 7, '+7 Days', selectedDays, (d) {
                          selectedDays = d;
                          amountController.text = '${(dailyCost * d).round()}';
                        }),
                        _buildDurationChip(modalCtx, setModalState, 15, '+15 Days', selectedDays, (d) {
                          selectedDays = d;
                          amountController.text = '${(dailyCost * d).round()}';
                        }),
                        _buildDurationChip(modalCtx, setModalState, 30, '+30 Days (1 Mo)', selectedDays, (d) {
                          selectedDays = d;
                          amountController.text = '${(dailyCost * d).round()}';
                        }),
                        _buildDurationChip(modalCtx, setModalState, 60, '+60 Days (2 Mo)', selectedDays, (d) {
                          selectedDays = d;
                          amountController.text = '${(dailyCost * d).round()}';
                        }),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // New Expiry Date Live Preview
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFECFDF5),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFBBF7D0)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.event_available_rounded, size: 20, color: Color(0xFF059669)),
                          const SizedBox(width: 10),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'New Extended Expiry Date',
                                style: TextStyle(fontSize: 11, color: Color(0xFF065F46), fontWeight: FontWeight.w700),
                              ),
                              Text(
                                _formatDate(newExpiry),
                                style: const TextStyle(fontSize: 15, color: Color(0xFF059669), fontWeight: FontWeight.w900),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Payment Settlement Mode
                    const Text(
                      'Payment Settlement Method',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFCBD5E1)),
                        color: Colors.white,
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: selectedPayMode,
                          isExpanded: true,
                          items: const [
                            DropdownMenuItem(value: 'cash', child: Text('💵 Cash Collected at Doorstep')),
                            DropdownMenuItem(value: 'upi', child: Text('📱 UPI Collected (GPay / PhonePe)')),
                            DropdownMenuItem(value: 'prepaid', child: Text('💳 Prepaid / Advance (Online Paid)')),
                            DropdownMenuItem(value: 'credit', child: Text('📝 Monthly Bill / Ledger Credit')),
                          ],
                          onChanged: (val) {
                            if (val != null) {
                              setModalState(() => selectedPayMode = val);
                            }
                          },
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Amount Collected Field
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Amount Collected (₹)',
                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                              ),
                              const SizedBox(height: 6),
                              TextField(
                                controller: amountController,
                                keyboardType: TextInputType.number,
                                decoration: InputDecoration(
                                  prefixText: '₹ ',
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Remarks / Notes',
                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                              ),
                              const SizedBox(height: 6),
                              TextField(
                                controller: notesController,
                                decoration: InputDecoration(
                                  hintText: 'e.g. Month renewal',
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 22),

                    // Submit Button
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _isSubmittingExtension
                            ? null
                            : () async {
                                final custId = _cust['id'] ?? _cust['_id'] ?? _cust['customerId'];
                                final collected = num.tryParse(amountController.text) ?? 0;
                                setModalState(() => _isSubmittingExtension = true);
                                setState(() => _isSubmittingExtension = true);

                                try {
                                  final res = await widget.api.post('/api/customers/$custId/extend-subscription', {
                                    'days': selectedDays,
                                    'paymentMethod': selectedPayMode,
                                    'collectedAmount': collected,
                                    'notes': notesController.text.trim(),
                                    'actor': 'Delivery Partner',
                                  });

                                  if (res['success'] == true) {
                                    final newEndStr = res['newEndDate'] ?? newExpiry.toIso8601String();
                                    setState(() {
                                      _cust['subscription'] = {
                                        ...(sub),
                                        'status': 'active',
                                        'endDate': newEndStr,
                                      };
                                      if (res['newBalance'] != null) {
                                        _cust['currentBalance'] = res['newBalance'];
                                      } else if (collected > 0) {
                                        final prev = num.tryParse(_cust['currentBalance']?.toString() ?? '0') ?? 0;
                                        _cust['currentBalance'] = (prev - collected) < 0 ? 0 : (prev - collected);
                                      }
                                      _cust['status'] = 'active';
                                    });

                                    await _loadCustomerLedger();
                                    widget.onCustomerUpdated();
                                    if (modalCtx.mounted) Navigator.of(modalCtx).pop();

                                    if (mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(
                                          content: Text(res['message'] ?? '✓ Subscription extended successfully!'),
                                          backgroundColor: const Color(0xFF059669),
                                        ),
                                      );
                                    }
                                  } else {
                                    if (mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(content: Text(res['message'] ?? 'Failed to extend subscription')),
                                      );
                                    }
                                  }
                                } catch (e) {
                                  if (mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text('Error extending subscription: $e')),
                                    );
                                  }
                                } finally {
                                  if (mounted) {
                                    setState(() => _isSubmittingExtension = false);
                                  }
                                }
                              },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF059669),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: _isSubmittingExtension
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.check_circle_rounded, color: Colors.white, size: 18),
                                  SizedBox(width: 8),
                                  Text(
                                    'Confirm & Extend Subscription',
                                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14),
                                  ),
                                ],
                              ),
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

  Widget _buildDurationChip(
    BuildContext ctx,
    StateSetter setModalState,
    int days,
    String label,
    int selectedDays,
    ValueChanged<int> onSelect,
  ) {
    final isSelected = selectedDays == days;
    return GestureDetector(
      onTap: () {
        setModalState(() => onSelect(days));
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF059669) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: isSelected ? const Color(0xFF059669) : const Color(0xFFCBD5E1)),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12.5,
            fontWeight: FontWeight.w800,
            color: isSelected ? Colors.white : const Color(0xFF334155),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final name = _cust['name'] ?? 'Household Customer';
    final mobile = _cust['mobile'] ?? '';
    final address = _cust['address'] ?? 'Not specified';
    final area = _cust['area'] ?? 'Madhapur';
    final landmark = _cust['landmark'] ?? '';
    final notes = _cust['notes'] ?? '';
    final customerId = _cust['customerId'] ?? _cust['_id'] ?? _cust['id'] ?? '';

    final plan = _cust['deliveryPlan'] is Map ? _cust['deliveryPlan'] : {};
    final sub = _cust['subscription'] is Map ? _cust['subscription'] : {};
    final subPlan = sub['plan'] is Map ? sub['plan'] : {};
    final num rawMilk = num.tryParse(plan['milkQty']?.toString() ?? '') ?? 0;
    final num rawSubMilk = num.tryParse(subPlan['milkQty']?.toString() ?? sub['milkQty']?.toString() ?? '') ?? 0;
    final num milk = rawMilk > 0 ? rawMilk : (rawSubMilk > 0 ? rawSubMilk : 1);
    final num curd = num.tryParse(plan['curdQty']?.toString() ?? '') ?? 0;
    final frequency = plan['frequency'] ?? subPlan['frequency'] ?? 'daily';

    final endDateStr = (sub['endDate'] ?? _cust['subscriptionEnd'] ?? plan['endDate'] ?? '').toString();
    final endDate = DateTime.tryParse(endDateStr);
    final startDateStr = (sub['startDate'] ?? _cust['subscriptionStart'] ?? plan['startDate'] ?? '').toString();
    final startDate = DateTime.tryParse(startDateStr);
    final now = DateTime.now();

    final isExpired = endDate != null && endDate.isBefore(now);
    final daysRemaining = endDate?.difference(now).inDays;
    final balance = num.tryParse(_cust['currentBalance']?.toString() ?? '0') ?? 0;
    final isPaused = _cust['status'] == 'paused';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
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
        actions: [
          IconButton(
            icon: const Icon(Icons.picture_as_pdf_rounded, color: Color(0xFF059669)),
            tooltip: 'Download Customer Statement PDF',
            onPressed: () {
              ReportDownloadSheet.show(
                context,
                role: 'customer',
                customerId: customerId,
                customTitle: '$name Statement',
              );
            },
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Customer Identity Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: [
                  BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 6, offset: const Offset(0, 2)),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: isExpired ? const Color(0xFFDC2626) : const Color(0xFF059669),
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        name.isNotEmpty ? name[0].toUpperCase() : 'C',
                        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 24, color: Colors.white),
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
                        Text('ID: #$customerId', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            const Icon(Icons.location_on, size: 13, color: Color(0xFF059669)),
                            const SizedBox(width: 3),
                            Expanded(
                              child: Text(area, style: const TextStyle(fontSize: 12, color: Color(0xFF059669), fontWeight: FontWeight.w700), overflow: TextOverflow.ellipsis),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: isPaused
                          ? const Color(0xFFFEF3C7)
                          : (isExpired ? const Color(0xFFFEF2F2) : const Color(0xFFECFDF5)),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isPaused
                            ? const Color(0xFFFDE68A)
                            : (isExpired ? const Color(0xFFFECACA) : const Color(0xFFBBF7D0)),
                      ),
                    ),
                    child: Text(
                      isPaused ? '⏸ Paused' : (isExpired ? '⚠️ Expired' : '✓ Active'),
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w800,
                        color: isPaused
                            ? const Color(0xFFB45309)
                            : (isExpired ? const Color(0xFFDC2626) : const Color(0xFF059669)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // 2. Quick Action Buttons Row
            Row(
              children: [
                if (mobile.isNotEmpty)
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.phone, size: 16, color: Color(0xFF059669)),
                      label: const Text('Call', style: TextStyle(color: Color(0xFF059669), fontWeight: FontWeight.w800, fontSize: 12)),
                      onPressed: () => widget.onCall(mobile),
                      style: OutlinedButton.styleFrom(
                        backgroundColor: const Color(0xFFECFDF5),
                        side: const BorderSide(color: Color(0xFFBBF7D0)),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                if (mobile.isNotEmpty) const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.navigation, size: 16, color: Color(0xFF2563EB)),
                    label: const Text('Map', style: TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.w800, fontSize: 12)),
                    onPressed: () => widget.onMap(address),
                    style: OutlinedButton.styleFrom(
                      backgroundColor: const Color(0xFFEFF6FF),
                      side: const BorderSide(color: Color(0xFFBFDBFE)),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.update_rounded, size: 16, color: Colors.white),
                    label: const Text('Extend', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 12)),
                    onPressed: _showExtendSubscriptionSheet,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF059669),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // 2b. Download Customer Statement PDF Card
            InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: () {
                ReportDownloadSheet.show(
                  context,
                  role: 'customer',
                  customerId: customerId,
                  customTitle: '$name Statement',
                );
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF0D5C3A), Color(0xFF059669)],
                    begin: Alignment.centerLeft,
                    end: Alignment.centerRight,
                  ),
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF059669).withValues(alpha: 0.22),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.18),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.picture_as_pdf_rounded, color: Colors.white, size: 20),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Download Customer Statement PDF',
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 13.5),
                          ),
                          SizedBox(height: 1),
                          Text(
                            'Weekly, monthly & entire delivery history statement',
                            style: TextStyle(color: Color(0xFFD1FAE5), fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white, size: 14),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // 3. Subscription & Expiry Date Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isExpired ? const Color(0xFFFECACA) : const Color(0xFFE2E8F0),
                ),
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
                            Icon(Icons.calendar_month_rounded, size: 18, color: Color(0xFF059669)),
                            SizedBox(width: 8),
                            Flexible(
                              child: Text(
                                'Plan & Expiry',
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: Color(0xFF0F172A)),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 6),
                      InkWell(
                        onTap: _showExtendSubscriptionSheet,
                        borderRadius: BorderRadius.circular(6),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF0FDF4),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: const Color(0xFFBBF7D0)),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.add, size: 13, color: Color(0xFF059669)),
                              SizedBox(width: 4),
                              Text(
                                'Extend',
                                style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Color(0xFF059669)),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 20, color: Color(0xFFF1F5F9)),

                  // Expiry Date Highlight Row
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isExpired
                          ? const Color(0xFFFEF2F2)
                          : (daysRemaining != null && daysRemaining <= 5 ? const Color(0xFFFFFBEB) : const Color(0xFFF5F3FF)),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: isExpired
                            ? const Color(0xFFFECACA)
                            : (daysRemaining != null && daysRemaining <= 5 ? const Color(0xFFFDE68A) : const Color(0xFFDDD6FE)),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                isExpired ? 'Subscription Expired' : 'Subscription Valid Through',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: isExpired ? const Color(0xFFDC2626) : const Color(0xFF6B21A8),
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                _formatDate(endDate),
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w900,
                                  color: isExpired ? const Color(0xFFDC2626) : const Color(0xFF581C87),
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (daysRemaining != null)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: isExpired ? const Color(0xFFDC2626) : const Color(0xFF7C3AED),
                              ),
                            ),
                            child: Text(
                              isExpired ? '⚠️ Overdue' : '⏳ ${daysRemaining}d left',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                color: isExpired ? const Color(0xFFDC2626) : const Color(0xFF7C3AED),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  _buildCustomerRow('Daily Milk Volume', '${milk}L Farm Fresh Milk'),
                  const Divider(height: 18, color: Color(0xFFF1F5F9)),
                  _buildCustomerRow('Daily Curd Volume', curd > 0 ? '${curd}g Fresh Curd' : 'None'),
                  if (plan['extraProducts'] is List && (plan['extraProducts'] as List).isNotEmpty) ...[
                    for (final ep in (plan['extraProducts'] as List)) ...[
                      const Divider(height: 18, color: Color(0xFFF1F5F9)),
                      _buildCustomerRow(
                        (ep is Map ? ep['name'] : null)?.toString() ?? 'Product',
                        '${ep is Map ? ep['quantity'] : ''} ${(ep is Map ? ep['unit'] : '') ?? ''} ${(ep is Map && ep['price'] != null) ? '(₹${ep['price']})' : ''}',
                      ),
                    ],
                  ],
                  const Divider(height: 18, color: Color(0xFFF1F5F9)),
                  _buildCustomerRow('Delivery Frequency', frequency.toString().toUpperCase()),
                  if (startDate != null) ...[
                    const Divider(height: 18, color: Color(0xFFF1F5F9)),
                    _buildCustomerRow('Plan Started On', _formatDate(startDate)),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),

            // 4. Billing & Overdue Ledger Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: balance > 0 ? const Color(0xFFFECACA) : const Color(0xFFE2E8F0),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.account_balance_wallet_rounded, size: 18, color: Color(0xFF059669)),
                      SizedBox(width: 8),
                      Text('Billing & Overdue Ledger', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14.5, color: Color(0xFF0F172A))),
                    ],
                  ),
                  const Divider(height: 20, color: Color(0xFFF1F5F9)),

                  // Overdue Banner
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: balance > 0 ? const Color(0xFFFEF2F2) : const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: balance > 0 ? const Color(0xFFFECACA) : const Color(0xFFBBF7D0)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Row(
                            children: [
                              Icon(
                                balance > 0 ? Icons.error_outline_rounded : Icons.check_circle_outline_rounded,
                                size: 20,
                                color: balance > 0 ? const Color(0xFFDC2626) : const Color(0xFF059669),
                              ),
                              const SizedBox(width: 8),
                              Flexible(
                                child: Text(
                                  balance > 0 ? 'Overdue Due Amount' : 'Account Status',
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w700,
                                    color: balance > 0 ? const Color(0xFFDC2626) : const Color(0xFF065F46),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          balance > 0 ? '₹${balance.toInt()} Overdue' : '✓ ₹0 Settled',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w900,
                            color: balance > 0 ? const Color(0xFFDC2626) : const Color(0xFF059669),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  _buildCustomerRow('Billing Type', (_cust['paymentInfo'] is Map && _cust['paymentInfo']['paymentType'] == 'prepaid') ? 'PREPAID SUBSCRIPTION' : 'MONTHLY ADVANCE / CREDIT'),
                  const Divider(height: 20, color: Color(0xFFF1F5F9)),
                  Builder(builder: (context) {
                    final custIds = <String>{
                      if (_cust['customerId'] != null) _cust['customerId'].toString(),
                      if (_cust['_id'] != null) _cust['_id'].toString(),
                      if (_cust['id'] != null) _cust['id'].toString(),
                    };
                    final todayDrops = widget.deliveries.where((d) => custIds.contains((d['customerId'] ?? '').toString()) && d['status'] == 'delivered').toList();
                    double todayCash = 0;
                    double todayUpi = 0;
                    for (final d in todayDrops) {
                      final m = (d['paymentMethod'] ?? '').toString().toLowerCase();
                      final am = (d['addonPaymentMethod'] ?? '').toString().toLowerCase();
                      if (m == 'cash') {
                        todayCash += (num.tryParse((d['paymentAmount'] ?? d['totalAmount'] ?? '0').toString()) ?? 0).toDouble();
                      } else if (am == 'cash') {
                        todayCash += (num.tryParse((d['addonPaidAmount'] ?? d['paymentAmount'] ?? '0').toString()) ?? 0).toDouble();
                      }
                      if (m == 'upi') {
                        todayUpi += (num.tryParse((d['paymentAmount'] ?? d['totalAmount'] ?? '0').toString()) ?? 0).toDouble();
                      } else if (am == 'upi') {
                        todayUpi += (num.tryParse((d['addonPaidAmount'] ?? d['paymentAmount'] ?? '0').toString()) ?? 0).toDouble();
                      }
                    }

                    final nowIst = IstDateTime.toIst(DateTime.now());
                    final todayStr = '${nowIst.year}-${nowIst.month.toString().padLeft(2, '0')}-${nowIst.day.toString().padLeft(2, '0')}';
                    final custPays = widget.payments.where((p) => custIds.contains((p['customerId'] ?? '').toString())).toList();
                    for (final p in custPays) {
                      final ref = (p['referenceNumber'] ?? '').toString().toUpperCase();
                      if (ref.contains('DELIVERY-')) continue;
                      final dt = DateTime.tryParse((p['paymentDate'] ?? p['createdAt'] ?? '').toString());
                      if (dt == null) continue;
                      final istDt = IstDateTime.toIst(dt);
                      final pStr = '${istDt.year}-${istDt.month.toString().padLeft(2, '0')}-${istDt.day.toString().padLeft(2, '0')}';
                      if (pStr == todayStr) {
                        final pm = (p['paymentMethod'] ?? '').toString().toLowerCase();
                        final amt = (num.tryParse((p['amount'] ?? '0').toString()) ?? 0).toDouble();
                        if (pm == 'cash') todayCash += amt;
                        if (pm == 'upi') todayUpi += amt;
                      }
                    }

                    final todayTotal = todayCash + todayUpi;
                    final paySum = custPays.fold<double>(0.0, (s, p) => s + (num.tryParse((p['amount'] ?? '0').toString()) ?? 0).toDouble());
                    final allTimePaid = [paySum, _ledgerTotalPaid.toDouble(), todayTotal].reduce((a, b) => a > b ? a : b);

                    return Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFECFDF5),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFBBF7D0)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Collected Today', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF065F46))),
                              Text(
                                todayTotal > 0
                                    ? '₹${todayTotal.toInt()} (${todayCash > 0 ? 'Cash ₹${todayCash.toInt()}' : ''}${todayCash > 0 && todayUpi > 0 ? ' · ' : ''}${todayUpi > 0 ? 'UPI ₹${todayUpi.toInt()}' : ''})'
                                    : '₹0',
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Color(0xFF059669)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Total Collected (All Time)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF475569))),
                              _isLoadingLedger
                                  ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF059669)))
                                  : Text('₹${allTimePaid.toInt()}', style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                            ],
                          ),
                          if (_ledgerPayments.isNotEmpty) ...[
                            const Divider(height: 14, color: Color(0xFFA7F3D0)),
                            ..._ledgerPayments.take(3).map((lp) => Padding(
                              padding: const EdgeInsets.only(bottom: 3),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Text(
                                      '${lp['date'] ?? ''} • ${(lp['paymentMethod'] ?? 'CASH').toString().toUpperCase()}',
                                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF065F46)),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  Text(
                                    '₹${lp['paidAmount'] ?? lp['amount'] ?? 0}',
                                    style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Color(0xFF047857)),
                                  ),
                                ],
                              ),
                            )),
                          ],
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // 5. Delivery Location & Instructions Card
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
                      Icon(Icons.home_work_rounded, size: 18, color: Color(0xFF059669)),
                      SizedBox(width: 8),
                      Text('Doorstep Drop & Instructions', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14.5, color: Color(0xFF0F172A))),
                    ],
                  ),
                  const Divider(height: 20, color: Color(0xFFF1F5F9)),
                  _buildCustomerRow('Doorstep Address', address),
                  if (_cust['latitude'] != null && _cust['longitude'] != null) ...[
                    const Divider(height: 18, color: Color(0xFFF1F5F9)),
                    InkWell(
                      onTap: () {
                        final lat = num.tryParse(_cust['latitude'].toString());
                        final lng = num.tryParse(_cust['longitude'].toString());
                        LauncherService.openMap(lat: lat, lng: lng, address: address);
                      },
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFBFDBFE)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.navigation_rounded, size: 16, color: Color(0xFF2563EB)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'GPS Pin: ${num.tryParse(_cust['latitude'].toString())?.toStringAsFixed(4)}, ${num.tryParse(_cust['longitude'].toString())?.toStringAsFixed(4)} (Tap to Navigate)',
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF1D4ED8)),
                              ),
                            ),
                            const Icon(Icons.open_in_new_rounded, size: 14, color: Color(0xFF2563EB)),
                          ],
                        ),
                      ),
                    ),
                  ],
                  if (landmark.isNotEmpty) ...[
                    const Divider(height: 18, color: Color(0xFFF1F5F9)),
                    _buildCustomerRow('Nearby Landmark', landmark),
                  ],
                  if (notes.isNotEmpty) ...[
                    const Divider(height: 18, color: Color(0xFFF1F5F9)),
                    _buildCustomerRow('Drop Instructions', notes),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 24),

            // 6. Big Action Button to Extend
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                icon: const Icon(Icons.add_task_rounded, color: Colors.white, size: 20),
                label: const Text(
                  'Extend Customer Subscription',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15),
                ),
                onPressed: _showExtendSubscriptionSheet,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF059669),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 2,
                ),
              ),
            ),
            const SizedBox(height: 20),
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
