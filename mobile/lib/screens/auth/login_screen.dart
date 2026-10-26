import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../data/services/api_service.dart';
import '../../providers/auth_provider.dart';
import '../admin/admin_dashboard_screen.dart';
import '../delivery/delivery_dashboard_screen.dart';
import '../home/home_screen.dart';
import 'register_screen.dart';
import 'forgot_password_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _obscurePassword = true;

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    final auth = context.read<AuthProvider>();
    final success = await auth.login(
      _identifierController.text.trim(),
      _passwordController.text,
    );

    if (!mounted) return;

    if (success) {
      final user = auth.user;
      Widget target = const HomeScreen();
      if (auth.isAdmin || user?.isAdmin == true) {
        target = const AdminDashboardScreen();
      } else if (auth.isDeliveryBoy || user?.isDeliveryBoy == true) {
        target = const DeliveryPartnerDashboardScreen();
      }
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => target),
        (route) => false,
      );
    }
  }

  void _showServerConfigDialog() {
    final apiService = ApiService();
    final urlController = TextEditingController(text: apiService.baseUrl);
    bool? testResult;
    bool isTesting = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.wifi_tethering_rounded, color: AppColors.primaryGreen, size: 22),
              SizedBox(width: 8),
              Text('Server Connection', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Quick Presets (Tap to select):',
                  style: TextStyle(fontSize: 12, color: AppColors.textMuted, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    ActionChip(
                      label: const Text('USB (127.0.0.1)', style: TextStyle(fontSize: 11)),
                      backgroundColor: AppColors.primaryGreenSoft,
                      onPressed: () => setDialogState(() => urlController.text = 'http://127.0.0.1:5000'),
                    ),
                    ActionChip(
                      label: const Text('Wi-Fi (192.168.1.68)', style: TextStyle(fontSize: 11)),
                      backgroundColor: AppColors.primaryGreenSoft,
                      onPressed: () => setDialogState(() => urlController.text = 'http://192.168.1.68:5000'),
                    ),
                    ActionChip(
                      label: const Text('Emulator (10.0.2.2)', style: TextStyle(fontSize: 11)),
                      backgroundColor: AppColors.primaryGreenSoft,
                      onPressed: () => setDialogState(() => urlController.text = 'http://10.0.2.2:5000'),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: urlController,
                  decoration: const InputDecoration(
                    labelText: 'Backend URL',
                    hintText: 'http://192.168.1.68:5000',
                    isDense: true,
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    TextButton.icon(
                      onPressed: isTesting
                          ? null
                          : () async {
                              setDialogState(() {
                                isTesting = true;
                                testResult = null;
                              });
                              final ok = await apiService.testConnection(urlController.text.trim());
                              setDialogState(() {
                                isTesting = false;
                                testResult = ok;
                              });
                            },
                      icon: isTesting
                          ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                          : Icon(
                              testResult == true
                                  ? Icons.check_circle_rounded
                                  : testResult == false
                                      ? Icons.cancel_rounded
                                      : Icons.network_check_rounded,
                              size: 16,
                              color: testResult == true
                                  ? Colors.green
                                  : testResult == false
                                      ? Colors.red
                                      : AppColors.primaryGreen,
                            ),
                      label: Text(
                        testResult == true
                            ? 'Connected (200 OK)'
                            : testResult == false
                                ? 'Unreachable'
                                : 'Test Ping',
                        style: TextStyle(
                          fontSize: 12,
                          color: testResult == true
                              ? Colors.green
                              : testResult == false
                                  ? Colors.red
                                  : AppColors.primaryGreen,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const Spacer(),
                    TextButton(
                      onPressed: () async {
                        setDialogState(() => isTesting = true);
                        final detected = await apiService.resolveActiveBaseUrl();
                        setDialogState(() {
                          isTesting = false;
                          urlController.text = detected;
                          testResult = true;
                        });
                      },
                      child: const Text('Auto-Detect', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                    ),
                  ],
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                final messenger = ScaffoldMessenger.of(context);
                await apiService.setCustomBaseUrl(urlController.text.trim());
                if (!ctx.mounted) return;
                Navigator.pop(ctx);
                messenger.showSnackBar(
                  SnackBar(content: Text('Server updated to ${apiService.baseUrl}')),
                );
                setState(() {});
              },
              child: const Text('Save & Apply'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      backgroundColor: AppColors.creamBg,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 24.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Brand Header
                Center(
                  child: GestureDetector(
                    onLongPress: _showServerConfigDialog,
                    child: Container(
                      width: 84,
                      height: 84,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primaryGreen.withValues(alpha: 0.12),
                          blurRadius: 16,
                          offset: const Offset(0, 4),
                        ),
                      ],
                      border: Border.all(color: AppColors.primaryGreen.withValues(alpha: 0.2), width: 1.5),
                    ),
                    child: ClipOval(
                      child: Padding(
                        padding: const EdgeInsets.all(12.0),
                        child: Image.asset(
                          'assets/images/logo.png',
                          fit: BoxFit.contain,
                          errorBuilder: (_, _, _) => const Center(
                            child: Icon(
                              Icons.water_drop_rounded,
                              size: 40,
                              color: AppColors.primaryGreen,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
                const SizedBox(height: 20),
                Center(
                  child: Text(
                    'Welcome Back',
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: AppColors.dairyBlue,
                        ),
                  ),
                ),
                const SizedBox(height: 6),
                Center(
                  child: Text(
                    'Sign in to manage your daily morning dairy drop',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.textMuted,
                        ),
                  ),
                ),
                const SizedBox(height: 32),

                // Error Banner
                if (auth.errorMessage != null) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.badgeDangerBg,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.error_outline, size: 20, color: AppColors.badgeDangerText),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            auth.errorMessage!,
                            style: const TextStyle(
                              color: AppColors.badgeDangerText,
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                ],

                // Mobile / Email Field
                const Text(
                  'Mobile Number or Email',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13.5,
                    color: AppColors.textMain,
                  ),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _identifierController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    hintText: 'e.g. 9876543210 or user@example.com',
                    prefixIcon: Icon(Icons.phone_android_rounded, size: 20, color: AppColors.textMuted),
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Please enter your mobile number or email.';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 20),

                // Password Field
                const Text(
                  'Password',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13.5,
                    color: AppColors.textMain,
                  ),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  decoration: InputDecoration(
                    hintText: '••••••••',
                    prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20, color: AppColors.textMuted),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                        size: 20,
                        color: AppColors.textMuted,
                      ),
                      onPressed: () {
                        setState(() => _obscurePassword = !_obscurePassword);
                      },
                    ),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter your password.';
                    }
                    return null;
                  },
                ),

                // Forgot Password Link
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const ForgotPasswordScreen()),
                      );
                    },
                    child: const Text(
                      'Forgot password?',
                      style: TextStyle(
                        color: AppColors.primaryGreen,
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Sign In Button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: auth.isLoading ? null : _handleLogin,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primaryGreen,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: auth.isLoading
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
                          )
                        : const Text(
                            'Sign In',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                          ),
                  ),
                ),
                const SizedBox(height: 12),

                // Guest Mode Button
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () {
                      context.read<AuthProvider>().continueAsGuest();
                      Navigator.pushAndRemoveUntil(
                        context,
                        MaterialPageRoute(builder: (_) => const HomeScreen()),
                        (route) => false,
                      );
                    },
                    icon: const Icon(Icons.person_outline_rounded, color: AppColors.primaryGreen, size: 20),
                    label: const Text(
                      'Continue as Guest',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primaryGreen,
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      side: const BorderSide(color: AppColors.primaryGreen, width: 1.5),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      backgroundColor: Colors.white,
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // Sign Up Footer
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text(
                      "Don't have an account?",
                      style: TextStyle(color: AppColors.textMuted, fontSize: 14),
                    ),
                    TextButton(
                      onPressed: () {
                        Navigator.pushReplacement(
                          context,
                          MaterialPageRoute(builder: (_) => const RegisterScreen()),
                        );
                      },
                      child: const Text(
                        'Create Account',
                        style: TextStyle(
                          color: AppColors.primaryGreen,
                          fontWeight: FontWeight.w800,
                          fontSize: 14,
                        ),
                      ),
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
