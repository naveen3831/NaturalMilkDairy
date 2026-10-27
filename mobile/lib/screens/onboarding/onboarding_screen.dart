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
      'title': 'Pure Farm Fresh Milk',
      'desc': '100% raw, unadulterated & harvested fresh daily.',
      'accent': AppColors.primaryGreen,
    },
    {
      'type': 'image',
      'image': 'assets/images/glass-bottles.jpg',
      'networkImage': 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454810/natural-milk-dairy/glass-bottles.jpg',
      'title': 'Delivered by 6:30 AM',
      'desc': 'Contactless doorstep drop with photo verification.',
      'accent': AppColors.dairyBlue,
      'overlayTag': '🌅 Morning Drop',
    },
    {
      'type': 'image',
      'image': 'assets/images/milk-pour.jpg',
      'networkImage': 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454811/natural-milk-dairy/milk-pour.jpg',
      'title': 'Flexible Subscriptions',
      'desc': 'Pause, resume, or adjust quantities anytime with zero lock-in.',
      'accent': AppColors.primaryGreen,
      'overlayTag': '✨ Zero Lock-in',
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
          // Show 'Skip' only on first 2 screens (screens 1 & 2). Hidden on 3rd screen.
          if (_currentPage < _slides.length - 1)
            Padding(
              padding: const EdgeInsets.only(right: 12.0),
              child: TextButton(
                onPressed: () => _completeOnboarding(const LoginScreen()),
                style: TextButton.styleFrom(
                  backgroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                    side: const BorderSide(color: Color(0xFFE2EBE5)),
                  ),
                ),
                child: const Text(
                  'Skip',
                  style: TextStyle(
                    color: Color(0xFF597361),
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                ),
              ),
            )
          else
            const SizedBox.shrink(),
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

                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 28.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Slide Visual: Redesigned Logo for Screen 1, Dual-Source Farm & Milk Imagery for Screens 2 & 3
                        if (slide['type'] == 'logo')
                          Stack(
                            alignment: Alignment.center,
                            clipBehavior: Clip.none,
                            children: [
                              Container(
                                width: 160,
                                height: 160,
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
                                      padding: const EdgeInsets.all(16.0),
                                      child: Image.asset(
                                        'assets/images/logo.png',
                                        fit: BoxFit.contain,
                                        errorBuilder: (_, _, _) => Image.network(
                                          slide['networkImage'] as String,
                                          fit: BoxFit.contain,
                                          errorBuilder: (_, _, _) => const Icon(
                                            Icons.water_drop_rounded,
                                            size: 64,
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
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
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
                                  child: const Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.verified_rounded, size: 13, color: Colors.white),
                                      SizedBox(width: 4),
                                      Text(
                                        '100% PURE & RAW',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.w800,
                                          fontSize: 10,
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
                          Container(
                            width: 280,
                            height: 185,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(20),
                              boxShadow: [
                                BoxShadow(
                                  color: accentColor.withValues(alpha: 0.14),
                                  blurRadius: 20,
                                  offset: const Offset(0, 6),
                                ),
                              ],
                              border: Border.all(
                                color: const Color(0xFFE2EBE5),
                                width: 1.2,
                              ),
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(20),
                              child: Stack(
                                fit: StackFit.expand,
                                children: [
                                  // Dual-source image loading: Cloudinary hosted URL + local asset fallback
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
                                  // Floating tag pill
                                  if (slide['overlayTag'] != null)
                                    Positioned(
                                      top: 12,
                                      left: 12,
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: Colors.black.withValues(alpha: 0.55),
                                          borderRadius: BorderRadius.circular(16),
                                        ),
                                        child: Text(
                                          slide['overlayTag'] as String,
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 11,
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ),
                        const SizedBox(height: 28),
                        Text(
                          slide['title'] as String,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: AppColors.dairyBlue,
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.4,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          slide['desc'] as String,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: AppColors.textMuted,
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            height: 1.4,
                          ),
                        ),
                      ],
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
            const SizedBox(height: 24),

            // Bottom Actions
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16),
              child: Column(
                children: [
                  SizedBox(
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

                  // Show Sign In shortcut and Guest explore on final screen
                  if (_currentPage == _slides.length - 1) ...[
                    const SizedBox(height: 10),
                    TextButton(
                      onPressed: () => _completeOnboarding(const LoginScreen()),
                      child: RichText(
                        text: const TextSpan(
                          style: TextStyle(fontSize: 13.5, color: Color(0xFF597361)),
                          children: [
                            TextSpan(text: 'Already have an account? '),
                            TextSpan(
                              text: 'Sign In',
                              style: TextStyle(
                                color: AppColors.primaryGreen,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ] else ...[
                    const SizedBox(height: 14),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
