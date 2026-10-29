import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:natural_milk_dairy/data/models/product_model.dart';
import 'package:natural_milk_dairy/providers/auth_provider.dart';
import 'package:natural_milk_dairy/providers/customer_provider.dart';
import 'subscription_history_screen.dart';

const List<String> kAvailableAreas = [
  'Andheri West',
  'Andheri East',
  'Bandra',
  'Juhu',
  'Goregaon',
  'Powai',
  'Borivali',
  'Dadar',
  'Thane',
  'Navi Mumbai',
  'Madhapur',
  'Gachibowli',
  'Hitec City',
  'Jubilee Hills',
  'Banjara Hills',
  'Kondapur',
  'Kukatpally',
];

class SubscribeCheckoutScreen extends StatefulWidget {
  final ProductModel? product;
  final double initialQty;
  final int initialCurd;
  final String initialFrequency;

  const SubscribeCheckoutScreen({
    super.key,
    this.product,
    this.initialQty = 1.0,
    this.initialCurd = 0,
    this.initialFrequency = 'daily',
  });

  @override
  State<SubscribeCheckoutScreen> createState() => _SubscribeCheckoutScreenState();
}

class _SubscribeCheckoutScreenState extends State<SubscribeCheckoutScreen> {
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _nameController;
  late TextEditingController _mobileController;
  late TextEditingController _addressController;
  late TextEditingController _landmarkController;

  late String _selectedArea;
  late double _selectedMilkQty;
  late int _selectedCurdQty;
  late String _selectedFrequency;
  String _alternateSchedule = 'every_other';

  bool _isSubmitting = false;
  bool _isSuccess = false;
  String _errorMessage = '';
  DateTime? _endDate;

  @override
  void initState() {
    super.initState();
    final auth = context.read<AuthProvider>();
    final user = auth.user;
    final customer = context.read<CustomerProvider>();
    final cData = customer.customerData;

    _nameController = TextEditingController(
      text: user?.name ?? cData?['name']?.toString() ?? '',
    );
    _mobileController = TextEditingController(
      text: user?.mobile ?? cData?['mobile']?.toString() ?? '',
    );
    _addressController = TextEditingController(
      text: user?.address ?? cData?['address']?.toString() ?? '',
    );
    _landmarkController = TextEditingController(
      text: cData?['landmark']?.toString() ?? '',
    );

    final savedArea = user?.area ?? cData?['area']?.toString() ?? 'Madhapur';
    _selectedArea = kAvailableAreas.contains(savedArea) ? savedArea : kAvailableAreas.first;

    // Detect initial quantity from product name if applicable
    final pName = (widget.product?.name ?? '').toLowerCase();
    if (widget.initialQty > 0) {
      _selectedMilkQty = widget.initialQty;
    } else if (pName.contains('500ml')) {
      _selectedMilkQty = 0.5;
    } else {
      _selectedMilkQty = 1.0;
    }

    final pCat = (widget.product?.category ?? '').toLowerCase();
    if (widget.initialCurd > 0) {
      _selectedCurdQty = widget.initialCurd;
    } else if (pCat.contains('curd') || pName.contains('curd')) {
      _selectedCurdQty = 500;
    } else {
      _selectedCurdQty = 0;
    }

    _selectedFrequency = widget.initialFrequency;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _mobileController.dispose();
    _addressController.dispose();
    _landmarkController.dispose();
    super.dispose();
  }

  int get _dailyCost {
    final milkCost = (_selectedMilkQty * 60).round();
    final curdCost = ((_selectedCurdQty / 500) * 30).round();
    return milkCost + curdCost;
  }

  int get _dropsCount {
    if (_selectedFrequency == 'alternate') return 15;
    if (_selectedFrequency == 'selected') return 22;
    return 30; // daily
  }

  int get _totalAmount => _dailyCost * _dropsCount;

  String get _productTitle {
    if (widget.product != null && widget.product!.name.isNotEmpty) {
      return widget.product!.name;
    }
    return 'Pure Desi A2 Cow Milk';
  }

  Future<void> _handleConfirmSubscription() async {
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
      final customerProvider = context.read<CustomerProvider>();
      final orderRes = await customerProvider.createSubscriptionOrder(
        milkQty: _selectedMilkQty,
        curdQty: _selectedCurdQty,
        frequency: _selectedFrequency,
        address: _addressController.text.trim(),
        area: _selectedArea,
        landmark: _landmarkController.text.trim(),
        mobile: _mobileController.text.trim(),
        customerName: _nameController.text.trim(),
      );

      if (!mounted) return;
      setState(() => _isSubmitting = false);

      if (orderRes != null && orderRes['orderId'] != null) {
        _openRazorpayModalSheet(orderRes);
      } else {
        setState(() {
          _errorMessage = customerProvider.errorMessage ??
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
                          const SizedBox(height: 16),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Natural Milk Dairy',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 15,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      'Order: $orderId',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        color: Color(0xFF94A3B8),
                                        fontSize: 11,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Text(
                                '₹$amount',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 24,
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
                      padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'SELECT PAYMENT METHOD',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF64748B),
                              letterSpacing: 0.8,
                            ),
                          ),
                          const SizedBox(height: 12),

                          // UPI Option
                          _buildPaymentMethodTile(
                            title: 'UPI - Google Pay / PhonePe / Paytm',
                            subtitle: 'Instant auto-confirm & instant verification',
                            icon: Icons.account_balance_wallet_rounded,
                            isSelected: selectedMethod == 'upi',
                            onTap: () => setModalState(() => selectedMethod = 'upi'),
                          ),
                          const SizedBox(height: 8),

                          // Card Option
                          _buildPaymentMethodTile(
                            title: 'Cards (Credit / Debit)',
                            subtitle: 'Visa, MasterCard, RuPay, Maestro',
                            icon: Icons.credit_card_rounded,
                            isSelected: selectedMethod == 'card',
                            onTap: () => setModalState(() => selectedMethod = 'card'),
                          ),
                          const SizedBox(height: 8),

                          // NetBanking Option
                          _buildPaymentMethodTile(
                            title: 'NetBanking',
                            subtitle: 'All Indian major banks supported',
                            icon: Icons.account_balance_rounded,
                            isSelected: selectedMethod == 'netbanking',
                            onTap: () => setModalState(() => selectedMethod = 'netbanking'),
                          ),
                        ],
                      ),
                    ),

                    const Divider(height: 16, color: Color(0xFFE2E8F0)),

                    // Action Buttons
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                      child: Column(
                        children: [
                          // Complete Payment Button (Success)
                          SizedBox(
                            width: double.infinity,
                            height: 48,
                            child: ElevatedButton(
                              onPressed: isProcessing
                                  ? null
                                  : () async {
                                      setModalState(() => isProcessing = true);
                                      final customerProvider = context.read<CustomerProvider>();
                                      final paymentId = 'pay_rzp_${DateTime.now().millisecondsSinceEpoch}';
                                      final signature = 'sig_rzp_${DateTime.now().millisecondsSinceEpoch}';
                                      final ok = await customerProvider.verifySubscriptionPayment(
                                        orderId: orderId,
                                        paymentId: paymentId,
                                        signature: signature,
                                        mobile: _mobileController.text.trim(),
                                      );

                                      if (!mounted) return;
                                      if (sheetContext.mounted) {
                                        Navigator.pop(sheetContext);
                                      }

                                      if (ok) {
                                        final calcEnd = DateTime.now().add(const Duration(days: 30));
                                        setState(() {
                                          _isSuccess = true;
                                          _endDate = calcEnd;
                                        });
                                      } else {
                                        _showPaymentFailedDialog(
                                          orderId: orderId,
                                          reason: customerProvider.errorMessage ?? 'Payment verification failed at server.',
                                        );
                                      }
                                    },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF0D5C3A),
                                foregroundColor: Colors.white,
                                elevation: 0,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              child: isProcessing
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white),
                                    )
                                  : Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        const Icon(Icons.check_circle_rounded, size: 18),
                                        const SizedBox(width: 8),
                                        Text(
                                          'Complete Payment (₹$amount)',
                                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
                                        ),
                                      ],
                                    ),
                            ),
                          ),
                          const SizedBox(height: 10),

                          // Cancel Payment Button (Simulate Failure)
                          SizedBox(
                            width: double.infinity,
                            height: 44,
                            child: OutlinedButton(
                              onPressed: isProcessing
                                  ? null
                                  : () async {
                                      Navigator.pop(sheetContext);
                                      final customerProvider = context.read<CustomerProvider>();
                                      await customerProvider.failSubscriptionPayment(
                                        orderId: orderId,
                                        reason: 'Customer cancelled payment at gateway',
                                      );
                                      if (mounted) {
                                        _showPaymentFailedDialog(
                                          orderId: orderId,
                                          reason: 'Payment cancelled by user',
                                        );
                                      }
                                    },
                              style: OutlinedButton.styleFrom(
                                foregroundColor: const Color(0xFFDC2626),
                                side: const BorderSide(color: Color(0xFFFCA5A5)),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              child: const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.close_rounded, size: 16),
                                  SizedBox(width: 6),
                                  Text(
                                    'Cancel Payment / Simulate Failure',
                                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                                  ),
                                ],
                              ),
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

  Widget _buildPaymentMethodTile({
    required String title,
    required String subtitle,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFF0FDF4) : const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? const Color(0xFF0D5C3A) : const Color(0xFFE2E8F0),
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              color: isSelected ? const Color(0xFF0D5C3A) : const Color(0xFF64748B),
              size: 20,
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
                      color: isSelected ? const Color(0xFF0C2340) : const Color(0xFF334155),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                  ),
                ],
              ),
            ),
            Icon(
              isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
              color: isSelected ? const Color(0xFF0D5C3A) : const Color(0xFF94A3B8),
              size: 18,
            ),
          ],
        ),
      ),
    );
  }

  void _showPaymentFailedDialog({required String orderId, required String reason}) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        contentPadding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 58,
              height: 58,
              decoration: const BoxDecoration(
                color: Color(0xFFFEE2E2),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.close_rounded, color: Color(0xFFDC2626), size: 34),
            ),
            const SizedBox(height: 16),
            const Text(
              'Payment Failed / Cancelled',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 17.5,
                fontWeight: FontWeight.w900,
                color: Color(0xFF0C2340),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Your subscription order was not completed.\nReason: $reason\n\nYour subscription status has been marked as Failed. You can view it in Subscription History or Retry Payment anytime.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 12.5,
                color: Color(0xFF4B5563),
                height: 1.45,
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 44,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.pop(ctx);
                  _handleConfirmSubscription();
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0D5C3A),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
                icon: const Icon(Icons.refresh_rounded, size: 18),
                label: const Text('Retry Payment', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5)),
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              height: 44,
              child: OutlinedButton.icon(
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const SubscriptionHistoryScreen(),
                    ),
                  );
                },
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF0C2340),
                  side: const BorderSide(color: Color(0xFFD1D5DB)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: const Icon(Icons.history_rounded, size: 18),
                label: const Text('View Subscription History', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.arrow_back_ios_new_rounded, size: 16, color: Color(0xFF0C2340)),
            ],
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Morning Milk Delivery',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w900,
                color: Color(0xFF0C2340),
              ),
            ),
            Row(
              children: [
                Container(
                  width: 6,
                  height: 6,
                  decoration: const BoxDecoration(
                    color: Color(0xFF16A34A),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 5),
                const Expanded(
                  child: Text(
                    'Prepaid 30-day plan · Doorstep drop by 6:30 AM',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF6B7280),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.close_rounded, color: Color(0xFF6B7280), size: 22),
            onPressed: () => Navigator.pop(context),
          ),
        ],
      ),
      body: SafeArea(
        child: _isSuccess ? _buildSuccessView() : _buildFormView(),
      ),
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Form View (Matching SubscribeModal.jsx exactly)
  // ═════════════════════════════════════════════════════════════════════════
  Widget _buildFormView() {
    final userInitials = _nameController.text.isNotEmpty
        ? _nameController.text.substring(0, 1).toUpperCase()
        : 'U';

    return Form(
      key: _formKey,
      child: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Product Spotlight Banner
                  _buildProductSpotlightBanner(),
                  const SizedBox(height: 16),

                  // Section 1: Customer Contact
                  _buildCustomerContactSection(userInitials),
                  const SizedBox(height: 16),

                  // Section 2: Delivery Address
                  _buildDeliveryAddressSection(),
                  const SizedBox(height: 16),

                  // Section 3: Daily Morning Plan Customizer
                  _buildPlanCustomizerSection(),
                  const SizedBox(height: 16),

                  // Section 4: 30-Day Plan Calculation Summary Box
                  _buildSummaryCalculationBox(),
                  const SizedBox(height: 16),

                  // Section 5: Delivery Guarantee Box
                  _buildDeliveryGuaranteeBox(),
                  const SizedBox(height: 14),

                  if (_errorMessage.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.all(12),
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFFECACA)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline_rounded, color: Color(0xFFDC2626), size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _errorMessage,
                              style: const TextStyle(fontSize: 12, color: Color(0xFFDC2626), fontWeight: FontWeight.w700),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),

          // Sticky Bottom Checkout Action
          _buildStickyCheckoutBar(),
        ],
      ),
    );
  }

  // Spotlight Banner
  Widget _buildProductSpotlightBanner() {
    final imgUrl = widget.product != null
        ? ProductModel.resolveImageUrl(widget.product!.imageUrl, widget.product!.name, widget.product!.category)
        : '';

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF0FDF4),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFBBF7D0)),
      ),
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFD1FAE5)),
            ),
            clipBehavior: Clip.antiAlias,
            child: imgUrl.isNotEmpty
                ? Image.network(
                    imgUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) =>
                        const Icon(Icons.local_drink_rounded, color: Color(0xFF0D5C3A), size: 28),
                  )
                : const Icon(Icons.local_drink_rounded, color: Color(0xFF0D5C3A), size: 28),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFDCFCE7),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.auto_awesome_rounded, color: Color(0xFF15803D), size: 11),
                      SizedBox(width: 4),
                      Text(
                        'Farm Fresh · Morning Milked',
                        style: TextStyle(
                          fontSize: 9.5,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF15803D),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _productTitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0C2340),
                  ),
                ),
                const Text(
                  'Milked 4:30 AM · Delivered within 3 hrs · ₹60/Litre',
                  style: TextStyle(fontSize: 11, color: Color(0xFF6B7280), fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Section 1: Verified Customer
  Widget _buildCustomerContactSection(String userInitials) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2EBE5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(Icons.person_outline_rounded, size: 16, color: Color(0xFF0D5C3A)),
                  SizedBox(width: 6),
                  Text(
                    'Customer Contact',
                    style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                  ),
                ],
              ),
              Row(
                children: [
                  Icon(Icons.verified_rounded, size: 14, color: Color(0xFF16A34A)),
                  SizedBox(width: 3),
                  Text(
                    'Verified',
                    style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF16A34A)),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              CircleAvatar(
                radius: 19,
                backgroundColor: const Color(0xFFE2F1EA),
                child: Text(
                  userInitials,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0D5C3A),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _nameController.text.isNotEmpty ? _nameController.text : 'Valued Customer',
                      style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                    ),
                    Text(
                      _mobileController.text.isNotEmpty ? '+91 ${_mobileController.text}' : 'Phone connected',
                      style: const TextStyle(fontSize: 11.5, color: Color(0xFF6B7280)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // Section 2: Delivery Address
  Widget _buildDeliveryAddressSection() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2EBE5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(Icons.location_on_outlined, size: 16, color: Color(0xFF0D5C3A)),
                  SizedBox(width: 6),
                  Text(
                    'Delivery Address',
                    style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                  ),
                ],
              ),
              Text(
                'Doorstep Drop',
                style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Color(0xFF6B7280)),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Complete Address
          const Text(
            'Complete Address (Flat / House No., Society, Street) *',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF4B5563)),
          ),
          const SizedBox(height: 6),
          TextFormField(
            controller: _addressController,
            maxLines: 2,
            validator: (v) => v == null || v.trim().isEmpty ? 'Address is required' : null,
            decoration: InputDecoration(
              hintText: 'e.g. Flat 402, Lotus Greens, 4th Cross Road',
              hintStyle: const TextStyle(fontSize: 12, color: Color(0xFF9CA3AF)),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF0D5C3A), width: 1.5),
              ),
              filled: true,
              fillColor: const Color(0xFFF8FAFC),
            ),
          ),
          const SizedBox(height: 12),

          // Area & Landmark Row
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Delivery Locality / Area',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF4B5563)),
                    ),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<String>(
                      initialValue: _selectedArea,
                      isExpanded: true,
                      decoration: InputDecoration(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                      ),
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0C2340)),
                      items: kAvailableAreas
                          .map((a) => DropdownMenuItem(value: a, child: Text(a, maxLines: 1, overflow: TextOverflow.ellipsis)))
                          .toList(),
                      onChanged: (val) {
                        if (val != null) setState(() => _selectedArea = val);
                      },
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
                      'Landmark / Gate Access',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF4B5563)),
                    ),
                    const SizedBox(height: 6),
                    TextFormField(
                      controller: _landmarkController,
                      decoration: InputDecoration(
                        hintText: 'e.g. Near Gate 2',
                        hintStyle: const TextStyle(fontSize: 12, color: Color(0xFF9CA3AF)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // Section 3: Daily Morning Plan Customizer
  Widget _buildPlanCustomizerSection() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2EBE5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.calendar_month_outlined, size: 16, color: Color(0xFF0D5C3A)),
              SizedBox(width: 6),
              Text(
                'Daily Morning Plan',
                style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Milk Quantity Selector Pills
          Row(
            children: [
              Text(
                'Daily Cow Milk Quantity: ',
                style: const TextStyle(fontSize: 11.5, color: Color(0xFF4B5563)),
              ),
              Text(
                '${_selectedMilkQty}L',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF0D5C3A)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              {'label': '500 ml', 'val': 0.5, 'badge': ''},
              {'label': '1 Litre', 'val': 1.0, 'badge': 'Popular'},
              {'label': '1.5 L', 'val': 1.5, 'badge': ''},
              {'label': '2 Litres', 'val': 2.0, 'badge': ''},
              {'label': '3 Litres', 'val': 3.0, 'badge': ''},
            ].map((item) {
              final val = item['val'] as double;
              final badge = item['badge'] as String;
              final isSel = (_selectedMilkQty - val).abs() < 0.05;

              return Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 2.5),
                  child: InkWell(
                    onTap: () => setState(() => _selectedMilkQty = val),
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                        color: isSel ? const Color(0xFF0D5C3A) : const Color(0xFFF3F7F4),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: isSel ? const Color(0xFF0D5C3A) : const Color(0xFFE2EBE5),
                          width: isSel ? 1.5 : 1,
                        ),
                      ),
                      alignment: Alignment.center,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (badge.isNotEmpty)
                            Container(
                              margin: const EdgeInsets.only(bottom: 2),
                              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                              decoration: BoxDecoration(
                                color: isSel ? Colors.white : const Color(0xFFFEF3C7),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                badge,
                                style: TextStyle(
                                  fontSize: 7.5,
                                  fontWeight: FontWeight.w900,
                                  color: isSel ? const Color(0xFF0D5C3A) : const Color(0xFFB45309),
                                ),
                              ),
                            ),
                          Text(
                            item['label'] as String,
                            style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: isSel ? FontWeight.w900 : FontWeight.w700,
                              color: isSel ? Colors.white : const Color(0xFF0C2340),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
          if (_selectedFrequency == 'alternate') ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF86EFAC)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.schedule_rounded, color: Color(0xFF16A34A), size: 14),
                      SizedBox(width: 5),
                      Text(
                        'ALTERNATE DAYS PATTERN',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF166534),
                          letterSpacing: 0.4,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      {'id': 'every_other', 'label': 'Every Other Day', 'sub': '1 Day Gap'},
                      {'id': 'mwf', 'label': 'Mon • Wed • Fri', 'sub': 'MWF Pattern'},
                      {'id': 'tts', 'label': 'Tue • Thu • Sat', 'sub': 'TTS Pattern'},
                    ].map((opt) {
                      final isSubSel = _alternateSchedule == opt['id'];
                      return Expanded(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 2.5),
                          child: InkWell(
                            onTap: () => setState(() => _alternateSchedule = opt['id'] as String),
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 7, horizontal: 2),
                              decoration: BoxDecoration(
                                color: isSubSel ? const Color(0xFF0D5C3A) : Colors.white,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: isSubSel ? const Color(0xFF0D5C3A) : const Color(0xFFCBD5E1),
                                  width: isSubSel ? 1.4 : 1,
                                ),
                              ),
                              alignment: Alignment.center,
                              child: Column(
                                children: [
                                  Text(
                                    opt['label'] as String,
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      fontSize: 9.5,
                                      fontWeight: isSubSel ? FontWeight.w900 : FontWeight.w700,
                                      color: isSubSel ? Colors.white : const Color(0xFF0C2340),
                                    ),
                                  ),
                                  Text(
                                    opt['sub'] as String,
                                    style: TextStyle(
                                      fontSize: 8,
                                      color: isSubSel ? Colors.white70 : const Color(0xFF6B7280),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 16),

          // Curd Add-on Selector Pills
          Row(
            children: [
              Text(
                'Daily Farm Curd (Dahi) Add-on: ',
                style: const TextStyle(fontSize: 11.5, color: Color(0xFF4B5563)),
              ),
              Text(
                _selectedCurdQty > 0 ? '${_selectedCurdQty}g' : 'None',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  color: _selectedCurdQty > 0 ? const Color(0xFFD97706) : const Color(0xFF6B7280),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              {'label': 'None', 'val': 0, 'price': ''},
              {'label': '250g', 'val': 250, 'price': '+₹15'},
              {'label': '500g', 'val': 500, 'price': '+₹30'},
              {'label': '1 Kg', 'val': 1000, 'price': '+₹60'},
            ].map((item) {
              final val = item['val'] as int;
              final price = item['price'] as String;
              final isSel = _selectedCurdQty == val;

              return Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 2.5),
                  child: InkWell(
                    onTap: () => setState(() => _selectedCurdQty = val),
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                        color: isSel ? const Color(0xFFFEF3C7) : const Color(0xFFF9FAFB),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: isSel ? const Color(0xFFD97706) : const Color(0xFFE5E7EB),
                          width: isSel ? 1.5 : 1,
                        ),
                      ),
                      alignment: Alignment.center,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            item['label'] as String,
                            style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: isSel ? FontWeight.w900 : FontWeight.w700,
                              color: isSel ? const Color(0xFFB45309) : const Color(0xFF4B5563),
                            ),
                          ),
                          if (price.isNotEmpty)
                            Text(
                              price,
                              style: TextStyle(
                                fontSize: 8.5,
                                fontWeight: FontWeight.w800,
                                color: isSel ? const Color(0xFFB45309) : const Color(0xFF6B7280),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
          if (_selectedFrequency == 'alternate') ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF86EFAC)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.schedule_rounded, color: Color(0xFF16A34A), size: 14),
                      SizedBox(width: 5),
                      Text(
                        'ALTERNATE DAYS PATTERN',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF166534),
                          letterSpacing: 0.4,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      {'id': 'every_other', 'label': 'Every Other Day', 'sub': '1 Day Gap'},
                      {'id': 'mwf', 'label': 'Mon • Wed • Fri', 'sub': 'MWF Pattern'},
                      {'id': 'tts', 'label': 'Tue • Thu • Sat', 'sub': 'TTS Pattern'},
                    ].map((opt) {
                      final isSubSel = _alternateSchedule == opt['id'];
                      return Expanded(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 2.5),
                          child: InkWell(
                            onTap: () => setState(() => _alternateSchedule = opt['id'] as String),
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 7, horizontal: 2),
                              decoration: BoxDecoration(
                                color: isSubSel ? const Color(0xFF0D5C3A) : Colors.white,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: isSubSel ? const Color(0xFF0D5C3A) : const Color(0xFFCBD5E1),
                                  width: isSubSel ? 1.4 : 1,
                                ),
                              ),
                              alignment: Alignment.center,
                              child: Column(
                                children: [
                                  Text(
                                    opt['label'] as String,
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      fontSize: 9.5,
                                      fontWeight: isSubSel ? FontWeight.w900 : FontWeight.w700,
                                      color: isSubSel ? Colors.white : const Color(0xFF0C2340),
                                    ),
                                  ),
                                  Text(
                                    opt['sub'] as String,
                                    style: TextStyle(
                                      fontSize: 8,
                                      color: isSubSel ? Colors.white70 : const Color(0xFF6B7280),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 16),

          // Delivery Schedule
          const Text(
            'Delivery Schedule',
            style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF4B5563)),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              {'id': 'daily', 'title': 'Every Morning', 'desc': 'Daily · 30 Drops', 'badge': 'Best Value'},
              {'id': 'alternate', 'title': 'Alternate Days', 'desc': '1 Day Gap · 15 Drops', 'badge': ''},
              {'id': 'selected', 'title': 'Weekdays Only', 'desc': 'Mon-Fri · 22 Drops', 'badge': ''},
            ].map((item) {
              final id = item['id'] as String;
              final isSel = _selectedFrequency == id;
              final badge = item['badge'] as String;

              return Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 2.5),
                  child: InkWell(
                    onTap: () => setState(() => _selectedFrequency = id),
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                      decoration: BoxDecoration(
                        color: isSel ? const Color(0xFFE2F1EA) : Colors.white,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: isSel ? const Color(0xFF0D5C3A) : const Color(0xFFE2EBE5),
                          width: isSel ? 1.5 : 1,
                        ),
                      ),
                      alignment: Alignment.center,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (badge.isNotEmpty)
                            Container(
                              margin: const EdgeInsets.only(bottom: 2),
                              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                              decoration: BoxDecoration(
                                color: const Color(0xFF0D5C3A),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                badge,
                                style: const TextStyle(fontSize: 7.5, fontWeight: FontWeight.w900, color: Colors.white),
                              ),
                            ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Flexible(
                                child: Text(
                                  item['title'] as String,
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: isSel ? FontWeight.w900 : FontWeight.w700,
                                    color: isSel ? const Color(0xFF0D5C3A) : const Color(0xFF0C2340),
                                  ),
                                ),
                              ),
                              if (isSel) ...[
                                const SizedBox(width: 2),
                                const Icon(Icons.check_rounded, color: Color(0xFF0D5C3A), size: 12),
                              ],
                            ],
                          ),
                          Text(
                            item['desc'] as String,
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontSize: 8.5, color: Color(0xFF6B7280)),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
          if (_selectedFrequency == 'alternate') ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF86EFAC)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.schedule_rounded, color: Color(0xFF16A34A), size: 14),
                      SizedBox(width: 5),
                      Text(
                        'ALTERNATE DAYS PATTERN',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF166534),
                          letterSpacing: 0.4,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      {'id': 'every_other', 'label': 'Every Other Day', 'sub': '1 Day Gap'},
                      {'id': 'mwf', 'label': 'Mon • Wed • Fri', 'sub': 'MWF Pattern'},
                      {'id': 'tts', 'label': 'Tue • Thu • Sat', 'sub': 'TTS Pattern'},
                    ].map((opt) {
                      final isSubSel = _alternateSchedule == opt['id'];
                      return Expanded(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 2.5),
                          child: InkWell(
                            onTap: () => setState(() => _alternateSchedule = opt['id'] as String),
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 7, horizontal: 2),
                              decoration: BoxDecoration(
                                color: isSubSel ? const Color(0xFF0D5C3A) : Colors.white,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: isSubSel ? const Color(0xFF0D5C3A) : const Color(0xFFCBD5E1),
                                  width: isSubSel ? 1.4 : 1,
                                ),
                              ),
                              alignment: Alignment.center,
                              child: Column(
                                children: [
                                  Text(
                                    opt['label'] as String,
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      fontSize: 9.5,
                                      fontWeight: isSubSel ? FontWeight.w900 : FontWeight.w700,
                                      color: isSubSel ? Colors.white : const Color(0xFF0C2340),
                                    ),
                                  ),
                                  Text(
                                    opt['sub'] as String,
                                    style: TextStyle(
                                      fontSize: 8,
                                      color: isSubSel ? Colors.white70 : const Color(0xFF6B7280),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  // Section 4: 30-Day Plan Calculation Summary Box
  Widget _buildSummaryCalculationBox() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                '30-Day Plan Calculation',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF374151)),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFE2F1EA),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '$_dropsCount Morning Drops',
                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF0D5C3A)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Milk Line
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Milk (${_selectedMilkQty}L × ₹60/L)',
                style: const TextStyle(fontSize: 11.5, color: Color(0xFF6B7280)),
              ),
              Text(
                '₹${(_selectedMilkQty * 60).round()}/drop',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
              ),
            ],
          ),

          // Curd Line
          if (_selectedCurdQty > 0) ...[
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Curd (${_selectedCurdQty}g)',
                  style: const TextStyle(fontSize: 11.5, color: Color(0xFF6B7280)),
                ),
                Text(
                  '₹${((_selectedCurdQty / 500) * 30).round()}/drop',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                ),
              ],
            ),
          ],

          const SizedBox(height: 6),
          // Doorstep Delivery Free
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Doorstep Drop (Before 6:30 AM)',
                style: TextStyle(fontSize: 11.5, color: Color(0xFF6B7280)),
              ),
              Text(
                'FREE',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Color(0xFF16A34A)),
              ),
            ],
          ),
          const Divider(height: 18, color: Color(0xFFE5E7EB)),

          // Total
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Total Prepaid Amount',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                  ),
                  Text(
                    '₹$_dailyCost/day × $_dropsCount deliveries',
                    style: const TextStyle(fontSize: 10.5, color: Color(0xFF6B7280)),
                  ),
                ],
              ),
              Text(
                '₹$_totalAmount',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF0D5C3A),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // Section 5: Delivery Guarantee Box
  Widget _buildDeliveryGuaranteeBox() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFBEB),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFDE68A)),
      ),
      child: const Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.local_shipping_outlined, color: Color(0xFFD97706), size: 18),
          SizedBox(width: 8),
          Expanded(
            child: Text(
              'Silent Doorstep Drop: Delivered daily between 5:00 AM – 6:30 AM in sanitized glass bottles. Pause, reschedule, or cancel anytime from your app.',
              style: TextStyle(fontSize: 11, color: Color(0xFF92400E), height: 1.35, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }

  // Sticky Bottom Action Bar
  Widget _buildStickyCheckoutBar() {
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 12, 18, 20),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFE5E7EB), width: 1)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: double.infinity,
            height: 48,
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
                        const Icon(Icons.lock_outline_rounded, size: 16),
                        const SizedBox(width: 8),
                        Text(
                          'Pay ₹$_totalAmount · Activate Delivery',
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
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
                style: TextStyle(fontSize: 9.5, color: Color(0xFF9CA3AF), fontWeight: FontWeight.w600),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Success View (Matching SubscribeModal.jsx exactly)
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
          const Text(
            'Subscription Active!',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFF0C2340)),
          ),
          const SizedBox(height: 6),
          Text(
            'Thank you, ${_nameController.text.isNotEmpty ? _nameController.text : "Valued Customer"}.\nYour pure farm milk delivery starts tomorrow morning.',
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
                if (_landmarkController.text.isNotEmpty)
                  _buildRecapRow('Landmark', _landmarkController.text),
                _buildRecapRow(
                  'Daily Morning Plan',
                  '${_selectedMilkQty}L Fresh Milk${_selectedCurdQty > 0 ? " + ${_selectedCurdQty}g Curd" : ""} (${_selectedFrequency == "daily" ? "Every Morning" : _selectedFrequency == "alternate" ? "Alternate Days" : "Weekdays"})',
                ),
                _buildRecapRow('Delivery Schedule', '5:00 AM – 6:30 AM (Silent Doorstep Drop)', isHighlight: true),
                _buildRecapRow('Valid Through', formattedEnd),
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
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title, style: const TextStyle(fontSize: 11.5, color: Color(0xFF6B7280))),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              val,
              textAlign: TextAlign.right,
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w800,
                color: isHighlight ? const Color(0xFF15803D) : const Color(0xFF0C2340),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

