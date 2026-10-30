const fs = require('fs');
let home = fs.readFileSync('mobile/lib/screens/home/home_screen.dart', 'utf8');

// Replace the 4 Navigator.push with _openSubscriptionDetails
if (!home.includes('_openSubscriptionDetails()')) {
  const methodDef = `
  Future<void> _openSubscriptionDetails() async {
    final targetIndex = await Navigator.push<int>(
      context,
      MaterialPageRoute(
        builder: (_) => const SubscriptionDetailsScreen(),
      ),
    );
    if (targetIndex != null && mounted) {
      setState(() => _currentIndex = targetIndex);
    }
  }
`;

  home = home.replace(
    '  void _showUpcomingDeliveryDetails(Map<String, dynamic> delivery) {',
    methodDef + '\r\n  void _showUpcomingDeliveryDetails(Map<String, dynamic> delivery) {'
  );

  // Replace Navigator.push calls for SubscriptionDetailsScreen
  const pushBlockRegex = /Navigator\.push\(\s*context,\s*MaterialPageRoute\(\s*builder:\s*\(_\)\s*=>\s*const SubscriptionDetailsScreen\(\),\s*\),\s*\);/g;
  home = home.replace(pushBlockRegex, '_openSubscriptionDetails();');

  fs.writeFileSync('mobile/lib/screens/home/home_screen.dart', home, 'utf8');
  console.log('Updated home_screen.dart with _openSubscriptionDetails');
} else {
  console.log('home_screen.dart already has _openSubscriptionDetails');
}
