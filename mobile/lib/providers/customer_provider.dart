import 'dart:async';
import 'package:flutter/foundation.dart';
import '../data/services/api_service.dart';
import '../data/services/realtime_service.dart';

class CustomerProvider extends ChangeNotifier {
  final ApiService _api = ApiService();
  final RealtimeService _realtime = RealtimeService();

  Map<String, dynamic>? _customerData;
  List<Map<String, dynamic>> _deliveries = [];
  List<Map<String, dynamic>> _subscriptions = [];
  Map<String, dynamic>? _ledgerSummary;

  bool _isLoading = false;
  String? _errorMessage;
  DateTime? _lastSyncTime;
  StreamSubscription? _realtimeSubscription;
  Timer? _pollingTimer;

  Map<String, dynamic>? get customerData => _customerData;
  List<Map<String, dynamic>> get deliveries => _deliveries;
  List<Map<String, dynamic>> get subscriptions => _subscriptions;
  Map<String, dynamic>? get ledgerSummary => _ledgerSummary;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  DateTime? get lastSyncTime => _lastSyncTime;

  bool get isPaused {
    final status = _customerData?['status']?.toString().toLowerCase();
    return status == 'paused';
  }

  int get milkQuantity {
    final plan = _customerData?['deliveryPlan'];
    if (plan is Map) {
      return (num.tryParse(plan['milkQty']?.toString() ?? '1') ?? 1).toInt();
    }
    return 1;
  }

  int get curdQuantity {
    final plan = _customerData?['deliveryPlan'];
    if (plan is Map) {
      return (num.tryParse(plan['curdQty']?.toString() ?? '0') ?? 0).toInt();
    }
    return 0;
  }

  String get deliverySlot {
    final plan = _customerData?['deliveryPlan'];
    final freq = plan is Map ? (plan['frequency']?.toString() ?? 'daily') : 'daily';
    return freq == 'alternate' ? 'Alternate Days · 5:00 AM' : 'Daily Morning · 5:00 AM – 6:30 AM';
  }

  String get deliveryBoyName {
    final plan = _customerData?['deliveryPlan'];
    if (plan is Map && plan['deliveryBoyName'] != null && plan['deliveryBoyName'].toString().isNotEmpty) {
      return plan['deliveryBoyName'].toString();
    }
    return 'Assigned Dairy Partner';
  }

  num get currentBalance {
    final bal = _customerData?['currentBalance'];
    if (bal is num) return bal;
    return num.tryParse(bal?.toString() ?? '0') ?? 0;
  }

  CustomerProvider() {
    _initRealtime();
    _startPolling();
  }

  void _initRealtime() {
    _realtimeSubscription = _realtime.eventStream.listen((event) {
      final type = event['type']?.toString();
      debugPrint('⚡ CustomerProvider received real-time event: $type');
      if (type == 'DELIVERY_UPDATED' ||
          type == 'CUSTOMER_UPDATED' ||
          type == 'SUBSCRIPTION_UPDATED' ||
          type == 'PAYMENT_RECORDED') {
        loadAllCustomerData(silent: true);
      }
    });
  }

  void _startPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      loadAllCustomerData(silent: true);
    });
  }

  Future<void> loadAllCustomerData({bool silent = false}) async {
    final hasToken = _api.token != null && _api.token!.isNotEmpty;

    if (!silent) {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
    }

    try {
      if (hasToken) {
        await Future.wait([
          _loadCustomerProfile(),
          _loadLedger(),
          _loadSubscriptions(),
        ]);
      } else {
        await _loadPublicRecentProofs();
      }
      _lastSyncTime = DateTime.now();
    } catch (e) {
      debugPrint('Error loading customer real-time data: $e');
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> _loadPublicRecentProofs() async {
    try {
      final res = await _api.get('/api/deliveries/recent-proofs');
      if (res['success'] == true && res['deliveries'] is List) {
        final entries = (res['deliveries'] as List)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
        entries.sort((a, b) {
          final dateA = a['date']?.toString() ?? '';
          final dateB = b['date']?.toString() ?? '';
          return dateB.compareTo(dateA);
        });
        _deliveries = entries;
      }
    } catch (e) {
      debugPrint('Error loading public recent proofs: $e');
    }
  }

  Future<void> _loadCustomerProfile() async {
    try {
      final res = await _api.get('/api/customers/me');
      if (res['success'] == true && res['customer'] != null) {
        _customerData = Map<String, dynamic>.from(res['customer']);
      }
    } catch (e) {
      debugPrint('Error fetching customer profile: $e');
    }
  }

  Future<void> _loadLedger() async {
    try {
      final res = await _api.get('/api/customers/me/ledger');
      if (res['success'] == true) {
        if (res['ledgerEntries'] is List) {
          final entries = (res['ledgerEntries'] as List)
              .map((e) => Map<String, dynamic>.from(e as Map))
              .toList();
          entries.sort((a, b) {
            final dateA = a['date']?.toString() ?? '';
            final dateB = b['date']?.toString() ?? '';
            return dateB.compareTo(dateA);
          });
          _deliveries = entries;
        }
        _ledgerSummary = {
          'grossBill': res['grossBill'],
          'totalPaid': res['totalPaid'],
          'totalMilkDelivered': res['totalMilkDelivered'],
          'totalCurdDelivered': res['totalCurdDelivered'],
        };
      }
    } catch (e) {
      debugPrint('Error fetching customer ledger: $e');
    }
  }

  Future<void> _loadSubscriptions() async {
    try {
      final res = await _api.get('/api/subscriptions/my');
      if (res['success'] == true && res['subscriptions'] is List) {
        _subscriptions = (res['subscriptions'] as List)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
      }
    } catch (e) {
      debugPrint('Error fetching subscriptions: $e');
    }
  }

  Future<bool> pauseSubscription({String reason = 'Paused via mobile app'}) async {
    _isLoading = true;
    notifyListeners();
    try {
      final res = await _api.post('/api/customers/me/pause', {
        'reason': reason,
        'actor': 'Mobile Customer',
      });
      if (res['success'] == true) {
        await loadAllCustomerData(silent: true);
        return true;
      }
    } catch (e) {
      debugPrint('Failed to pause subscription: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return false;
  }

  Future<bool> resumeSubscription() async {
    _isLoading = true;
    notifyListeners();
    try {
      final res = await _api.post('/api/customers/me/resume', {
        'actor': 'Mobile Customer',
      });
      if (res['success'] == true) {
        await loadAllCustomerData(silent: true);
        return true;
      }
    } catch (e) {
      debugPrint('Failed to resume subscription: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return false;
  }

  @override
  void dispose() {
    _realtimeSubscription?.cancel();
    _pollingTimer?.cancel();
    super.dispose();
  }
}
