import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_constants.dart';
import '../auth/login_screen.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  final List<Map<String, dynamic>> _slides = [
    {
      'type': 'logo',
      'image': 'assets/images/logo.png',
      'networkImage': 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791460679/natural-milk-dairy/branding/logo.jpg',
      'tag': '100% PURE & RAW',
      'tagIcon': Icons.verified_rounded,
      'title': 'Pure Farm Fresh Milk',
      'desc': 'Direct from healthy grass-fed cows to your doorstep every morning. Unprocessed, pure, and rich in natural nutrients.',
      'accent': AppColors.primaryGreen,
      'features': ['100% Raw Milk', 'Sterilized Glass Bottles', 'Chilled to 4°C'],
    },
    {
      'type': 'image',
      'image': 'assets/images/glass-bottles.jpg',
      'networkImage': 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454810/natural-milk-dairy/glass-bottles.jpg',
      'tag': 'DAILY MORNING DROP',
      'tagIcon': Icons.wb_twilight_rounded,
      'title': 'Delivered by 6:30 AM',
      'desc': 'Quiet doorstep drop before your day begins. Verified with doorstep photo proof and GPS tracking for complete peace of mind.',
      'accent': AppColors.dairyBlue,
      'features': ['By 6:30 AM Daily', 'Doorstep Photo Proof', 'Contactless Drop'],
    },
    {
      'type': 'image',
      'image': 'assets/images/milk-pour.jpg',
      'networkImage': 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454811/natural-milk-dairy/milk-pour.jpg',
      'tag': 'SMART SUBSCRIPTION',
      'tagIcon': Icons.bolt_rounded,
      'title': 'Smart Subscriptions',
      'desc': 'Going out of town or having guests over? Pause, resume, or modify your daily quantities anytime with zero commitments.',
      'accent': AppColors.primaryGreen,
      'features': ['Pause Anytime', 'Adjust Quantities', 'Zero Lock-in'],
    },
  ];

  Future<void> _completeOnboarding(Widget targetScreen) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(AppConstants.keyOnboardingSeen, true);

    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => targetScreen),
    );
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.creamBg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leadingWidth: 180,
        leading: Padding(
          padding: const EdgeInsets.only(left: 18.0),
          child: Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
                padding: const EdgeInsets.all(4),
                child: Image.asset(
                  'assets/images/logo.png',
                  fit: BoxFit.contain,
                  errorBuilder: (_, _, _) => const Icon(Icons.water_drop, size: 18, color: AppColors.primaryGreen),
                ),
              ),
              const SizedBox(width: 8),
              const Text(
                'Natural Milk',
                style: TextStyle(
                  color: AppColors.dairyBlue,
                  fontWeight: FontWeight.w800,
                  fontSize: 15,
                ),
              ),
            ],
          ),
        ),
        actions: [
          // Skip button is visible on ALL screens (Screen 1, Screen 2, and Screen 3)
          Padding(
            padding: const EdgeInsets.only(right: 14.0),
            child: TextButton(
              onPressed: () => _completeOnboarding(const LoginScreen()),
              style: TextButton.styleFrom(
                backgroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                  side: const BorderSide(color: Color(0xFFE2EBE5)),
                ),
                elevation: 0,
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Skip',
                    style: TextStyle(
                      color: Color(0xFF597361),
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                  SizedBox(width: 2),
                  Icon(Icons.chevron_right_rounded, size: 16, color: Color(0xFF597361)),
                ],
              ),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                itemCount: _slides.length,
                onPageChanged: (index) {
                  setState(() => _currentPage = index);
                },
                itemBuilder: (context, index) {
                  final slide = _slides[index];
                  final Color accentColor = slide['accent'] as Color;
                  final List<String> features = List<String>.from(slide['features'] as List);

                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24.0),
                    child: Center(
                      child: SingleChildScrollView(
                        physics: const BouncingScrollPhysics(),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            // ── Visual Card: Logo for Screen 1, Clean Minimalist Media Cards for Screens 2 & 3 ──
                            if (slide['type'] == 'logo')
                              Stack(
                                alignment: Alignment.center,
                                clipBehavior: Clip.none,
                                children: [
                                  Container(
                                    width: 140,
                                    height: 140,
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      shape: BoxShape.circle,
                                      boxShadow: [
                                        BoxShadow(
                                          color: AppColors.primaryGreen.withValues(alpha: 0.16),
                                          blurRadius: 26,
                                          offset: const Offset(0, 8),
                                        ),
                                      ],
                                      border: Border.all(
                                        color: const Color(0xFF0D5C3A).withValues(alpha: 0.25),
                                        width: 2.5,
                                      ),
                                    ),
                                    child: Center(
                                      child: ClipOval(
                                        child: Padding(
                                          padding: const EdgeInsets.all(14.0),
                                          child: Image.asset(
                                            'assets/images/logo.png',
                                            fit: BoxFit.contain,
                                            errorBuilder: (_, _, _) => Image.network(
                                              slide['networkImage'] as String,
                                              fit: BoxFit.contain,
                                              errorBuilder: (_, _, _) => const Icon(
                                                Icons.water_drop_rounded,
                                                size: 56,
                                                color: AppColors.primaryGreen,
                                              ),
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                  Positioned(
                                    bottom: -8,
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                                      decoration: BoxDecoration(
                                        color: AppColors.primaryGreen,
                                        borderRadius: BorderRadius.circular(20),
                                        boxShadow: [
                                          BoxShadow(
                                            color: AppColors.primaryGreen.withValues(alpha: 0.35),
                                            blurRadius: 8,
                                            offset: const Offset(0, 3),
                                          ),
                                        ],
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(slide['tagIcon'] as IconData, size: 13, color: Colors.white),
                                          const SizedBox(width: 4),
                                          Text(
                                            slide['tag'] as String,
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontWeight: FontWeight.w800,
                                              fontSize: 10.5,
                                              letterSpacing: 0.6,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              )
                            else
                              // Professional, Simple & Elegant Card for Screens 2 & 3
                              Container(
                                width: 280,
                                height: 180,
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(22),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withValues(alpha: 0.08),
                                      blurRadius: 22,
                                      offset: const Offset(0, 8),
                                    ),
                                  ],
                                  border: Border.all(
                                    color: const Color(0xFFE2EBE5),
                                    width: 1.2,
                                  ),
                                ),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(21),
                                  child: Stack(
                                    fit: StackFit.expand,
                                    children: [
                                      // Image with smooth loading and local fallback
                                      Image.network(
                                        slide['networkImage'] as String,
                                        fit: BoxFit.cover,
                                        loadingBuilder: (context, child, progress) {
                                          if (progress == null) return child;
                                          return Container(
                                            color: const Color(0xFFF1F5F3),
                                            child: Center(
                                              child: CircularProgressIndicator(
                                                strokeWidth: 2,
                                                color: accentColor,
                                              ),
                                            ),
                                          );
                                        },
                                        errorBuilder: (_, _, _) => Image.asset(
                                          slide['image'] as String,
                                          fit: BoxFit.cover,
                                          errorBuilder: (_, _, _) => Container(
                                            color: accentColor.withValues(alpha: 0.1),
                                            child: Center(
                                              child: Icon(Icons.eco_rounded, size: 54, color: accentColor),
                                            ),
                                          ),
                                        ),
                                      ),

                                      // Subtle bottom gradient for contrast
                                      Positioned.fill(
                                        child: DecoratedBox(
                                          decoration: BoxDecoration(
                                            gradient: LinearGradient(
                                              begin: Alignment.topCenter,
                                              end: Alignment.bottomCenter,
                                              colors: [
                                                Colors.transparent,
                                                Colors.black.withValues(alpha: 0.35),
                                              ],
                                            ),
                                          ),
                                        ),
                                      ),

                                      // Elegant floating badge pill
                                      Positioned(
                                        top: 12,
                                        left: 12,
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: Colors.white.withValues(alpha: 0.94),
                                            borderRadius: BorderRadius.circular(16),
                                            boxShadow: [
                                              BoxShadow(
                                                color: Colors.black.withValues(alpha: 0.12),
                                                blurRadius: 6,
                                                offset: const Offset(0, 2),
                                              ),
                                            ],
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Icon(slide['tagIcon'] as IconData, size: 12, color: accentColor),
                                              const SizedBox(width: 4),
                                              Text(
                                                slide['tag'] as String,
                                                style: TextStyle(
                                                  color: accentColor,
                                                  fontSize: 10,
                                                  fontWeight: FontWeight.w800,
                                                  letterSpacing: 0.4,
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

                            const SizedBox(height: 22),

                            // Headline
                            Text(
                              slide['title'] as String,
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                color: AppColors.dairyBlue,
                                fontSize: 22,
                                fontWeight: FontWeight.w800,
                                letterSpacing: -0.5,
                              ),
                            ),
                            const SizedBox(height: 8),

                            // Subtitle description
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 8.0),
                              child: Text(
                                slide['desc'] as String,
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  color: Color(0xFF64748B),
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.w500,
                                  height: 1.45,
                                ),
                              ),
                            ),

                            const SizedBox(height: 16),

                            // Feature Pills for Clean & Professional Touch
                            Wrap(
                              alignment: WrapAlignment.center,
                              spacing: 8,
                              runSpacing: 6,
                              children: features.map((f) {
                                return Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: const Color(0xFFE2E8F0)),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withValues(alpha: 0.02),
                                        blurRadius: 4,
                                        offset: const Offset(0, 1),
                                      ),
                                    ],
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(Icons.check_circle_rounded, size: 12, color: AppColors.primaryGreen),
                                      const SizedBox(width: 4),
                                      Text(
                                        f,
                                        style: const TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w700,
                                          color: Color(0xFF334155),
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              }).toList(),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),

            // Pagination Dots
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(_slides.length, (index) {
                final bool isActive = _currentPage == index;
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  width: isActive ? 24 : 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: isActive ? AppColors.primaryGreen : AppColors.borderSubtle,
                    borderRadius: BorderRadius.circular(4),
                  ),
                );
              }),
            ),
            const SizedBox(height: 20),

            // Bottom Action
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
              child: SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: () {
                    if (_currentPage < _slides.length - 1) {
                      _pageController.nextPage(
                        duration: const Duration(milliseconds: 320),
                        curve: Curves.easeOutCubic,
                      );
                    } else {
                      _completeOnboarding(const LoginScreen());
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryGreen,
                    foregroundColor: Colors.white,
                    elevation: 2,
                    shadowColor: AppColors.primaryGreen.withValues(alpha: 0.3),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        _currentPage == _slides.length - 1 ? 'Get Started' : 'Next',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.2,
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Icon(Icons.arrow_forward_rounded, size: 19),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
