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
  List<Map<String, dynamic>> _subscriptionsHistory = [];
  Map<String, dynamic>? _ledgerSummary;

  bool _isLoading = false;
  String? _errorMessage;
  DateTime? _lastSyncTime;
  StreamSubscription? _realtimeSubscription;
  Timer? _pollingTimer;

  Map<String, dynamic>? get customerData => _customerData;
  Map<String, dynamic>? get customer => _customerData;
  List<Map<String, dynamic>> get deliveries => _deliveries;
  List<Map<String, dynamic>> get subscriptions => _subscriptions;
  List<Map<String, dynamic>> get subscriptionsHistory => _subscriptionsHistory;
  Map<String, dynamic>? get ledgerSummary => _ledgerSummary;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  DateTime? get lastSyncTime => _lastSyncTime;

  String get name => _customerData?['name']?.toString() ?? '';
  String get mobile => _customerData?['mobile']?.toString() ?? '';
  String get address => _customerData?['address']?.toString() ?? '';
  String get area => _customerData?['area']?.toString() ?? '';
  String get landmark => _customerData?['landmark']?.toString() ?? '';

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

  String get frequency {
    final plan = _customerData?['deliveryPlan'];
    return plan is Map ? (plan['frequency']?.toString() ?? 'daily') : 'daily';
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

  DateTime? get subscriptionEndDate {
    final sub = _customerData?['subscription'];
    dynamic rawDate = (sub is Map) ? sub['endDate'] : null;
    if (rawDate == null && _subscriptionsHistory.isNotEmpty) {
      rawDate = _subscriptionsHistory.first['endDate'];
    }
    if (rawDate == null && _subscriptions.isNotEmpty) {
      rawDate = _subscriptions.first['endDate'];
    }
    if (rawDate != null) {
      try {
        return DateTime.parse(rawDate.toString()).toLocal();
      } catch (_) {}
    }
    return null;
  }

  DateTime? get subscriptionStartDate {
    final sub = _customerData?['subscription'];
    dynamic rawDate = (sub is Map) ? sub['startDate'] : null;
    if (rawDate == null && _subscriptionsHistory.isNotEmpty) {
      rawDate = _subscriptionsHistory.first['startDate'];
    }
    if (rawDate == null && _subscriptions.isNotEmpty) {
      rawDate = _subscriptions.first['startDate'];
    }
    if (rawDate != null) {
      try {
        return DateTime.parse(rawDate.toString()).toLocal();
      } catch (_) {}
    }
    return null;
  }

  int get subscriptionDaysRemaining {
    final end = subscriptionEndDate;
    if (end == null) {
      return 30;
    }
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final target = DateTime(end.year, end.month, end.day);
    return target.difference(today).inDays;
  }

  bool get isSubscriptionExpired {
    final end = subscriptionEndDate;
    if (end == null) return false;
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final target = DateTime(end.year, end.month, end.day);
    return target.isBefore(today);
  }

  String get formattedExpiryDate {
    final end = subscriptionEndDate ?? DateTime.now().add(const Duration(days: 30));
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${end.day.toString().padLeft(2, '0')} ${months[end.month - 1]} ${end.year}';
  }

  String get formattedStartDate {
    final start = subscriptionStartDate ?? DateTime.now().subtract(const Duration(days: 0));
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${start.day.toString().padLeft(2, '0')} ${months[start.month - 1]} ${start.year}';
  }

  List<Map<String, dynamic>> get extraProducts {
    final plan = _customerData?['deliveryPlan'];
    if (plan is Map && plan['extraProducts'] is List) {
      return (plan['extraProducts'] as List)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
    }
    return [];
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
          type == 'PAYMENT_RECORDED') {
        loadAllCustomerData(silent: true);
      } else if (type == 'SUBSCRIPTION_UPDATED') {
        fetchSubscriptionHistory();
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
          fetchSubscriptionHistory(),
        ]);
      } else {
        await Future.wait([
          _loadPublicRecentProofs(),
          fetchSubscriptionHistory(),
        ]);
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

  Future<void> fetchSubscriptionHistory() async {
    try {
      final m = mobile;
      final endpoint = m.isNotEmpty
          ? '/api/customers/me/subscriptions?mobile=${Uri.encodeComponent(m)}'
          : '/api/customers/me/subscriptions';
      final res = await _api.get(endpoint);
      if (res['success'] == true && res['subscriptions'] is List) {
        _subscriptionsHistory = (res['subscriptions'] as List)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Error fetching subscription history: $e');
    }
  }

  Future<Map<String, dynamic>?> createSubscriptionOrder({
    required num milkQty,
    int curdQty = 0,
    String frequency = 'daily',
    String purpose = 'new',
    int days = 30,
    String milkType = '',
    String planName = '',
    required String address,
    required String area,
    String landmark = '',
    String mobile = '',
    String customerName = '',
    List<Map<String, dynamic>> extraProducts = const [],
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final effectiveMobile = mobile.isNotEmpty ? mobile : this.mobile;
      final effectiveName = customerName.isNotEmpty ? customerName : name;
      final payload = {
        'purpose': purpose,
        if (days > 0) 'days': days,
        if (milkType.isNotEmpty) 'milkType': milkType,
        if (planName.isNotEmpty) 'planName': planName,
        'milkQty': milkQty,
        'curdQty': curdQty,
        if (extraProducts.isNotEmpty) 'extraProducts': extraProducts,
        'frequency': frequency,
        'address': address,
        'area': area,
        'landmark': landmark,
        if (effectiveMobile.isNotEmpty) 'mobile': effectiveMobile,
        if (effectiveName.isNotEmpty) 'customerName': effectiveName,
      };

      final res = await _api.post('/api/customers/me/subscription/order', payload);
      if (res['success'] == true && res['order'] != null) {
        final orderData = Map<String, dynamic>.from(res['order'] as Map);
        return {
          'orderId': orderData['id']?.toString() ?? '',
          'amount': orderData['amount'],
          'currency': orderData['currency']?.toString() ?? 'INR',
          'keyId': orderData['keyId']?.toString() ?? '',
          'subscriptionId': res['subscription']?['id']?.toString() ?? '',
        };
      } else {
        _errorMessage = res['message']?.toString() ?? 'Could not create subscription order';
      }
    } catch (e) {
      debugPrint('createSubscriptionOrder error: $e');
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return null;
  }

  Future<bool> verifySubscriptionPayment({
    required String orderId,
    required String paymentId,
    String signature = '',
    String mobile = '',
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final effectiveMobile = mobile.isNotEmpty ? mobile : this.mobile;
      final effectiveSignature = signature.isNotEmpty ? signature : 'sig_rzp_${DateTime.now().millisecondsSinceEpoch}';
      final res = await _api.post('/api/customers/me/subscription/verify', {
        'razorpay_order_id': orderId,
        'razorpay_payment_id': paymentId,
        'razorpay_signature': effectiveSignature,
        if (effectiveMobile.isNotEmpty) 'mobile': effectiveMobile,
      });

      if (res['success'] == true) {
        await loadAllCustomerData(silent: true);
        await fetchSubscriptionHistory();
        return true;
      } else {
        _errorMessage = res['message']?.toString() ?? 'Payment verification failed.';
      }
    } catch (e) {
      debugPrint('verifySubscriptionPayment error: $e');
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return false;
  }

  Future<bool> failSubscriptionPayment({
    required String orderId,
    String reason = 'Payment cancelled by user',
  }) async {
    try {
      final res = await _api.post('/api/customers/me/subscription/fail', {
        'orderId': orderId,
        'reason': reason,
      });
      if (res['success'] == true) {
        await fetchSubscriptionHistory();
        await loadAllCustomerData(silent: true);
        return true;
      }
    } catch (e) {
      debugPrint('failSubscriptionPayment error: $e');
    }
    return false;
  }

  Future<bool> pauseSubscription({
    String reason = 'Paused via mobile app',
    String? pauseFrom,
    String? pauseUntil,
  }) async {
    _isLoading = true;
    notifyListeners();
    try {
      final res = await _api.post('/api/customers/me/pause', {
        'reason': reason,
        if (pauseFrom != null && pauseFrom.isNotEmpty) 'pauseFrom': pauseFrom,
        if (pauseUntil != null && pauseUntil.isNotEmpty) 'pauseUntil': pauseUntil,
        'actor': 'Mobile Customer App',
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

  Future<bool> setTemporaryQty({
    required String date,
    required double milkQty,
    required int curdQty,
  }) async {
    _isLoading = true;
    notifyListeners();
    try {
      final res = await _api.post('/api/customers/me/temp-qty', {
        'date': date,
        'milkQty': milkQty,
        'curdQty': curdQty,
        'actor': 'Mobile Customer App',
      });
      if (res['success'] == true) {
        await loadAllCustomerData(silent: true);
        return true;
      }
    } catch (e) {
      debugPrint('Failed to set temporary quantity: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return false;
  }

  Future<bool> updateDeliveryAddress({
    required String address,
    String area = '',
    String landmark = '',
  }) async {
    _isLoading = true;
    notifyListeners();
    try {
      final res = await _api.put('/api/customers/me/profile', {
        'name': name.isNotEmpty ? name : 'Customer',
        'mobile': mobile.isNotEmpty ? mobile : '9999999999',
        'address': address,
        'area': area,
        'landmark': landmark,
      });
      if (res['success'] == true) {
        await loadAllCustomerData(silent: true);
        return true;
      }
    } catch (e) {
      debugPrint('Failed to update address: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return false;
  }

  Future<bool> stopSubscription({String reason = 'Subscription cancelled by customer'}) async {
    return pauseSubscription(reason: reason);
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

  Future<bool> createSubscription({
    required double milkQty,
    int curdQty = 0,
    String frequency = 'daily',
    String planName = 'Daily Farm Pure Milk Plan',
    String milkType = 'Pure A2 Cow Milk',
    String customerName = '',
    String mobile = '',
    String address = '',
    String area = '',
    String landmark = '',
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final res = await _api.post('/api/customers/me/upgrade-plan', {
        'milkQty': milkQty,
        'curdQty': curdQty,
        'frequency': frequency,
        'planName': planName,
        'milkType': milkType,
        if (customerName.isNotEmpty) 'name': customerName,
        if (mobile.isNotEmpty) 'mobile': mobile,
        'address': address,
        'area': area,
        'landmark': landmark,
        'actor': 'Mobile Customer App',
      });
      if (res['success'] == true) {
        await loadAllCustomerData(silent: true);
        return true;
      } else {
        _errorMessage = res['message']?.toString() ?? 'Failed to save subscription';
      }
    } catch (e) {
      debugPrint('Failed to create subscription: $e');
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return false;
  }

  Future<bool> upgradePlan({
    required int milkQty,
    int curdQty = 0,
    String frequency = 'daily',
    String planName = 'Daily Farm Pure Milk Plan',
    String milkType = 'Pure A2 Cow Milk',
  }) async {
    _isLoading = true;
    notifyListeners();
    try {
      final res = await _api.post('/api/customers/me/upgrade-plan', {
        'milkQty': milkQty,
        'curdQty': curdQty,
        'frequency': frequency,
        'planName': planName,
        'milkType': milkType,
        'actor': 'Mobile Customer',
      });
      if (res['success'] == true) {
        await loadAllCustomerData(silent: true);
        return true;
      }
    } catch (e) {
      debugPrint('Failed to upgrade plan: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return false;
  }

  Future<bool> extendSubscription({int days = 30}) async {
    _isLoading = true;
    notifyListeners();
    try {
      final res = await _api.post('/api/customers/me/extend-subscription', {
        'days': days,
        'actor': 'Mobile Customer',
      });
      if (res['success'] == true) {
        await loadAllCustomerData(silent: true);
        return true;
      }
    } catch (e) {
      debugPrint('Failed to extend subscription: $e');
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

