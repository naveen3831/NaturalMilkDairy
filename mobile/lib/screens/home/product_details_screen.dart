import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:natural_milk_dairy/data/models/product_model.dart';
import 'package:natural_milk_dairy/providers/auth_provider.dart';
import 'package:natural_milk_dairy/providers/customer_provider.dart';
import 'contact_support_screen.dart';
import 'select_location_map_screen.dart';
import '../auth/login_screen.dart';

class ProductDetailsScreen extends StatefulWidget {
  final ProductModel? product;
  final double? initialQty;
  final int? initialCurd;
  final String? initialFrequency;

  const ProductDetailsScreen({
    super.key,
    this.product,
    this.initialQty,
    this.initialCurd,
    this.initialFrequency,
  });

  @override
  State<ProductDetailsScreen> createState() => _ProductDetailsScreenState();
}

class _ProductDetailsScreenState extends State<ProductDetailsScreen> {
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _addressController;
  late TextEditingController _landmarkController;
  late TextEditingController _mobileController;
  late TextEditingController _nameController;

  late double _selectedMilkQty;
  int _selectedCurdQty = 0;
  String _orderFrequency = 'subscription'; // 'one_time' or 'subscription'
  String _subscriptionSchedule = 'daily'; // 'daily', 'alternate', 'selected', 'weekends'
  String _alternateSchedule = 'tomorrow'; // 'tomorrow' or 'day_after'
  String _oneTimeDay = 'tomorrow'; // 'tomorrow' or 'weekend'

  static const List<String> _areas = [
    'Madhapur',
    'Gachibowli',
    'Hitec City',
    'Kondapur',
    'Jubilee Hills',
    'Banjara Hills',
    'Financial District',
    'Kukatpally',
    'Manikonda',
    'Miyapur',
  ];
  String _selectedArea = 'Madhapur';
  num? _selectedLat;
  num? _selectedLng;

  bool _isSubmitting = false;
  String _errorMessage = '';
  bool _isSuccess = false;
  DateTime? _endDate;

  List<String> get _allAvailableAreas {
    if (!_areas.contains(_selectedArea)) {
      return [_selectedArea, ..._areas];
    }
    return _areas;
  }

  ProductModel get _effectiveProduct {
    if (widget.product != null && widget.product!.name.isNotEmpty) {
      return widget.product!;
    }
    return ProductModel(
      id: 'p1',
      name: 'Farm Fresh Cow Milk 1L',
      price: '₹60',
      numericPrice: 60,
      unit: '1 L',
      category: 'milk',
      imageUrl: 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1794545628/natural-milk-dairy/assets/cow_milk_1l.png',
      description: 'Freshly milked pure organic cow milk chilled to 4°C.',
    );
  }

  double get _unitPrice {
    final p = _effectiveProduct;
    if (p.numericPrice > 0) return p.numericPrice;
    final parsed = double.tryParse(p.price.replaceAll(RegExp(r'[^0-9.]'), ''));
    return parsed ?? 60.0;
  }

  int get _dailyCost {
    final milkCost = (_selectedMilkQty * _unitPrice).round();
    final curdCost = ((_selectedCurdQty / 500) * 30).round();
    return milkCost + curdCost;
  }

  int get _dropsCount {
    if (_orderFrequency == 'one_time') return 1;
    if (_subscriptionSchedule == 'alternate') return 15;
    if (_subscriptionSchedule == 'selected' || _subscriptionSchedule == 'weekdays') return 22;
    if (_subscriptionSchedule == 'weekends') return 8;
    return 30; // daily
  }

  int get _totalAmount => _dailyCost * _dropsCount;

  @override
  void initState() {
    super.initState();
    _selectedMilkQty = widget.initialQty ?? 1.0;
    _selectedCurdQty = widget.initialCurd ?? 0;

    if (widget.initialFrequency == 'once' || widget.initialFrequency == 'single' || widget.initialFrequency == 'one_time') {
      _orderFrequency = 'one_time';
      _subscriptionSchedule = 'daily';
    } else if (widget.initialFrequency == 'alternate') {
      _orderFrequency = 'subscription';
      _subscriptionSchedule = 'alternate';
    } else if (widget.initialFrequency == 'selected' || widget.initialFrequency == 'weekdays') {
      _orderFrequency = 'subscription';
      _subscriptionSchedule = 'selected';
    } else if (widget.initialFrequency == 'weekends' || widget.initialFrequency == 'weekend') {
      _orderFrequency = 'subscription';
      _subscriptionSchedule = 'weekends';
    } else {
      _orderFrequency = 'subscription';
      _subscriptionSchedule = 'daily';
    }

    _nameController = TextEditingController();
    _mobileController = TextEditingController();
    _addressController = TextEditingController();
    _landmarkController = TextEditingController();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = context.read<AuthProvider>();
      final cp = context.read<CustomerProvider>();
      final prof = cp.customerData;
      final u = auth.user;

      _nameController.text = prof?['name']?.toString() ?? u?.name ?? '';
      _mobileController.text = prof?['mobile']?.toString() ?? u?.mobile ?? '';
      _addressController.text = prof?['address']?.toString() ?? u?.address ?? '';
      _landmarkController.text = prof?['landmark']?.toString() ?? '';

      final areaStr = prof?['area']?.toString() ?? '';
      if (areaStr.isNotEmpty) {
        final match = _areas.firstWhere(
          (a) => a.toLowerCase() == areaStr.toLowerCase(),
          orElse: () => areaStr,
        );
        setState(() => _selectedArea = match);
      }
      if (prof?['latitude'] != null) {
        setState(() {
          _selectedLat = prof!['latitude'] as num?;
          _selectedLng = prof['longitude'] as num?;
        });
      }
    });
  }

  @override
  void dispose() {
    _addressController.dispose();
    _landmarkController.dispose();
    _mobileController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _openLeafletMapSelector() async {
    final result = await Navigator.push<Map<String, dynamic>>(
      context,
      MaterialPageRoute(
        builder: (_) => SelectLocationMapScreen(
          initialLat: _selectedLat?.toDouble() ?? 17.4483,
          initialLng: _selectedLng?.toDouble() ?? 78.3915,
          initialArea: _selectedArea,
        ),
      ),
    );

    if (result != null && mounted) {
      final lat = result['latitude'] as num? ?? 17.4483;
      final lng = result['longitude'] as num? ?? 78.3915;
      final area = result['area']?.toString() ?? _selectedArea;
      final addressSnippet = result['address']?.toString() ?? '';

      setState(() {
        _selectedLat = lat;
        _selectedLng = lng;
        if (addressSnippet.isNotEmpty) {
          _addressController.text = addressSnippet;
        }
        if (area.isNotEmpty) {
          final matched = _areas.firstWhere(
            (a) => a.toLowerCase() == area.toLowerCase() || area.toLowerCase().contains(a.toLowerCase()),
            orElse: () => area,
          );
          _selectedArea = matched;
        }
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('📍 Delivery pin set at ${result['placeTitle'] ?? _selectedArea}!'),
          backgroundColor: const Color(0xFF0D5C3A),
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _handleConfirmSubscription() async {
    final auth = context.read<AuthProvider>();
    final isGuest = auth.user == null || auth.user?.isGuest == true;

    if (isGuest) {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );
      return;
    }

    if (!_formKey.currentState!.validate()) return;
    if (_addressController.text.trim().isEmpty) {
      setState(() => _errorMessage = 'Please enter your complete doorstep delivery address.');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = '';
    });

    try {
      final bool isOneTime = _orderFrequency == 'one_time';
      final String freq = isOneTime ? 'once' : _subscriptionSchedule;
      final dynamic cp = context.read<CustomerProvider>();

      final dynamic orderRes = await cp.createSubscriptionOrder(
        milkQty: _selectedMilkQty,
        curdQty: _selectedCurdQty,
        frequency: freq,
        alternateSchedule: _alternateSchedule,
        purpose: isOneTime ? 'one_time' : 'new',
        days: isOneTime ? 1 : 30,
        address: _addressController.text.trim(),
        area: _selectedArea,
        landmark: _landmarkController.text.trim(),
        mobile: _mobileController.text.trim(),
        customerName: _nameController.text.trim(),
        latitude: _selectedLat,
        longitude: _selectedLng,
      );

      if (!mounted) return;
      setState(() => _isSubmitting = false);

      if (orderRes != null && orderRes['orderId'] != null) {
        _openRazorpayModalSheet(orderRes);
      } else {
        setState(() {
          _errorMessage = cp.errorMessage ??
              'Unable to initiate Razorpay subscription order. Please try again.';
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = 'Error: $e';
        _isSubmitting = false;
      });
    }
  }

  void _openRazorpayModalSheet(Map<String, dynamic> orderRes) {
    final String orderId = orderRes['orderId']?.toString() ?? 'order_${DateTime.now().millisecondsSinceEpoch}';
    final int amount = _totalAmount;
    String selectedMethod = 'upi';
    bool isProcessing = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: SafeArea(
                top: false,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Header with Razorpay Branding
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                      decoration: const BoxDecoration(
                        color: Color(0xFF072654),
                        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
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
                                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF0C2340),
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(color: const Color(0xFF3399CC), width: 1),
                                    ),
                                    child: const Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(Icons.bolt, color: Color(0xFF3399CC), size: 14),
                                        SizedBox(width: 3),
                                        Text(
                                          'Razorpay',
                                          style: TextStyle(
                                            color: Colors.white,
                                            fontWeight: FontWeight.w900,
                                            fontSize: 12,
                                            letterSpacing: 0.5,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  const Text(
                                    'Trusted Business',
                                    style: TextStyle(
                                      color: Color(0xFF94A3B8),
                                      fontSize: 11,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.lock_rounded, color: Color(0xFF4ADE80), size: 12),
                                    SizedBox(width: 4),
                                    Text(
                                      '100% Secure',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 10.5,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'NATURAL MILK DAIRY',
                                    style: TextStyle(
                                      color: Color(0xFF38BDF8),
                                      fontSize: 10,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: 0.8,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    _orderFrequency == 'one_time' ? 'One-Time Milk Order' : '30-Day Milk Delivery Plan',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                              Text(
                                '₹$amount',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 22,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    // Payment Method Options
                    Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'PREFERRED PAYMENT METHOD',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF64748B),
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(height: 12),

                          _buildPaymentTile(
                            id: 'upi',
                            title: 'UPI (Google Pay, PhonePe, Paytm)',
                            subtitle: 'Instant approval • Zero transaction fees',
                            icon: Icons.qr_code_rounded,
                            selected: selectedMethod == 'upi',
                            onTap: () => setModalState(() => selectedMethod = 'upi'),
                          ),
                          const SizedBox(height: 10),
                          _buildPaymentTile(
                            id: 'card',
                            title: 'Credit / Debit Card',
                            subtitle: 'Visa, Mastercard, RuPay',
                            icon: Icons.credit_card_rounded,
                            selected: selectedMethod == 'card',
                            onTap: () => setModalState(() => selectedMethod = 'card'),
                          ),
                          const SizedBox(height: 10),
                          _buildPaymentTile(
                            id: 'netbanking',
                            title: 'Net Banking',
                            subtitle: 'All major Indian banks supported',
                            icon: Icons.account_balance_rounded,
                            selected: selectedMethod == 'netbanking',
                            onTap: () => setModalState(() => selectedMethod = 'netbanking'),
                          ),

                          const SizedBox(height: 20),

                          SizedBox(
                            width: double.infinity,
                            height: 48,
                            child: ElevatedButton(
                              onPressed: isProcessing
                                  ? null
                                  : () async {
                                      setModalState(() => isProcessing = true);
                                      final fakePaymentId = 'pay_${DateTime.now().millisecondsSinceEpoch}_${selectedMethod.toUpperCase()}';
                                      try {
                                        final dynamic cp = context.read<CustomerProvider>();
                                        final dynamic okRes = await cp.verifySubscriptionPayment(
                                          razorpayOrderId: orderId,
                                          razorpayPaymentId: fakePaymentId,
                                          razorpaySignature: 'sig_mock_verified',
                                          mobile: _mobileController.text.trim(),
                                        );

                                        if (!context.mounted) return;
                                        Navigator.pop(sheetContext);

                                        if (okRes != null && okRes['success'] == true) {
                                          final dynamic subData = okRes['subscription'];
                                          DateTime? end;
                                          if (subData != null && subData['endDate'] != null) {
                                            end = DateTime.tryParse(subData['endDate'].toString());
                                          }
                                          setState(() {
                                            _isSuccess = true;
                                            _endDate = end;
                                          });
                                          cp.loadAllCustomerData(silent: true);
                                        } else {
                                          setState(() {
                                            _errorMessage = okRes?['message']?.toString() ??
                                                'Payment verification pending. Please contact dairy support.';
                                          });
                                        }
                                      } catch (err) {
                                        if (context.mounted) {
                                          Navigator.pop(sheetContext);
                                          setState(() => _errorMessage = 'Payment error: $err');
                                        }
                                      }
                                    },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF0D5C3A),
                                foregroundColor: Colors.white,
                                elevation: 0,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              ),
                              child: isProcessing
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                    )
                                  : Text(
                                      'Pay ₹$amount via ${selectedMethod.toUpperCase()}',
                                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
                                    ),
                            ),
                          ),
                          const SizedBox(height: 10),
                          const Center(
                            child: Text(
                              'Powered by Razorpay India • Safe & Certified',
                              style: TextStyle(fontSize: 10, color: Color(0xFF94A3B8), fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
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

  Widget _buildPaymentTile({
    required String id,
    required String title,
    required String subtitle,
    required IconData icon,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFFF0FDF4) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? const Color(0xFF0D5C3A) : const Color(0xFFE2E8F0),
            width: selected ? 1.6 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: selected ? const Color(0xFF0D5C3A) : const Color(0xFFF1F5F9),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 16, color: selected ? Colors.white : const Color(0xFF64748B)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: selected ? FontWeight.w900 : FontWeight.w700,
                      color: const Color(0xFF0C2340),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B)),
                  ),
                ],
              ),
            ),
            if (selected)
              const Icon(Icons.check_circle_rounded, color: Color(0xFF0D5C3A), size: 18),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = _effectiveProduct;
    final displayImageUrl = ProductModel.resolveImageUrl(p.imageUrl, p.name, p.category);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAF8),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: true,
        leading: Padding(
          padding: const EdgeInsets.only(left: 14.0),
          child: Center(
            child: InkWell(
              onTap: () => Navigator.pop(context),
              borderRadius: BorderRadius.circular(30),
              child: Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: const Color(0xFFF3F7F4),
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFFE2EBE5), width: 1),
                ),
                child: const Icon(Icons.arrow_back_rounded, color: Color(0xFF0D5C3A), size: 20),
              ),
            ),
          ),
        ),
        title: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _orderFrequency == 'one_time' ? 'Single Milk Order' : 'Morning Milk Delivery',
              style: const TextStyle(
                color: Color(0xFF0C2340),
                fontWeight: FontWeight.w900,
                fontSize: 16,
                letterSpacing: -0.2,
              ),
            ),
            const SizedBox(height: 2),
            FittedBox(
              fit: BoxFit.scaleDown,
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
                  Text(
                    _orderFrequency == 'one_time'
                        ? '1-Day Drop • Doorstep by 6:30 AM'
                        : 'Prepaid 30-Day Plan • By 6:30 AM',
                    style: const TextStyle(
                      color: Color(0xFF6B7280),
                      fontSize: 10.5,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 14.0),
            child: Center(
              child: InkWell(
                onTap: () => Navigator.pop(context),
                borderRadius: BorderRadius.circular(30),
                child: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF3F7F4),
                    shape: BoxShape.circle,
                    border: Border.all(color: const Color(0xFFE2EBE5), width: 1),
                  ),
                  child: const Icon(Icons.close_rounded, color: Color(0xFF0C2340), size: 18),
                ),
              ),
            ),
          ),
        ],
      ),
      body: _isSuccess ? _buildSuccessView() : _buildMainMergedFormView(displayImageUrl),
    );
  }

  Widget _buildMainMergedFormView(String displayImageUrl) {
    final p = _effectiveProduct;

    return Stack(
      children: [
        Form(
          key: _formKey,
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 130),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (_errorMessage.isNotEmpty) ...[
                  Container(
                    width: double.infinity,
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF2F2),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFFCA5A5)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline_rounded, color: Color(0xFFDC2626), size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _errorMessage,
                            style: const TextStyle(color: Color(0xFF991B1B), fontSize: 12, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                // 1. TOP SLEEK PRODUCT BANNER (Matching Screenshot 3 & 2)
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF4FAF6),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: const Color(0xFFDCFCE7), width: 1.2),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF0D5C3A).withValues(alpha: 0.04),
                        blurRadius: 10,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      // Product Thumbnail
                      ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: Container(
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            border: Border.all(color: const Color(0xFFE2EBE5)),
                          ),
                          child: FadeInImage(
                            placeholder: AssetImage(
                              ProductModel.resolveAssetFallback(p.name, p.category),
                            ),
                            image: NetworkImage(displayImageUrl),
                            fit: BoxFit.cover,
                            placeholderFit: BoxFit.cover,
                            fadeInDuration: const Duration(milliseconds: 150),
                            imageErrorBuilder: (ctx, err, stack) => Image.asset(
                              ProductModel.resolveAssetFallback(p.name, p.category),
                              fit: BoxFit.cover,
                              errorBuilder: (c, e, s) => Container(
                                color: const Color(0xFFE8F3EE),
                                child: const Center(
                                  child: Icon(Icons.water_drop_rounded, size: 28, color: Color(0xFF0D5C3A)),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),

                      // Product Details
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Row(
                              children: [
                                Icon(Icons.auto_awesome, color: Color(0xFF059669), size: 13),
                                SizedBox(width: 4),
                                Text(
                                  'Farm Fresh · Morning Milked',
                                  style: TextStyle(
                                    color: Color(0xFF059669),
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.3,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 3),
                            Text(
                              p.name,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w900,
                                color: Color(0xFF0C2340),
                                letterSpacing: -0.2,
                              ),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              'Milked 4:30 AM · Delivered within 3 hrs • ₹${_unitPrice.toInt()}/Litre',
                              style: const TextStyle(
                                fontSize: 11,
                                color: Color(0xFF6B7280),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 5),
                            FittedBox(
                              fit: BoxFit.scaleDown,
                              alignment: Alignment.centerLeft,
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.star_rounded, color: Color(0xFFF59E0B), size: 14),
                                      Icon(Icons.star_rounded, color: Color(0xFFF59E0B), size: 14),
                                      Icon(Icons.star_rounded, color: Color(0xFFF59E0B), size: 14),
                                      Icon(Icons.star_rounded, color: Color(0xFFF59E0B), size: 14),
                                      Icon(Icons.star_rounded, color: Color(0xFFF59E0B), size: 14),
                                    ],
                                  ),
                                  const SizedBox(width: 4),
                                  const Text(
                                    '4.9',
                                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 11.5, color: Color(0xFF1F2937)),
                                  ),
                                  const SizedBox(width: 3),
                                  const Text(
                                    '(1,240+)',
                                    style: TextStyle(fontSize: 11, color: Color(0xFF6B7280)),
                                  ),
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFE0F2E4),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: const Text(
                                      'Free Drop',
                                      style: TextStyle(
                                        color: Color(0xFF0A633B),
                                        fontSize: 10,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // 2. CUSTOMER CONTACT CARD (Matching Screenshot 3)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFE2EBE5), width: 1),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.03),
                        blurRadius: 10,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.person_outline_rounded, color: Color(0xFF0D5C3A), size: 17),
                              SizedBox(width: 7),
                              Text(
                                'Customer Contact',
                                style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                              ),
                            ],
                          ),
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFDCFCE7),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.check_circle_rounded, color: Color(0xFF15803D), size: 12),
                                    SizedBox(width: 4),
                                    Text(
                                      'Verified',
                                      style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF15803D)),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              InkWell(
                                onTap: _showUpdateMobileDialog,
                                borderRadius: BorderRadius.circular(8),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFE2F1EA),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: const Color(0xFFA5D6A7), width: 1),
                                  ),
                                  child: const Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.edit_outlined, color: Color(0xFF0D5C3A), size: 11),
                                      SizedBox(width: 3),
                                      Text(
                                        'Change',
                                        style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF0D5C3A)),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: const BoxDecoration(
                              color: Color(0xFFE2F1EA),
                              shape: BoxShape.circle,
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              _nameController.text.isNotEmpty ? _nameController.text[0].toUpperCase() : 'C',
                              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 17, color: Color(0xFF0D5C3A)),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _nameController.text.isNotEmpty ? _nameController.text : 'Customer Account',
                                  style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900, color: Color(0xFF0C2340)),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  _mobileController.text.isNotEmpty ? '+91 ${_mobileController.text}' : 'Phone verified',
                                  style: const TextStyle(fontSize: 11.5, color: Color(0xFF6B7280), fontWeight: FontWeight.w600),
                                  overflow: TextOverflow.ellipsis,
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

                // 3. DELIVERY ADDRESS CARD (With Interactive Leaflet Map "Use My Location")
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFE2EBE5), width: 1),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.03),
                        blurRadius: 10,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.location_on_outlined, color: Color(0xFF0D5C3A), size: 17),
                              SizedBox(width: 6),
                              Text(
                                'Delivery Address',
                                style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                              ),
                            ],
                          ),
                          Text(
                            'Doorstep Drop',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF6B7280)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // LEAFLET GPS "Use My Location" Card (Matching Admin & Delivery Partner Live Map)
                      InkWell(
                        onTap: _openLeafletMapSelector,
                        borderRadius: BorderRadius.circular(14),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF0FDF4),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: const Color(0xFFB4E2CA), width: 1.2),
                          ),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(7),
                                decoration: const BoxDecoration(
                                  color: Color(0xFF0D5C3A),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.my_location_rounded, color: Colors.white, size: 15),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Flexible(
                                          child: Text(
                                            'Pinpoint on Map',
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w900,
                                              color: Color(0xFF0C2340),
                                            ),
                                          ),
                                        ),
                                        SizedBox(width: 4),
                                        Icon(Icons.verified_rounded, color: Color(0xFF10B981), size: 12),
                                      ],
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      _selectedLat != null
                                          ? 'GPS: ${_selectedLat!.toStringAsFixed(4)}, ${_selectedLng!.toStringAsFixed(4)} ($_selectedArea)'
                                          : 'Tap to locate doorstep with Leaflet GPS',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        fontSize: 10,
                                        color: _selectedLat != null ? const Color(0xFF0D5C3A) : const Color(0xFF64748B),
                                        fontWeight: _selectedLat != null ? FontWeight.w800 : FontWeight.w500,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF0D5C3A),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.map_rounded, size: 12, color: Colors.white),
                                    const SizedBox(width: 4),
                                    Text(
                                      _selectedLat != null ? 'Change' : 'Pin Map',
                                      style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Colors.white),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Address Field
                      TextFormField(
                        controller: _addressController,
                        maxLines: 2,
                        decoration: InputDecoration(
                          labelText: 'Complete Address (Flat / House No., Society, Street) *',
                          labelStyle: const TextStyle(fontSize: 11.5, color: Color(0xFF6B7280)),
                          hintText: 'e.g. Doorstep Address, Hyderabad',
                          hintStyle: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF)),
                          filled: true,
                          fillColor: const Color(0xFFF9FAFB),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF0D5C3A), width: 1.5)),
                          contentPadding: const EdgeInsets.all(12),
                        ),
                        validator: (v) => (v == null || v.trim().isEmpty) ? 'Please enter your complete address' : null,
                      ),
                      const SizedBox(height: 10),

                      // Area Dropdown & Landmark Row (Matching Screenshot 3)
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            flex: 5,
                            child: DropdownButtonFormField<String>(
                              isExpanded: true,
                              initialValue: _allAvailableAreas.contains(_selectedArea) ? _selectedArea : _allAvailableAreas.first,
                              decoration: InputDecoration(
                                labelText: 'Locality / Area *',
                                labelStyle: const TextStyle(fontSize: 11, color: Color(0xFF6B7280)),
                                filled: true,
                                fillColor: const Color(0xFFF9FAFB),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
                              ),
                              items: _allAvailableAreas.map((area) {
                                return DropdownMenuItem(
                                  value: area,
                                  child: Text(
                                    area,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700),
                                  ),
                                );
                              }).toList(),
                              onChanged: (val) {
                                if (val != null) setState(() => _selectedArea = val);
                              },
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            flex: 5,
                            child: TextFormField(
                              controller: _landmarkController,
                              decoration: InputDecoration(
                                labelText: 'Landmark / Gate Access',
                                labelStyle: const TextStyle(fontSize: 11.5, color: Color(0xFF6B7280)),
                                hintText: 'e.g. Near Gate 2',
                                hintStyle: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF)),
                                filled: true,
                                fillColor: const Color(0xFFF9FAFB),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // 4. CHOOSE ORDER FREQUENCY (One-Time vs Daily Drop - Screenshot 2)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFE2EBE5), width: 1),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.03),
                        blurRadius: 10,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'CHOOSE ORDER FREQUENCY',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF496653),
                          letterSpacing: 0.6,
                        ),
                      ),
                      const SizedBox(height: 12),

                      Row(
                        children: [
                          // One-Time Order Card
                          Expanded(
                            child: InkWell(
                              onTap: () => setState(() => _orderFrequency = 'one_time'),
                              borderRadius: BorderRadius.circular(16),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 180),
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: _orderFrequency == 'one_time' ? const Color(0xFF0D5C3A) : Colors.white,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: _orderFrequency == 'one_time' ? const Color(0xFF0D5C3A) : const Color(0xFFDCE8DF),
                                    width: 1.5,
                                  ),
                                  boxShadow: _orderFrequency == 'one_time'
                                      ? [
                                          BoxShadow(
                                            color: const Color(0xFF0D5C3A).withValues(alpha: 0.22),
                                            blurRadius: 8,
                                            offset: const Offset(0, 3),
                                          ),
                                        ]
                                      : [],
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Icon(
                                          Icons.inventory_2_outlined,
                                          size: 18,
                                          color: _orderFrequency == 'one_time' ? Colors.white : const Color(0xFF0D5C3A),
                                        ),
                                        const SizedBox(width: 7),
                                        Text(
                                          'One-Time',
                                          style: TextStyle(
                                            fontSize: 13.5,
                                            fontWeight: FontWeight.w900,
                                            color: _orderFrequency == 'one_time' ? Colors.white : const Color(0xFF0C2340),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      'Single delivery tomorrow morning',
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: _orderFrequency == 'one_time'
                                            ? Colors.white.withValues(alpha: 0.9)
                                            : const Color(0xFF6B7280),
                                        height: 1.25,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),

                          // Daily Drop Card
                          Expanded(
                            child: InkWell(
                              onTap: () => setState(() => _orderFrequency = 'subscription'),
                              borderRadius: BorderRadius.circular(16),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 180),
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: _orderFrequency == 'subscription' ? const Color(0xFF0D5C3A) : Colors.white,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: _orderFrequency == 'subscription' ? const Color(0xFF0D5C3A) : const Color(0xFFDCE8DF),
                                    width: 1.5,
                                  ),
                                  boxShadow: _orderFrequency == 'subscription'
                                      ? [
                                          BoxShadow(
                                            color: const Color(0xFF0D5C3A).withValues(alpha: 0.22),
                                            blurRadius: 8,
                                            offset: const Offset(0, 3),
                                          ),
                                        ]
                                      : [],
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Icon(
                                          Icons.calendar_month_rounded,
                                          size: 18,
                                          color: _orderFrequency == 'subscription' ? Colors.white : const Color(0xFF0D5C3A),
                                        ),
                                        const SizedBox(width: 7),
                                        Text(
                                          'Daily Drop',
                                          style: TextStyle(
                                            fontSize: 13.5,
                                            fontWeight: FontWeight.w900,
                                            color: _orderFrequency == 'subscription' ? Colors.white : const Color(0xFF0C2340),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      'Every morning by 6:30 AM · Pause anytime',
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: _orderFrequency == 'subscription'
                                            ? Colors.white.withValues(alpha: 0.9)
                                            : const Color(0xFF6B7280),
                                        height: 1.25,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // 5. QUANTITY, CURD ADD-ON & SCHEDULE (Matching Screenshot 1 & 3)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFE2EBE5), width: 1),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.03),
                        blurRadius: 10,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header Row
                      Row(
                        children: [
                          const Icon(Icons.calendar_today_rounded, size: 16, color: Color(0xFF0D5C3A)),
                          const SizedBox(width: 6),
                          Text(
                            _orderFrequency == 'one_time' ? 'Single Order Selection' : 'Daily Morning Plan',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF0C2340),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // Milk Quantity Label
                      Text(
                        '${_orderFrequency == "one_time" ? "Milk" : "Daily Cow Milk"} Quantity: ${_selectedMilkQty % 1 == 0 ? _selectedMilkQty.toInt() : _selectedMilkQty}L',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF4B5563)),
                      ),
                      const SizedBox(height: 10),

                      // Quantity Preset Chips Row (With Stepper & Popular Badge)
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        clipBehavior: Clip.none,
                        child: Row(
                          children: [
                            // Stepper
                            Container(
                              height: 44,
                              decoration: BoxDecoration(
                                color: const Color(0xFFF3F7F4),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: const Color(0xFFDCE8DF)),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  IconButton(
                                    onPressed: () {
                                      if (_selectedMilkQty > 0.5) {
                                        setState(() => _selectedMilkQty = (_selectedMilkQty - 0.5).clamp(0.5, 10.0));
                                      }
                                    },
                                    icon: const Icon(Icons.remove_rounded, color: Color(0xFF0D5C3A), size: 18),
                                    constraints: const BoxConstraints(minWidth: 36, minHeight: 40),
                                    padding: EdgeInsets.zero,
                                  ),
                                  Text(
                                    '${_selectedMilkQty % 1 == 0 ? _selectedMilkQty.toInt() : _selectedMilkQty}L',
                                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF0C2340)),
                                  ),
                                  IconButton(
                                    onPressed: () {
                                      setState(() => _selectedMilkQty = (_selectedMilkQty + 0.5).clamp(0.5, 10.0));
                                    },
                                    icon: const Icon(Icons.add_rounded, color: Color(0xFF0D5C3A), size: 18),
                                    constraints: const BoxConstraints(minWidth: 36, minHeight: 40),
                                    padding: EdgeInsets.zero,
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),

                            // Presets
                            _buildMilkPresetChip(val: 0.5, label: '500 ml'),
                            _buildMilkPresetChip(val: 1.0, label: '1 Litre', isPopular: true),
                            _buildMilkPresetChip(val: 1.5, label: '1.5 L'),
                            _buildMilkPresetChip(val: 2.0, label: '2 Litres'),
                            _buildMilkPresetChip(val: 3.0, label: '3 Litres'),
                          ],
                        ),
                      ),
                      const SizedBox(height: 18),

                      // Curd Add-on Section (Matching Screenshot 1)
                      Text(
                        '${_orderFrequency == "one_time" ? "Farm" : "Daily Farm"} Curd (Dahi) Add-on: ${_selectedCurdQty == 0 ? "None" : _selectedCurdQty == 1000 ? "1 Kg" : "${_selectedCurdQty}g"}',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF4B5563)),
                      ),
                      const SizedBox(height: 10),

                      Row(
                        children: [
                          {'val': 0, 'label': 'None', 'price': ''},
                          {'val': 250, 'label': '250g', 'price': '+₹15'},
                          {'val': 500, 'label': '500g', 'price': '+₹30'},
                          {'val': 1000, 'label': '1 Kg', 'price': '+₹60'},
                        ].map((item) {
                          final val = item['val'] as int;
                          final isSel = _selectedCurdQty == val;
                          return Expanded(
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 3),
                              child: InkWell(
                                onTap: () => setState(() => _selectedCurdQty = val),
                                borderRadius: BorderRadius.circular(12),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 2),
                                  decoration: BoxDecoration(
                                    color: isSel ? const Color(0xFFFFFBEB) : Colors.white,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: isSel ? const Color(0xFFF59E0B) : const Color(0xFFE2EBE5),
                                      width: isSel ? 1.6 : 1,
                                    ),
                                  ),
                                  alignment: Alignment.center,
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        item['label'] as String,
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: isSel ? FontWeight.w900 : FontWeight.w700,
                                          color: isSel ? const Color(0xFFB45309) : const Color(0xFF374151),
                                        ),
                                      ),
                                      if ((item['price'] as String).isNotEmpty)
                                        Text(
                                          item['price'] as String,
                                          style: const TextStyle(fontSize: 9.5, color: Color(0xFFB45309), fontWeight: FontWeight.w700),
                                        ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      ),

                      // Delivery Schedule Section (Subscription / Daily Drop)
                      if (_orderFrequency == 'subscription') ...[
                        const SizedBox(height: 20),
                        const Text(
                          'Delivery Schedule',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF4B5563)),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            // 1. Every Morning
                            Expanded(
                              child: _buildScheduleCard(
                                id: 'daily',
                                title: 'Every Morning',
                                badge: 'Best Value',
                                drops: 'Daily · 30 Drops',
                                isSelected: _subscriptionSchedule == 'daily',
                              ),
                            ),
                            const SizedBox(width: 8),

                            // 2. Alternate Days
                            Expanded(
                              child: _buildScheduleCard(
                                id: 'alternate',
                                title: 'Alternate Days',
                                badge: null,
                                drops: '1 Day Gap · 15 Drops',
                                isSelected: _subscriptionSchedule == 'alternate',
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            // 3. Weekdays Only
                            Expanded(
                              child: _buildScheduleCard(
                                id: 'selected',
                                title: 'Weekdays Only',
                                badge: null,
                                drops: 'Mon-Fri · 22 Drops',
                                isSelected: _subscriptionSchedule == 'selected',
                              ),
                            ),
                            const SizedBox(width: 8),

                            // 4. Weekends Only
                            Expanded(
                              child: _buildScheduleCard(
                                id: 'weekends',
                                title: 'Weekends Only',
                                badge: 'Sat & Sun',
                                drops: 'Sat-Sun · 8 Drops',
                                isSelected: _subscriptionSchedule == 'weekends',
                              ),
                            ),
                          ],
                        ),

                        // Sub-selector for Alternate Days
                        if (_subscriptionSchedule == 'alternate') ...[
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF0FDF4),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: const Color(0xFFBBF7D0)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Row(
                                  children: [
                                    Icon(Icons.swap_horiz_rounded, size: 16, color: Color(0xFF15803D)),
                                    SizedBox(width: 6),
                                    Text(
                                      'Alternate Days Delivery Pattern:',
                                      style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Color(0xFF14532D)),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    Expanded(
                                      child: _buildAlternateOptionChip(
                                        id: 'tomorrow',
                                        title: 'Start Tomorrow',
                                        subtitle: 'e.g. Mon, Wed, Fri',
                                        isSelected: _alternateSchedule == 'tomorrow',
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: _buildAlternateOptionChip(
                                        id: 'day_after',
                                        title: 'Start Day After',
                                        subtitle: 'e.g. Tue, Thu, Sat',
                                        isSelected: _alternateSchedule == 'day_after',
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],

                        // Sub-note for Weekends Only
                        if (_subscriptionSchedule == 'weekends') ...[
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF0FDF4),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: const Color(0xFFBBF7D0)),
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.weekend_rounded, size: 16, color: Color(0xFF15803D)),
                                SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Delivered every Saturday & Sunday morning before 6:30 AM (8 drops in 30 days).',
                                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF14532D)),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],

                      // Delivery Schedule for Single Milk Order (One-Time)
                      if (_orderFrequency == 'one_time') ...[
                        const SizedBox(height: 20),
                        const Text(
                          'Delivery Day',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF4B5563)),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: _buildOneTimeScheduleChip(
                                id: 'tomorrow',
                                title: 'Tomorrow Morning',
                                subtitle: 'Before 6:30 AM drop',
                                isSelected: _oneTimeDay == 'tomorrow',
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: _buildOneTimeScheduleChip(
                                id: 'weekend',
                                title: 'This Weekend',
                                subtitle: 'Saturday Morning',
                                isSelected: _oneTimeDay == 'weekend',
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // 6. FARM FRESH PROMISE (From Screenshot 2)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFE2EBE5), width: 1),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.03),
                        blurRadius: 10,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'FARM FRESH PROMISE',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF496653),
                          letterSpacing: 0.6,
                        ),
                      ),
                      const SizedBox(height: 12),
                      ...[
                        'Delivered chilled to 4°C directly from farm to doorstep',
                        'Packaged in sterilized, reusable eco-glass bottles',
                        'Zero preservatives, zero oxytocin, unadulterated pure milk',
                        'Free early-morning delivery before 6:30 AM across Hyderabad',
                      ].map(
                        (item) => Padding(
                          padding: const EdgeInsets.only(bottom: 8.0),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(Icons.check_circle_rounded, color: Color(0xFF059669), size: 16),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  item,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: Color(0xFF4B5563),
                                    fontWeight: FontWeight.w500,
                                    height: 1.35,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // 7. PLAN CALCULATION SUMMARY BOX (Matching Screenshot 1)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF9FAFB),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFE5E7EB)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            _orderFrequency == 'one_time' ? 'Single Order Calculation' : '30-Day Plan Calculation',
                            style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFF374151)),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFFE2F1EA),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              _orderFrequency == 'one_time' ? '1 Morning Drop' : '$_dropsCount Morning Drops',
                              style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF0D5C3A)),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Milk Line
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Milk (${_selectedMilkQty % 1 == 0 ? _selectedMilkQty.toInt() : _selectedMilkQty}L × ₹${_unitPrice.toInt()}/L)',
                            style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
                          ),
                          Text(
                            '₹${(_selectedMilkQty * _unitPrice).round()}${_orderFrequency == 'one_time' ? '' : '/drop'}',
                            style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                          ),
                        ],
                      ),

                      // Curd Line
                      if (_selectedCurdQty > 0) ...[
                        const SizedBox(height: 7),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Curd (${_selectedCurdQty == 1000 ? "1 Kg" : "${_selectedCurdQty}g"})',
                              style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
                            ),
                            Text(
                              '₹${((_selectedCurdQty / 500) * 30).round()}${_orderFrequency == 'one_time' ? '' : '/drop'}',
                              style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                            ),
                          ],
                        ),
                      ],

                      const SizedBox(height: 7),
                      const Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Doorstep Drop (Before 6:30 AM)',
                            style: TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
                          ),
                          Text(
                            'FREE',
                            style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w900, color: Color(0xFF16A34A)),
                          ),
                        ],
                      ),
                      const Divider(height: 20, color: Color(0xFFE5E7EB)),

                      // Total Row
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _orderFrequency == 'one_time' ? 'Total Order Amount' : 'Total Prepaid Amount',
                                style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                              ),
                              Text(
                                _orderFrequency == 'one_time'
                                    ? '₹$_totalAmount for 1 single morning delivery'
                                    : '₹$_dailyCost/day × $_dropsCount deliveries',
                                style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280)),
                              ),
                            ],
                          ),
                          Text(
                            '₹$_totalAmount',
                            style: const TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF0D5C3A),
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

        // Floating Contact Us Button (Matching Screenshot 2)
        Positioned(
          right: 18,
          bottom: 96,
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const ContactSupportScreen(initialTab: 0)),
                );
              },
              borderRadius: BorderRadius.circular(30),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                decoration: BoxDecoration(
                  color: const Color(0xFF059669),
                  borderRadius: BorderRadius.circular(30),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF059669).withValues(alpha: 0.35),
                      blurRadius: 10,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.phone_in_talk_rounded, color: Colors.white, size: 15),
                    SizedBox(width: 5),
                    Text(
                      'Contact Us',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),

        // STICKY BOTTOM ACTION BAR (Matching Screenshot 1 & 3)
        Positioned(
          left: 0,
          right: 0,
          bottom: 0,
          child: Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 18),
            decoration: BoxDecoration(
              color: Colors.white,
              border: const Border(top: BorderSide(color: Color(0xFFE5E7EB), width: 1)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.06),
                  blurRadius: 16,
                  offset: const Offset(0, -4),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    onPressed: _isSubmitting ? null : _handleConfirmSubscription,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0D5C3A),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    child: _isSubmitting
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white),
                          )
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.lock_rounded, size: 17),
                              const SizedBox(width: 8),
                              Text(
                                _orderFrequency == 'one_time'
                                    ? 'Pay ₹$_totalAmount · Place Order'
                                    : 'Pay ₹$_totalAmount · Activate Delivery',
                                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15, letterSpacing: 0.2),
                              ),
                            ],
                          ),
                  ),
                ),
                const SizedBox(height: 8),
                const Center(
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      '🔒 256-Bit SSL Encrypted  •  Secure Checkout  •  Money-back Guarantee',
                      style: TextStyle(fontSize: 10, color: Color(0xFF9CA3AF), fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMilkPresetChip({
    required double val,
    required String label,
    bool isPopular = false,
  }) {
    final isSel = (_selectedMilkQty - val).abs() < 0.01;
    return Padding(
      padding: const EdgeInsets.only(right: 6.0),
      child: InkWell(
        onTap: () => setState(() => _selectedMilkQty = val),
        borderRadius: BorderRadius.circular(12),
        child: Stack(
          clipBehavior: Clip.none,
          alignment: Alignment.topCenter,
          children: [
            Container(
              margin: EdgeInsets.only(top: isPopular ? 6 : 0),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
              decoration: BoxDecoration(
                color: isSel ? const Color(0xFF0D5C3A) : const Color(0xFFF3F7F4),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isSel ? const Color(0xFF0D5C3A) : const Color(0xFFDCE8DF),
                  width: isSel ? 1.6 : 1,
                ),
              ),
              child: Text(
                label,
                style: TextStyle(
                  color: isSel ? Colors.white : const Color(0xFF374151),
                  fontSize: 12,
                  fontWeight: isSel ? FontWeight.w900 : FontWeight.w700,
                ),
              ),
            ),
            if (isPopular)
              Positioned(
                top: 0,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                  decoration: BoxDecoration(
                    color: isSel ? Colors.white : const Color(0xFF0D5C3A),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFF0D5C3A), width: 1),
                  ),
                  child: Text(
                    'Popular',
                    style: TextStyle(
                      color: isSel ? const Color(0xFF0D5C3A) : Colors.white,
                      fontSize: 8.5,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildScheduleCard({
    required String id,
    required String title,
    required String? badge,
    required String drops,
    required bool isSelected,
  }) {
    return InkWell(
      onTap: () => setState(() => _subscriptionSchedule = id),
      borderRadius: BorderRadius.circular(12),
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.topCenter,
        children: [
          Container(
            margin: EdgeInsets.only(top: badge != null ? 7 : 0),
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 6),
            decoration: BoxDecoration(
              color: isSelected ? const Color(0xFFE2F1EA) : const Color(0xFFF9FAFB),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isSelected ? const Color(0xFF0D5C3A) : const Color(0xFFE2EBE5),
                width: isSelected ? 1.8 : 1,
              ),
            ),
            alignment: Alignment.center,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Flexible(
                      child: Text(
                        title,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: isSelected ? FontWeight.w900 : FontWeight.w700,
                          color: isSelected ? const Color(0xFF0D5C3A) : const Color(0xFF0C2340),
                        ),
                      ),
                    ),
                    if (isSelected) ...[
                      const SizedBox(width: 3),
                      const Icon(Icons.check_rounded, color: Color(0xFF0D5C3A), size: 13),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  drops,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 9, color: Color(0xFF6B7280)),
                ),
              ],
            ),
          ),
          if (badge != null)
            Positioned(
              top: 0,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 1.5),
                decoration: BoxDecoration(
                  color: const Color(0xFF0D5C3A),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  badge,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 8.5,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // SUCCESS VIEW
  // ═════════════════════════════════════════════════════════════════════════
  Widget _buildSuccessView() {
    final formattedEnd = _endDate != null
        ? '${_endDate!.day} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][_endDate!.month - 1]} ${_endDate!.year}'
        : '30 Days From Start';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 20),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Spacer(),
          Container(
            width: 72,
            height: 72,
            decoration: const BoxDecoration(
              color: Color(0xFFDCFCE7),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.check_circle_rounded, color: Color(0xFF15803D), size: 48),
          ),
          const SizedBox(height: 18),
          Text(
            _orderFrequency == 'one_time' ? 'One-Time Order Placed!' : 'Subscription Active!',
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFF0C2340)),
          ),
          const SizedBox(height: 6),
          Text(
            _orderFrequency == 'one_time'
                ? 'Thank you, ${_nameController.text.isNotEmpty ? _nameController.text : "Valued Customer"}.\nYour one-time doorstep delivery arrives tomorrow morning.'
                : 'Thank you, ${_nameController.text.isNotEmpty ? _nameController.text : "Valued Customer"}.\nYour pure farm milk delivery starts tomorrow morning.',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 13, color: Color(0xFF4B5563), height: 1.4),
          ),
          const SizedBox(height: 24),

          // Recap Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFF9FAFB),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE5E7EB)),
            ),
            child: Column(
              children: [
                _buildRecapRow('Delivery Address', '${_addressController.text}, $_selectedArea'),
                if (_selectedLat != null)
                  _buildRecapRow('Leaflet GPS Pin', '${_selectedLat!.toStringAsFixed(4)}, ${_selectedLng!.toStringAsFixed(4)}'),
                if (_landmarkController.text.isNotEmpty)
                  _buildRecapRow('Landmark', _landmarkController.text),
                _buildRecapRow(
                  _orderFrequency == 'one_time' ? 'One-Time Order' : 'Daily Morning Plan',
                  '${_selectedMilkQty % 1 == 0 ? _selectedMilkQty.toInt() : _selectedMilkQty}L Fresh Milk${_selectedCurdQty > 0 ? " + ${_selectedCurdQty == 1000 ? '1 Kg' : '${_selectedCurdQty}g'} Curd" : ""} (${_orderFrequency == "one_time" ? "Single Drop (Tomorrow)" : _subscriptionSchedule == "daily" ? "Every Morning" : _subscriptionSchedule == "alternate" ? "Alternate Days" : "Weekdays"})',
                ),
                _buildRecapRow('Delivery Schedule', '5:00 AM – 6:30 AM (Silent Doorstep Drop)', isHighlight: true),
                _buildRecapRow('Valid Through', _orderFrequency == 'one_time' ? 'Tomorrow Morning (1 Drop)' : formattedEnd),
                _buildRecapRow('Packaging', 'Sanitized Glass Bottles · Chilled at 4°C'),
              ],
            ),
          ),
          const Spacer(),

          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0D5C3A),
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: const Text(
                'Done & Return to App',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecapRow(String title, String val, {bool isHighlight = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title, style: const TextStyle(fontSize: 11.5, color: Color(0xFF6B7280))),
          Flexible(
            child: Text(
              val,
              textAlign: TextAlign.right,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isHighlight ? FontWeight.w900 : FontWeight.w700,
                color: isHighlight ? const Color(0xFF0D5C3A) : const Color(0xFF0C2340),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAlternateOptionChip({
    required String id,
    required String title,
    required String subtitle,
    required bool isSelected,
  }) {
    return InkWell(
      onTap: () => setState(() => _alternateSchedule = id),
      borderRadius: BorderRadius.circular(10),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0D5C3A) : Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? const Color(0xFF0D5C3A) : const Color(0xFFDCE8DF),
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  isSelected ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                  size: 13,
                  color: isSelected ? Colors.white : const Color(0xFF9CA3AF),
                ),
                const SizedBox(width: 5),
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: isSelected ? FontWeight.w900 : FontWeight.w700,
                    color: isSelected ? Colors.white : const Color(0xFF0C2340),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: TextStyle(
                fontSize: 9.5,
                color: isSelected ? Colors.white.withValues(alpha: 0.9) : const Color(0xFF6B7280),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOneTimeScheduleChip({
    required String id,
    required String title,
    required String subtitle,
    required bool isSelected,
  }) {
    return InkWell(
      onTap: () => setState(() => _oneTimeDay = id),
      borderRadius: BorderRadius.circular(10),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0D5C3A) : Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? const Color(0xFF0D5C3A) : const Color(0xFFDCE8DF),
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  isSelected ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                  size: 13,
                  color: isSelected ? Colors.white : const Color(0xFF9CA3AF),
                ),
                const SizedBox(width: 5),
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: isSelected ? FontWeight.w900 : FontWeight.w700,
                    color: isSelected ? Colors.white : const Color(0xFF0C2340),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: TextStyle(
                fontSize: 9.5,
                color: isSelected ? Colors.white.withValues(alpha: 0.9) : const Color(0xFF6B7280),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showUpdateMobileDialog() {
    final nameCtrl = TextEditingController(text: _nameController.text.trim());
    final phoneCtrl = TextEditingController(text: _mobileController.text.trim());
    bool isSaving = false;
    String? localError;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (bCtx) => StatefulBuilder(
        builder: (context, setSheetState) {
          return Container(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(context).viewInsets.bottom + 24,
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
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: const BoxDecoration(
                        color: Color(0xFFE2F1EA),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.phone_iphone_rounded, color: Color(0xFF0D5C3A), size: 22),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Update Mobile Number',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0C2340)),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Updates contact for driver deliveries & notifications',
                            style: TextStyle(fontSize: 11.5, color: Color(0xFF6B7280)),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: Color(0xFF6B7280)),
                      onPressed: () => Navigator.pop(bCtx),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                if (localError != null) ...[
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEE2E2),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFFCA5A5)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline_rounded, color: Color(0xFFDC2626), size: 16),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            localError!,
                            style: const TextStyle(fontSize: 12, color: Color(0xFFDC2626), fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
                const Text(
                  'Customer Name',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF374151)),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: nameCtrl,
                  decoration: InputDecoration(
                    hintText: 'Your Full Name',
                    prefixIcon: const Icon(Icons.person_outline_rounded, color: Color(0xFF0D5C3A), size: 18),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFDCE8DF))),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFDCE8DF))),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF0D5C3A), width: 1.5)),
                  ),
                ),
                const SizedBox(height: 14),
                const Text(
                  '10-Digit Mobile Number *',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF374151)),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: phoneCtrl,
                  keyboardType: TextInputType.phone,
                  maxLength: 10,
                  decoration: InputDecoration(
                    hintText: 'e.g. 9912020406',
                    prefixText: '+91 ',
                    prefixStyle: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                    prefixIcon: const Icon(Icons.phone_outlined, color: Color(0xFF0D5C3A), size: 18),
                    counterText: '',
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFDCE8DF))),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFDCE8DF))),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF0D5C3A), width: 1.5)),
                  ),
                ),
                const SizedBox(height: 18),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: isSaving ? null : () async {
                      final newName = nameCtrl.text.trim();
                      final rawPhone = phoneCtrl.text.trim().replaceAll(RegExp(r'[^0-9]'), '');
                      final newPhone = rawPhone.length > 10 ? rawPhone.substring(rawPhone.length - 10) : rawPhone;

                      if (newName.isEmpty) {
                        setSheetState(() => localError = 'Please enter your name');
                        return;
                      }
                      if (!RegExp(r'^[6-9]\d{9}$').hasMatch(newPhone)) {
                        setSheetState(() => localError = 'Please enter a valid 10-digit Indian mobile number');
                        return;
                      }

                      setSheetState(() {
                        isSaving = true;
                        localError = null;
                      });

                      try {
                        final cp = context.read<CustomerProvider>();
                        final auth = context.read<AuthProvider>();
                        final messenger = ScaffoldMessenger.of(context);
                        final success = await cp.updateCustomerProfile(
                          name: newName,
                          mobile: newPhone,
                          address: _addressController.text.trim(),
                          area: _selectedArea,
                          landmark: _landmarkController.text.trim(),
                          latitude: _selectedLat,
                          longitude: _selectedLng,
                        );

                        if (success) {
                          auth.updateUserProfile(name: newName, mobile: newPhone);
                          setState(() {
                            _nameController.text = newName;
                            _mobileController.text = newPhone;
                          });
                          if (bCtx.mounted) Navigator.pop(bCtx);
                          if (mounted) {
                            messenger.showSnackBar(
                              SnackBar(
                                content: Text('✅ Mobile number updated to +91 $newPhone'),
                                backgroundColor: const Color(0xFF0D5C3A),
                                behavior: SnackBarBehavior.floating,
                              ),
                            );
                          }
                        } else {
                          setSheetState(() {
                            isSaving = false;
                            localError = 'Failed to update mobile number. Please try again.';
                          });
                        }
                      } catch (err) {
                        setSheetState(() {
                          isSaving = false;
                          localError = err.toString();
                        });
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0D5C3A),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      elevation: 0,
                    ),
                    child: isSaving
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
                          )
                        : const Text(
                            'Save & Update Mobile',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900),
                          ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
