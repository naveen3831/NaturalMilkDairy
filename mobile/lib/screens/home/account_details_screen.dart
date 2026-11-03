import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:natural_milk_dairy/providers/auth_provider.dart';
import 'package:natural_milk_dairy/providers/customer_provider.dart';
import 'subscription_history_screen.dart';
import 'contact_support_screen.dart';

class AccountDetailsScreen extends StatelessWidget {
  const AccountDetailsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final customerProvider = context.watch<CustomerProvider>();
    final user = auth.user;
    final isGuest = user == null || user.isGuest == true;

    final String name = isGuest
        ? 'Guest Explorer'
        : (customerProvider.name.isNotEmpty
            ? customerProvider.name
            : (user.name));

    final String customerId = isGuest
        ? 'GUEST-001'
        : (user.customerId.isNotEmpty
            ? user.customerId
            : (customerProvider.customerData?['customerId']?.toString() ?? 'CUST-101'));

    final String mobile = isGuest
        ? '+91 77022 33931'
        : (customerProvider.mobile.isNotEmpty
            ? customerProvider.mobile
            : (user.mobile));

    final String email = !isGuest && user.email != null && user.email!.isNotEmpty
        ? user.email!
        : (customerProvider.customerData?['email']?.toString() ?? 'Not provided');

    final String address = customerProvider.address.isNotEmpty
        ? customerProvider.address
        : (!isGuest && user.address != null ? user.address! : 'Home Delivery Address');

    final String area = customerProvider.area.isNotEmpty
        ? customerProvider.area
        : (!isGuest ? user.assignedArea : 'Madhapur');

    final String landmark = customerProvider.landmark.isNotEmpty
        ? customerProvider.landmark
        : (customerProvider.customerData?['landmark']?.toString() ?? 'None');

    final String deliveryBoyName = customerProvider.deliveryBoyName.isNotEmpty
        ? customerProvider.deliveryBoyName
        : 'Assigned Dairy Partner';

    final int milkQty = customerProvider.milkQuantity;
    final int curdQty = customerProvider.curdQuantity;
    final String frequency = customerProvider.frequency;
    final String deliverySlot = customerProvider.deliverySlot;
    final bool isPaused = customerProvider.isPaused;
    final num balance = customerProvider.currentBalance;

    final String expiryDate = customerProvider.formattedExpiryDate;
    final int daysRemaining = customerProvider.subscriptionDaysRemaining;

    final dynamic rawPlan = customerProvider.customerData?['deliveryPlan'];
    final String planName = (rawPlan is Map && rawPlan['planName']?.toString().isNotEmpty == true)
        ? rawPlan['planName'].toString()
        : 'Farm Fresh A2 Cow Milk Daily Plan';

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAF9),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF0C2340)),
          onPressed: () => Navigator.pop(context),
          tooltip: 'Back to Profile',
        ),
        title: const Text(
          'Account Details',
          style: TextStyle(
            color: Color(0xFF0C2340),
            fontSize: 18,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.2,
          ),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: TextButton.icon(
              style: TextButton.styleFrom(
                backgroundColor: const Color(0xFFE2F1EA),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              ),
              icon: const Icon(Icons.edit_outlined, size: 16, color: Color(0xFF0D5C3A)),
              label: const Text(
                'Edit',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0D5C3A),
                ),
              ),
              onPressed: () => _showEditProfileSheet(
                context,
                customerProvider,
                auth,
                name,
                mobile,
                email,
                address,
                area,
                landmark,
              ),
            ),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(
            color: const Color(0xFFEAEFEB),
            height: 1,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Profile Hero Identity Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFE2EBE5)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.02),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Row(
                children: [
                  // Avatar with Initial
                  Container(
                    width: 58,
                    height: 58,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFFE2F1EA), Color(0xFFC7E6D6)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      shape: BoxShape.circle,
                      border: Border.all(color: const Color(0xFFB5DEC8), width: 1.5),
                    ),
                    child: Center(
                      child: Text(
                        name.isNotEmpty ? name.substring(0, 1).toUpperCase() : 'C',
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0D5C3A),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),

                  // Name, Customer ID & Status
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          name,
                          style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF0C2340),
                          ),
                        ),
                        const SizedBox(height: 3),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: Text(
                                customerId,
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF475569),
                                  fontFamily: 'monospace',
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: isPaused ? const Color(0xFFFEF3C7) : const Color(0xFFE2F1EA),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: isPaused ? const Color(0xFFFDE68A) : const Color(0xFFBBF7D0),
                                ),
                              ),
                              child: Text(
                                isPaused ? 'Paused' : 'Active Account',
                                style: TextStyle(
                                  color: isPaused ? const Color(0xFF92400E) : const Color(0xFF0D5C3A),
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w800,
                                ),
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
            const SizedBox(height: 16),

            // 2. Personal & Contact Information Card
            _buildSectionCard(
              title: 'Personal & Contact Information',
              icon: Icons.person_outline_rounded,
              action: InkWell(
                onTap: () => _showEditProfileSheet(
                  context,
                  customerProvider,
                  auth,
                  name,
                  mobile,
                  email,
                  address,
                  area,
                  landmark,
                ),
                borderRadius: BorderRadius.circular(6),
                child: const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  child: Row(
                    children: [
                      Icon(Icons.edit_outlined, size: 14, color: Color(0xFF0D5C3A)),
                      SizedBox(width: 4),
                      Text(
                        'Edit',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0D5C3A)),
                      ),
                    ],
                  ),
                ),
              ),
              children: [
                _buildInfoRow(
                  label: 'Full Name',
                  value: name,
                  icon: Icons.badge_outlined,
                ),
                _buildDivider(),
                _buildInfoRow(
                  label: 'Registered Mobile',
                  value: mobile,
                  icon: Icons.phone_android_rounded,
                  badge: 'Login ID',
                  badgeColor: const Color(0xFF0D5C3A),
                  badgeBg: const Color(0xFFE2F1EA),
                ),
                _buildDivider(),
                _buildInfoRow(
                  label: 'Email Address',
                  value: email,
                  icon: Icons.mail_outline_rounded,
                ),
                _buildDivider(),
                _buildInfoRow(
                  label: 'Customer ID',
                  value: customerId,
                  icon: Icons.tag_rounded,
                ),
              ],
            ),
            const SizedBox(height: 14),

            // 3. Delivery Address & Territory Card
            _buildSectionCard(
              title: 'Delivery Address & Route',
              icon: Icons.location_on_outlined,
              action: InkWell(
                onTap: () => _showEditProfileSheet(
                  context,
                  customerProvider,
                  auth,
                  name,
                  mobile,
                  email,
                  address,
                  area,
                  landmark,
                ),
                borderRadius: BorderRadius.circular(6),
                child: const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  child: Row(
                    children: [
                      Icon(Icons.edit_outlined, size: 14, color: Color(0xFF0D5C3A)),
                      SizedBox(width: 4),
                      Text(
                        'Edit',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0D5C3A)),
                      ),
                    ],
                  ),
                ),
              ),
              children: [
                _buildInfoRow(
                  label: 'House / Flat & Street',
                  value: address,
                  icon: Icons.home_outlined,
                ),
                _buildDivider(),
                _buildInfoRow(
                  label: 'Assigned Route Area',
                  value: area,
                  icon: Icons.map_outlined,
                  badge: 'Service Area',
                  badgeColor: const Color(0xFF1D4ED8),
                  badgeBg: const Color(0xFFEFF6FF),
                ),
                if (landmark.isNotEmpty && landmark != 'None') ...[
                  _buildDivider(),
                  _buildInfoRow(
                    label: 'Landmark',
                    value: landmark,
                    icon: Icons.near_me_outlined,
                  ),
                ],
                _buildDivider(),
                _buildInfoRow(
                  label: 'Delivery Slot',
                  value: deliverySlot,
                  icon: Icons.wb_sunny_outlined,
                ),
              ],
            ),
            const SizedBox(height: 14),

            // 4. Daily Subscription & Fulfillment Plan Card
            _buildSectionCard(
              title: 'Subscription & Delivery Plan',
              icon: Icons.local_drink_outlined,
              children: [
                _buildInfoRow(
                  label: 'Current Plan',
                  value: planName,
                  icon: Icons.card_membership_rounded,
                ),
                _buildDivider(),
                _buildInfoRow(
                  label: 'Daily Milk Quota',
                  value: '$milkQty L Pure Milk${curdQty > 0 ? ' + ${curdQty}g Curd' : ''}',
                  icon: Icons.opacity_rounded,
                  badge: frequency.toUpperCase(),
                  badgeColor: const Color(0xFF0D5C3A),
                  badgeBg: const Color(0xFFE2F1EA),
                ),
                _buildDivider(),
                _buildInfoRow(
                  label: 'Subscription Validity',
                  value: '$expiryDate ($daysRemaining days remaining)',
                  icon: Icons.calendar_today_rounded,
                ),
                _buildDivider(),
                _buildInfoRow(
                  label: 'Assigned Delivery Partner',
                  value: deliveryBoyName,
                  icon: Icons.delivery_dining_rounded,
                  badge: 'Driver',
                  badgeColor: const Color(0xFFB45309),
                  badgeBg: const Color(0xFFFEF3C7),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // 5. Account Balance & Orders Card
            _buildSectionCard(
              title: 'Wallet & Order History',
              icon: Icons.account_balance_wallet_outlined,
              children: [
                _buildInfoRow(
                  label: 'Current Balance',
                  value: balance > 0
                      ? '₹$balance (Payment Due)'
                      : balance < 0
                          ? '₹${balance.abs()} (Advance Balance)'
                          : '₹0 (Clear)',
                  icon: Icons.currency_rupee_rounded,
                  badge: balance > 0
                      ? 'DUE'
                      : balance < 0
                          ? 'ADVANCE'
                          : 'SETTLED',
                  badgeColor: balance > 0
                      ? const Color(0xFFDC2626)
                      : balance < 0
                          ? const Color(0xFF2563EB)
                          : const Color(0xFF0D5C3A),
                  badgeBg: balance > 0
                      ? const Color(0xFFFEE2E2)
                      : balance < 0
                          ? const Color(0xFFEFF6FF)
                          : const Color(0xFFE2F1EA),
                ),
                _buildDivider(),
                InkWell(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const SubscriptionHistoryScreen(),
                      ),
                    );
                  },
                  borderRadius: BorderRadius.circular(10),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(7),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEFF6FF),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.receipt_long_rounded, color: Color(0xFF1D4ED8), size: 16),
                        ),
                        const SizedBox(width: 10),
                        const Expanded(
                          child: Text(
                            'View Subscription Orders & Razorpay History',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF1D4ED8),
                            ),
                          ),
                        ),
                        const Icon(Icons.chevron_right_rounded, color: Color(0xFF1D4ED8), size: 20),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // 6. Help & Support Action Card
            InkWell(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const ContactSupportScreen()),
                );
              },
              borderRadius: BorderRadius.circular(16),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2EBE5)),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE2F1EA),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.headset_mic_outlined, color: Color(0xFF0D5C3A), size: 20),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Need to update your details or address?',
                            style: TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF0C2340),
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Contact 24/7 Dairy Support on WhatsApp or Phone',
                            style: TextStyle(
                              fontSize: 11.5,
                              color: Color(0xFF6B7280),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right_rounded, color: Color(0xFF9CA3AF), size: 20),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionCard({
    required String title,
    required IconData icon,
    required List<Widget> children,
    Widget? action,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2EBE5)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.015),
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
                  Icon(icon, size: 17, color: const Color(0xFF0D5C3A)),
                  const SizedBox(width: 8),
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF0C2340),
                    ),
                  ),
                ],
              ),
              ?action,
            ],
          ),
          const SizedBox(height: 12),
          ...children,
        ],
      ),
    );
  }

  void _showEditProfileSheet(
    BuildContext context,
    CustomerProvider customerProvider,
    AuthProvider auth,
    String currentName,
    String currentMobile,
    String currentEmail,
    String currentAddress,
    String currentArea,
    String currentLandmark,
  ) {
    final TextEditingController nameCtrl = TextEditingController(text: currentName);
    final TextEditingController mobileCtrl = TextEditingController(text: currentMobile);
    final TextEditingController emailCtrl = TextEditingController(
      text: currentEmail == 'Not provided' ? '' : currentEmail,
    );
    final TextEditingController addressCtrl = TextEditingController(
      text: currentAddress == 'Home Delivery Address' ? '' : currentAddress,
    );
    final TextEditingController landmarkCtrl = TextEditingController(
      text: (currentLandmark == 'None' || currentLandmark == 'Not provided') ? '' : currentLandmark,
    );

    String selectedArea = currentArea.isNotEmpty ? currentArea : 'Madhapur';
    final List<String> areas = [
      'Madhapur',
      'Gachibowli',
      'Hitec City',
      'Kondapur',
      'Jubilee Hills',
      'Banjara Hills',
      'Financial District',
      'Kukatpally',
      'Manikonda',
    ];
    if (!areas.contains(selectedArea)) {
      areas.insert(0, selectedArea);
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) {
        return StatefulBuilder(
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
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 44,
                        height: 4,
                        decoration: BoxDecoration(
                          color: const Color(0xFFE2E8F0),
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Edit Account Details',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF0C2340),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close_rounded, color: Color(0xFF64748B)),
                          onPressed: () => Navigator.pop(sheetCtx),
                        ),
                      ],
                    ),
                    const Text(
                      'Update your profile information, contact number, and delivery coordinates.',
                      style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B)),
                    ),
                    const SizedBox(height: 18),

                    // Full Name
                    const Text(
                      'Full Name *',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: nameCtrl,
                      decoration: InputDecoration(
                        hintText: 'Enter your full name',
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF0D5C3A), width: 1.5)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Mobile
                    const Text(
                      'Mobile Number (Login ID) *',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: mobileCtrl,
                      keyboardType: TextInputType.phone,
                      decoration: InputDecoration(
                        hintText: '10-digit mobile number',
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF0D5C3A), width: 1.5)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Email Address
                    const Text(
                      'Email Address (Optional)',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: emailCtrl,
                      keyboardType: TextInputType.emailAddress,
                      decoration: InputDecoration(
                        hintText: 'name@example.com',
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF0D5C3A), width: 1.5)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Delivery Address
                    const Text(
                      'Doorstep Delivery Address',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: addressCtrl,
                      decoration: InputDecoration(
                        hintText: 'Flat / House No, Building, Street',
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF0D5C3A), width: 1.5)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Area Dropdown
                    const Text(
                      'Route Area',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: selectedArea,
                          isExpanded: true,
                          items: areas.map((a) {
                            return DropdownMenuItem(
                              value: a,
                              child: Text(a, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700)),
                            );
                          }).toList(),
                          onChanged: (val) {
                            if (val != null) {
                              setSheetState(() => selectedArea = val);
                            }
                          },
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Landmark
                    const Text(
                      'Landmark / Directions',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: landmarkCtrl,
                      decoration: InputDecoration(
                        hintText: 'e.g. Near Community Park Gate',
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF0D5C3A), width: 1.5)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 22),

                    // Save Button
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0D5C3A),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          elevation: 0,
                        ),
                        onPressed: () async {
                          final messenger = ScaffoldMessenger.of(context);
                          final newName = nameCtrl.text.trim();
                          final newMobile = mobileCtrl.text.trim();
                          final newEmail = emailCtrl.text.trim();
                          final newAddress = addressCtrl.text.trim();
                          final newLandmark = landmarkCtrl.text.trim();

                          if (newName.isEmpty || newMobile.isEmpty) {
                            messenger.showSnackBar(
                              const SnackBar(content: Text('Please enter name and mobile number')),
                            );
                            return;
                          }

                          Navigator.pop(sheetCtx);

                          final ok = await customerProvider.updateCustomerProfile(
                            name: newName,
                            mobile: newMobile,
                            email: newEmail,
                            address: newAddress,
                            area: selectedArea,
                            landmark: newLandmark,
                          );

                          if (ok) {
                            auth.updateUserProfile(
                              name: newName,
                              mobile: newMobile,
                              email: newEmail,
                              address: newAddress,
                              area: selectedArea,
                            );
                            messenger.showSnackBar(
                              const SnackBar(
                                content: Text('✓ Account details updated successfully!'),
                                backgroundColor: Color(0xFF0D5C3A),
                              ),
                            );
                          } else {
                            messenger.showSnackBar(
                              const SnackBar(
                                content: Text('Failed to update account details. Please try again.'),
                                backgroundColor: Colors.red,
                              ),
                            );
                          }
                        },
                        child: const Text(
                          'Save Changes',
                          style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800, color: Colors.white),
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

  Widget _buildInfoRow({
    required String label,
    required String value,
    required IconData icon,
    String? badge,
    Color? badgeColor,
    Color? badgeBg,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: const Color(0xFF94A3B8)),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xFF64748B),
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF0F172A),
                  ),
                ),
              ],
            ),
          ),
          if (badge != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
              decoration: BoxDecoration(
                color: badgeBg ?? const Color(0xFFE2F1EA),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                badge,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  color: badgeColor ?? const Color(0xFF0D5C3A),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildDivider() {
    return const Divider(height: 16, thickness: 0.8, color: Color(0xFFF1F5F9));
  }
}
