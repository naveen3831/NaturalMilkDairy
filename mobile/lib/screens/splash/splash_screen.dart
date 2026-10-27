import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_constants.dart';
import '../../providers/auth_provider.dart';
import '../../providers/product_provider.dart';
import '../admin/admin_dashboard_screen.dart';
import '../delivery/delivery_dashboard_screen.dart';
import '../onboarding/onboarding_screen.dart';
import '../home/home_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );

    _scaleAnimation = CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOutBack,
    );

    _fadeAnimation = CurvedAnimation(
      parent: _animController,
      curve: Curves.easeIn,
    );

    _animController.forward();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initializeApp();
    });
  }

  Future<void> _initializeApp() async {
    if (!mounted) return;
    context.read<ProductProvider>().loadProducts();

    final authProvider = context.read<AuthProvider>();
    final isAuth = await authProvider.initAuth();

    // Minimum splash duration for smooth logo reveal
    await Future.delayed(const Duration(milliseconds: 1500));

    if (!mounted) return;

    if (isAuth) {
      // If user is logged in, DO NOT show onboarding screens
      Widget target = const HomeScreen();
      if (authProvider.isAdmin) {
        target = const AdminDashboardScreen();
      } else if (authProvider.isDeliveryBoy) {
        target = const DeliveryPartnerDashboardScreen();
      }
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => target),
      );
    } else {
      // Without login -> show onboarding screens
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const OnboardingScreen()),
      );
    }
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),

              // Brand Logo in Circular Emblem
              ScaleTransition(
                scale: _scaleAnimation,
                child: Container(
                  width: 124,
                  height: 124,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF0D5C3A).withValues(alpha: 0.12),
                        blurRadius: 30,
                        offset: const Offset(0, 10),
                      ),
                    ],
                    border: Border.all(
                      color: const Color(0xFFE2EBE5),
                      width: 1.5,
                    ),
                  ),
                  child: ClipOval(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Image.asset(
                        'assets/images/logo.png',
                        fit: BoxFit.contain,
                        errorBuilder: (ctx, err, stack) => const Icon(
                          Icons.water_drop_rounded,
                          size: 64,
                          color: Color(0xFF0D5C3A),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 28),

              // Brand Name & Tagline
              FadeTransition(
                opacity: _fadeAnimation,
                child: Column(
                  children: [
                    const Text(
                      AppConstants.appName,
                      style: TextStyle(
                        color: Color(0xFF0C2340),
                        fontSize: 27,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.6,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE8F5EE),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: const Color(0xFFD1FAE5),
                        ),
                      ),
                      child: const Text(
                        '100% Raw • Unadulterated • Farm Fresh',
                        style: TextStyle(
                          color: Color(0xFF047857),
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.4,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),

              // Bottom Brand Promise Footnote
              FadeTransition(
                opacity: _fadeAnimation,
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 24.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: Color(0xFF059669),
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Text(
                        'Direct Farm-to-Doorstep Daily by 6:30 AM',
                        style: TextStyle(
                          color: Color(0xFF597361),
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
