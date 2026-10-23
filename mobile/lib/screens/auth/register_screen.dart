import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../data/services/api_service.dart';
import '../../providers/auth_provider.dart';
import '../home/home_screen.dart';
import 'login_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();

  final _nameController = TextEditingController();
  final _mobileController = TextEditingController();
  final _addressController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  String _selectedArea = 'Madhapur';
  List<String> _deliveryAreas = ['Madhapur'];
  bool _areasLoading = true;

  int _milkQty = 1;
  int _curdQty = 0;
  final String _frequency = 'daily';

  bool _obscurePassword = true;
  bool _obscureConfirm = true;

  @override
  void initState() {
    super.initState();
    _loadAreas();
  }

  Future<void> _loadAreas() async {
    final areas = await ApiService().getDeliveryAreas();
    if (!mounted) return;
    setState(() {
      _deliveryAreas = areas;
      if (areas.isNotEmpty && !_deliveryAreas.contains(_selectedArea)) {
        _selectedArea = areas.first;
      }
      _areasLoading = false;
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _mobileController.dispose();
    _addressController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _handleRegister() async {
    if (!_formKey.currentState!.validate()) return;

    final auth = context.read<AuthProvider>();
    final payload = {
      'name': _nameController.text.trim(),
      'mobile': _mobileController.text.trim(),
      'address': _addressController.text.trim(),
      'area': _selectedArea,
      'frequency': _frequency,
      'milkQty': _milkQty,
      'curdQty': _curdQty,
      'password': _passwordController.text,
      'role': 'customer',
    };

    final success = await auth.register(payload);

    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppColors.primaryGreen,
          content: Text('Welcome to Natural Milk Dairy! Your account is active.'),
        ),
      );
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const HomeScreen()),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      backgroundColor: AppColors.creamBg,
      appBar: AppBar(
        title: const Text('Create Account'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: () {
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(builder: (_) => const LoginScreen()),
            );
          },
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 22.0, vertical: 16.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Join Natural Milk Dairy',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppColors.dairyBlue,
                      ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Fresh doorstep delivery starts from tomorrow morning',
                  style: TextStyle(color: AppColors.textMuted, fontSize: 13.5),
                ),
                const SizedBox(height: 24),

                if (auth.errorMessage != null) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 20),
                    decoration: BoxDecoration(
                      color: AppColors.badgeDangerBg,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
                    ),
                    child: Text(
                      auth.errorMessage!,
                      style: const TextStyle(color: AppColors.badgeDangerText, fontWeight: FontWeight.w600, fontSize: 13),
                    ),
                  ),
                ],

                // Full Name
                const Text('Full Name', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _nameController,
                  decoration: const InputDecoration(
                    hintText: 'e.g. Rahul Sharma',
                    prefixIcon: Icon(Icons.person_outline_rounded, size: 20, color: AppColors.textMuted),
                  ),
                  validator: (v) {
                    if (v == null || v.trim().length < 2) return 'Enter a valid name (min 2 chars).';
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                // Mobile
                const Text('Mobile Number', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _mobileController,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    hintText: '10-digit mobile number',
                    prefixIcon: Icon(Icons.phone_android_rounded, size: 20, color: AppColors.textMuted),
                  ),
                  validator: (v) {
                    if (v == null || !RegExp(r'^[6-9]\d{9}$').hasMatch(v.trim())) {
                      return 'Enter a valid 10-digit Indian mobile number.';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                // Delivery Area Dropdown
                const Text('Delivery Location / Area', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                const SizedBox(height: 6),
                _areasLoading
                    ? const Center(child: Padding(padding: EdgeInsets.all(8.0), child: CircularProgressIndicator()))
                    : DropdownButtonFormField<String>(
                        key: ValueKey(_selectedArea),
                        initialValue: _selectedArea,
                        decoration: const InputDecoration(
                          prefixIcon: Icon(Icons.location_on_outlined, size: 20, color: AppColors.textMuted),
                        ),
                        items: _deliveryAreas.map((area) {
                          return DropdownMenuItem<String>(
                            value: area,
                            child: Text(area, style: const TextStyle(fontSize: 14)),
                          );
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) setState(() => _selectedArea = val);
                        },
                      ),
                const SizedBox(height: 16),

                // Full Street Address
                const Text('Street Address & Flat / House No.', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _addressController,
                  maxLines: 2,
                  decoration: const InputDecoration(
                    hintText: 'e.g. Flat 302, Green Valley Apts, Road No. 12',
                    prefixIcon: Icon(Icons.home_outlined, size: 20, color: AppColors.textMuted),
                  ),
                  validator: (v) {
                    if (v == null || v.trim().length < 5) return 'Please provide full doorstep address.';
                    return null;
                  },
                ),
                const SizedBox(height: 20),

                // Initial Daily Subscription Card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.primaryGreenSoft,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.primaryGreen.withValues(alpha: 0.2)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.local_shipping_rounded, color: AppColors.primaryGreen, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            'Daily Morning Order (5:00 AM – 6:30 AM)',
                            style: TextStyle(
                              color: AppColors.primaryGreenDark,
                              fontWeight: FontWeight.w800,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Daily Milk (Litre):', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                          Row(
                            children: [
                              IconButton(
                                icon: const Icon(Icons.remove_circle_outline, color: AppColors.primaryGreen),
                                onPressed: _milkQty > 1 ? () => setState(() => _milkQty--) : null,
                              ),
                              Text('$_milkQty L', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                              IconButton(
                                icon: const Icon(Icons.add_circle_outline, color: AppColors.primaryGreen),
                                onPressed: () => setState(() => _milkQty++),
                              ),
                            ],
                          ),
                        ],
                      ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Daily Curd (Grams):', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                          Row(
                            children: [
                              IconButton(
                                icon: const Icon(Icons.remove_circle_outline, color: AppColors.primaryGreen),
                                onPressed: _curdQty >= 500 ? () => setState(() => _curdQty -= 500) : null,
                              ),
                              Text('$_curdQty g', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                              IconButton(
                                icon: const Icon(Icons.add_circle_outline, color: AppColors.primaryGreen),
                                onPressed: () => setState(() => _curdQty += 500),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Password
                const Text('Password', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  decoration: InputDecoration(
                    hintText: 'Min. 8 characters',
                    prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20, color: AppColors.textMuted),
                    suffixIcon: IconButton(
                      icon: Icon(_obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 20),
                      onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                    ),
                  ),
                  validator: (v) {
                    if (v == null || v.length < 8) return 'Password must be at least 8 characters.';
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                // Confirm Password
                const Text('Confirm Password', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _confirmPasswordController,
                  obscureText: _obscureConfirm,
                  decoration: InputDecoration(
                    hintText: 'Re-enter password',
                    prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20, color: AppColors.textMuted),
                    suffixIcon: IconButton(
                      icon: Icon(_obscureConfirm ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 20),
                      onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
                    ),
                  ),
                  validator: (v) {
                    if (v != _passwordController.text) return 'Passwords do not match.';
                    return null;
                  },
                ),
                const SizedBox(height: 28),

                // Submit Button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: auth.isLoading ? null : _handleRegister,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primaryGreen,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    child: auth.isLoading
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
                          )
                        : const Text('Complete Registration', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  ),
                ),
                const SizedBox(height: 20),

                // Back to Login
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('Already have an account?', style: TextStyle(color: AppColors.textMuted)),
                    TextButton(
                      onPressed: () {
                        Navigator.pushReplacement(
                          context,
                          MaterialPageRoute(builder: (_) => const LoginScreen()),
                        );
                      },
                      child: const Text('Sign In', style: TextStyle(color: AppColors.primaryGreen, fontWeight: FontWeight.w800)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
