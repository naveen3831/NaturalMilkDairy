const fs = require('fs');

const path = 'mobile/lib/screens/home/home_screen.dart';
let content = fs.readFileSync(path, 'utf8');

// 1. Highlight branding name and logo in _buildTopBrandHeader
const oldHeaderLogo = `                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white,
                      border: Border.all(color: const Color(0xFFE2EBE5), width: 1.2),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.04),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: ClipOval(
                      child: Padding(
                        padding: const EdgeInsets.all(3.0),
                        child: Image.asset(
                          'assets/images/logo.png',
                          fit: BoxFit.contain,
                          errorBuilder: (ctx, err, stack) => const Icon(
                            Icons.water_drop_rounded,
                            color: Color(0xFF0D5C3A),
                            size: 22,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'NATURAL MILK DAIRY',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF0D5C3A),
                            letterSpacing: 0.3,
                          ),
                        ),
                        Text(
                          'NATURAL • PURE • HEALTHY',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 8.5,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF1E5E41),
                            letterSpacing: 0.6,
                          ),
                        ),
                      ],
                    ),
                  ),`;

const newHeaderLogo = `                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white,
                      border: Border.all(color: const Color(0xFFBCE3CE), width: 1.5),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF0D5C3A).withValues(alpha: 0.12),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: ClipOval(
                      child: Padding(
                        padding: const EdgeInsets.all(2.5),
                        child: Image.asset(
                          'assets/images/logo.png',
                          fit: BoxFit.contain,
                          errorBuilder: (ctx, err, stack) => const Icon(
                            Icons.water_drop_rounded,
                            color: Color(0xFF0D5C3A),
                            size: 24,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'NATURAL MILK DAIRY',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 14.5,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF0D5C3A),
                            letterSpacing: 0.4,
                          ),
                        ),
                        Text(
                          'NATURAL • PURE • HEALTHY',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF15803D),
                            letterSpacing: 0.7,
                          ),
                        ),
                      ],
                    ),
                  ),`;

if (content.includes(oldHeaderLogo)) {
  content = content.replace(oldHeaderLogo, newHeaderLogo);
  console.log('Updated logo & branding styles in _buildTopBrandHeader');
} else {
  console.log('Old header logo string not matched exactly, trying regex');
  // Clean replacement for logo box
  content = content.replace(/width: 40,\s*height: 40,/, 'width: 44,\r\n                    height: 44,');
  content = content.replace(/fontSize: 13,\s*fontWeight: FontWeight\.w900,\s*color: Color\(0xFF0D5C3A\),\s*letterSpacing: 0\.3,/, 'fontSize: 14.5,\r\n                            fontWeight: FontWeight.w900,\r\n                            color: Color(0xFF0D5C3A),\r\n                            letterSpacing: 0.4,');
}

// 2. Add _buildGreetingHeader method
const greetingMethod = `
  // GREETING HEADER (Matching Image)
  Widget _buildGreetingHeader(dynamic user) {
    final now = DateTime.now();
    final hour = now.hour;
    String salutation = 'Good Morning,';
    if (hour >= 12 && hour < 17) {
      salutation = 'Good Afternoon,';
    } else if (hour >= 17 || hour < 5) {
      salutation = 'Good Evening,';
    }

    final String name = (user?.name != null && user.name.toString().trim().isNotEmpty)
        ? user.name.toString().trim()
        : 'Naveen Kumar';

    return Padding(
      padding: const EdgeInsets.fromLTRB(18, 14, 18, 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            salutation,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 2),
          Row(
            children: [
              Text(
                name,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF0C2340),
                  letterSpacing: -0.3,
                ),
              ),
              const SizedBox(width: 6),
              const Text(
                '☀️',
                style: TextStyle(fontSize: 20),
              ),
            ],
          ),
          const SizedBox(height: 3),
          const Text(
            'Fresh farm goodness delivered to your doorstep every morning.',
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w500,
              color: Color(0xFF64748B),
              height: 1.3,
            ),
          ),
        ],
      ),
    );
  }
`;

if (!content.includes('_buildGreetingHeader')) {
  content = content.replace('  // TAB 0: HOME FEED', `${greetingMethod}\r\n  // TAB 0: HOME FEED`);
}

// 3. Insert _buildGreetingHeader(user) into _buildHomeFeed
const oldFeedChildren = `          children: [
            // 1. Hero Banner matching Image 1
            _buildHeroBanner(rawProducts),`;

const newFeedChildren = `          children: [
            // 0. Greeting Header matching Image
            _buildGreetingHeader(user),

            // 1. Hero Banner matching Image 1
            _buildHeroBanner(rawProducts),`;

if (content.includes(oldFeedChildren)) {
  content = content.replace(oldFeedChildren, newFeedChildren);
  console.log('Added _buildGreetingHeader to _buildHomeFeed');
} else {
  console.log('oldFeedChildren not found directly, trying alternate');
  content = content.replace('children: [\r\n            _buildHeroBanner(rawProducts),', 'children: [\r\n            _buildGreetingHeader(user),\r\n            _buildHeroBanner(rawProducts),');
}

fs.writeFileSync(path, content, 'utf8');
console.log('Saved home_screen.dart successfully');
