import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../data/services/google_auth_service.dart';
import '../../providers/auth_provider.dart';
import '../../providers/customer_provider.dart';
import '../admin/admin_dashboard_screen.dart';
import '../delivery/delivery_dashboard_screen.dart';
import '../home/home_screen.dart';

class GoogleCompleteProfileScreen extends StatefulWidget {
  final GoogleAuthResult googleResult;

  const GoogleCompleteProfileScreen({
    super.key,
    required this.googleResult,
  });

  @override
  State<GoogleCompleteProfileScreen> createState() => _GoogleCompleteProfileScreenState();
}

class _GoogleCompleteProfileScreenState extends State<GoogleCompleteProfileScreen> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _nameController;
  final TextEditingController _mobileController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController = TextEditingController();

  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.googleResult.displayName);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _mobileController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    setState(() => _errorMessage = null);
    if (!_formKey.currentState!.validate()) return;

    final phoneDigits = _mobileController.text.trim().replaceAll(RegExp(r'\D'), '');
    if (phoneDigits.length != 10) {
      setState(() => _errorMessage = 'Please enter a valid 10-digit mobile number.');
      return;
    }

    if (_passwordController.text != _confirmPasswordController.text) {
      setState(() => _errorMessage = 'Passwords do not match.');
      return;
    }

    setState(() => _isLoading = true);
    final auth = context.read<AuthProvider>();

    try {
      final res = await auth.loginWithGoogleToken(
        widget.googleResult.idToken,
        portal: 'customer',
        email: widget.googleResult.email,
        name: _nameController.text.trim(),
        mobile: phoneDigits,
        password: _passwordController.text,
      );

      if (!mounted) return;

      if (res['success'] == true && res['requiresMobile'] != true && res['requiresProfileCompletion'] != true) {
        if (mounted) {
          context.read<CustomerProvider>().clearCustomerData();
        }
        final user = auth.user;
        Widget target = const HomeScreen();
        if (auth.isAdmin || user?.isAdmin == true) {
          target = const AdminDashboardScreen();
        } else if (auth.isDeliveryBoy || user?.isDeliveryBoy == true) {
          target = const DeliveryPartnerDashboardScreen();
        }

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors.primaryGreen,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            content: Row(
              children: [
                const Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Welcome to Natural Milk Dairy, ${_nameController.text.trim()}!',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),
        );

        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => target),
          (route) => false,
        );
      } else {
        setState(() {
          _errorMessage = res['message']?.toString() ?? 'Unable to complete registration. Please try again.';
          _isLoading = false;
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.creamBg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: AppColors.textMain),
          onPressed: () {
            GoogleAuthService.signOut();
            Navigator.of(context).pop();
          },
        ),
        title: const Text(
          'Complete Profile',
          style: TextStyle(
            color: AppColors.textMain,
            fontWeight: FontWeight.w800,
            fontSize: 18,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Header Card with Google Email (read-only)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.borderSubtle),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0x0A000000),
                        blurRadius: 16,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          if (widget.googleResult.photoUrl != null &&
                              widget.googleResult.photoUrl!.isNotEmpty)
                            ClipRRect(
                              borderRadius: BorderRadius.circular(24),
                              child: Image.network(
                                widget.googleResult.photoUrl!,
                                width: 48,
                                height: 48,
                                fit: BoxFit.cover,
                                errorBuilder: (_, _, _) => _buildGoogleIconFallback(),
                              ),
                            )
                          else
                            _buildGoogleIconFallback(),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Flexible(
                                      child: Text(
                                        widget.googleResult.displayName.isNotEmpty
                                            ? widget.googleResult.displayName
                                            : 'Google Account',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w800,
                                          fontSize: 16,
                                          color: AppColors.textMain,
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: AppColors.badgeSuccessBg,
                                        borderRadius: BorderRadius.circular(20),
                                        border: Border.all(color: AppColors.badgeSuccessBorder),
                                      ),
                                      child: const Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(Icons.verified_rounded, size: 12, color: AppColors.badgeSuccessText),
                                          SizedBox(width: 3),
                                          Text(
                                            'Google',
                                            style: TextStyle(
                                              fontSize: 10,
                                              fontWeight: FontWeight.w700,
                                              color: AppColors.badgeSuccessText,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                // Locked Email Address Display
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: AppColors.creamBg,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(Icons.mail_outline_rounded, size: 14, color: AppColors.primaryGreen),
                                      const SizedBox(width: 6),
                                      Flexible(
                                        child: Text(
                                          widget.googleResult.email,
                                          style: const TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w600,
                                            color: AppColors.textMain,
                                          ),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                      const Icon(Icons.lock_outline_rounded, size: 12, color: AppColors.textLight),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      const Divider(height: 1, color: AppColors.borderLight),
                      const SizedBox(height: 10),
                      const Text(
                        'This email is verified with Google. Please set your mobile number and password to complete your account setup.',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.textMuted,
                          height: 1.35,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // Error Message if any
                if (_errorMessage != null) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.badgeDangerBg,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.badgeDangerText.withAlpha(76)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.error_outline_rounded, color: AppColors.badgeDangerText, size: 18),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            _errorMessage!,
                            style: const TextStyle(
                              color: AppColors.badgeDangerText,
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),
                ],

                // Name Field
                const Text(
                  'Full Name',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                    color: AppColors.textMain,
                  ),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _nameController,
                  textCapitalization: TextCapitalization.words,
                  decoration: InputDecoration(
                    hintText: 'Enter your full name',
                    prefixIcon: const Icon(Icons.person_outline_rounded, color: AppColors.primaryGreen, size: 20),
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppColors.borderSubtle),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppColors.borderSubtle),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppColors.primaryGreen, width: 2),
                    ),
                  ),
                  validator: (val) {
                    if (val == null || val.trim().length < 2) {
                      return 'Please enter at least 2 characters';
                    }
                    return null;
                  },
                ),

                const SizedBox(height: 18),

                // Phone Number Field
                const Text(
                  'Phone Number',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                    color: AppColors.textMain,
                  ),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _mobileController,
                  keyboardType: TextInputType.phone,
                  maxLength: 10,
                  decoration: InputDecoration(
                    prefixText: '+91  ',
                    prefixStyle: const TextStyle(
                      fontWeight: FontWeight.w700,
                      color: AppColors.textMain,
                      fontSize: 15,
                    ),
                    hintText: '9876543210',
                    counterText: '',
                    prefixIcon: const Icon(Icons.phone_iphone_rounded, color: AppColors.primaryGreen, size: 20),
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppColors.borderSubtle),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppColors.borderSubtle),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppColors.primaryGreen, width: 2),
                    ),
                  ),
                  validator: (val) {
                    final digits = (val ?? '').replaceAll(RegExp(r'\D'), '');
                    if (digits.length != 10) {
                      return 'Enter a valid 10-digit mobile number';
                    }
                    if (!RegExp(r'^[6-9]\d{9}$').hasMatch(digits)) {
                      return 'Mobile number must start with 6, 7, 8, or 9';
                    }
                    return null;
                  },
                ),

                const SizedBox(height: 18),

                // Password Field
                const Text(
                  'Create Password',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                    color: AppColors.textMain,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Allows you to sign in via password as well as Google in the future.',
                  style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  decoration: InputDecoration(
                    hintText: 'Min. 8 characters',
                    prefixIcon: const Icon(Icons.lock_outline_rounded, color: AppColors.primaryGreen, size: 20),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                        color: AppColors.textMuted,
                        size: 20,
                      ),
                      onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                    ),
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppColors.borderSubtle),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppColors.borderSubtle),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppColors.primaryGreen, width: 2),
                    ),
                  ),
                  validator: (val) {
                    if (val == null || val.length < 8) {
                      return 'Password must be at least 8 characters';
                    }
                    return null;
                  },
                ),

                const SizedBox(height: 18),

                // Confirm Password Field
                const Text(
                  'Confirm Password',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                    color: AppColors.textMain,
                  ),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _confirmPasswordController,
                  obscureText: _obscureConfirmPassword,
                  decoration: InputDecoration(
                    hintText: 'Re-enter password',
                    prefixIcon: const Icon(Icons.lock_reset_rounded, color: AppColors.primaryGreen, size: 20),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscureConfirmPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                        color: AppColors.textMuted,
                        size: 20,
                      ),
                      onPressed: () => setState(() => _obscureConfirmPassword = !_obscureConfirmPassword),
                    ),
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppColors.borderSubtle),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppColors.borderSubtle),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppColors.primaryGreen, width: 2),
                    ),
                  ),
                  validator: (val) {
                    if (val != _passwordController.text) {
                      return 'Passwords do not match';
                    }
                    return null;
                  },
                ),

                const SizedBox(height: 28),

                // Submit Button
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _handleSubmit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primaryGreen,
                      foregroundColor: Colors.white,
                      disabledBackgroundColor: AppColors.primaryGreen.withAlpha(153),
                      elevation: 2,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.5,
                              color: Colors.white,
                            ),
                          )
                        : const Text(
                            'Complete & Start Fresh Milk Drops',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                  ),
                ),

                const SizedBox(height: 16),

                Center(
                  child: TextButton(
                    onPressed: _isLoading
                        ? null
                        : () {
                            GoogleAuthService.signOut();
                            Navigator.of(context).pop();
                          },
                    child: const Text(
                      'Cancel and return',
                      style: TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildGoogleIconFallback() {
    return Container(
      width: 48,
      height: 48,
      decoration: const BoxDecoration(
        color: AppColors.primaryGreenSoft,
        shape: BoxShape.circle,
      ),
      child: const Center(
        child: Text(
          'G',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w900,
            color: AppColors.primaryGreen,
          ),
        ),
      ),
    );
  }
}
