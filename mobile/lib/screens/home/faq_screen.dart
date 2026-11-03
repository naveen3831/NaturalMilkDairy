import 'package:flutter/material.dart';
import 'contact_support_screen.dart';

class FaqScreen extends StatefulWidget {
  const FaqScreen({super.key});

  @override
  State<FaqScreen> createState() => _FaqScreenState();
}

class _FaqScreenState extends State<FaqScreen> {
  String _searchQuery = '';
  String _selectedCategory = 'All';

  final List<String> _categories = [
    'All',
    'Delivery & Timing',
    'Glass Bottles',
    'Pause & Vacation',
    'Milk Quality',
    'Payments',
  ];

  final List<Map<String, dynamic>> _faqs = [
    {
      'category': 'Delivery & Timing',
      'question': 'What time is fresh milk delivered to my doorstep?',
      'answer':
          'Our delivery partners drop chilled milk bottles between 5:30 AM and 7:30 AM every morning. This ensures fresh farm milk is ready at your door before you wake up for your morning tea and breakfast.',
      'icon': Icons.wb_sunny_outlined,
    },
    {
      'category': 'Delivery & Timing',
      'question': 'Where does the delivery partner place the milk bottles?',
      'answer':
          'Bottles are placed securely inside your designated doorstep dairy bag or near your front door latch. You can also specify custom drop instructions (e.g. "Ring doorbell once" or "Leave at security desk") in the Addresses screen.',
      'icon': Icons.door_front_door_outlined,
    },
    {
      'category': 'Glass Bottles',
      'question': 'How does the glass bottle return and sterilization process work?',
      'answer':
          'We use eco-friendly food-grade glass bottles to maintain natural milk taste and avoid plastic micro-particles. Simply rinse yesterday\'s empty bottle with clean water and leave it outside your door in the dairy bag. Our delivery boy collects it when dropping today\'s fresh milk.',
      'icon': Icons.recycling_rounded,
    },
    {
      'category': 'Pause & Vacation',
      'question': 'Can I pause my milk delivery when going on vacation?',
      'answer':
          'Yes, absolutely! You can pause deliveries anytime in the app under the Subscription tab or Profile. Just select your vacation start date and return date. Please submit the pause request before 8:00 PM on the previous evening.',
      'icon': Icons.pause_circle_outline_rounded,
    },
    {
      'category': 'Pause & Vacation',
      'question': 'What happens to my subscription days when I pause delivery?',
      'answer':
          'Paused days are automatically credited and extended at the end of your subscription period. You never lose money for days when milk was not delivered.',
      'icon': Icons.calendar_month_outlined,
    },
    {
      'category': 'Milk Quality',
      'question': 'Is the milk raw, pasteurized, or homogenized?',
      'answer':
          'Our milk is 100% pure, natural farm-fresh milk chilled to 4°C within 60 minutes of milking to stop bacterial growth naturally. It is completely unhomogenized and non-standardized with natural rich cream (malai). We recommend boiling the milk once before consuming.',
      'icon': Icons.local_drink_outlined,
    },
    {
      'category': 'Milk Quality',
      'question': 'How do you ensure zero adulteration and no preservatives?',
      'answer':
          'Every batch undergoes 24-parameter laboratory testing for fat, SNF, purity, and zero adulterants. We maintain a strict direct-from-farm cold chain with zero chemical preservatives or synthetic additives.',
      'icon': Icons.verified_user_outlined,
    },
    {
      'category': 'Payments',
      'question': 'How do I pay or renew my monthly dairy subscription?',
      'answer':
          'You can pay securely via Razorpay using UPI (Google Pay, PhonePe, Paytm), Credit/Debit cards, or NetBanking. Once paid, your subscription plan and daily delivery quota activate immediately.',
      'icon': Icons.account_balance_wallet_outlined,
    },
    {
      'category': 'Payments',
      'question': 'What if my payment failed or was debited without confirmation?',
      'answer':
          'You can view all past and pending orders in the "Subscription History & Orders" screen. If money was debited, Razorpay reconciles it within 2 hours or auto-refunds to your source bank within 3 to 5 business days.',
      'icon': Icons.receipt_long_rounded,
    },
    {
      'category': 'Delivery & Timing',
      'question': 'How can I verify if my delivery was dropped today?',
      'answer':
          'Our delivery partners snap a live timestamped photo proof upon dropping your bottles. You can see this in real-time under the "Deliveries" tab in your mobile app.',
      'icon': Icons.camera_alt_outlined,
    },
  ];

  @override
  Widget build(BuildContext context) {
    final filteredFaqs = _faqs.where((faq) {
      final matchesCategory = _selectedCategory == 'All' || faq['category'] == _selectedCategory;
      final q = _searchQuery.toLowerCase().trim();
      final matchesSearch = q.isEmpty ||
          faq['question'].toString().toLowerCase().contains(q) ||
          faq['answer'].toString().toLowerCase().contains(q);
      return matchesCategory && matchesSearch;
    }).toList();

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
          'Frequently Asked Questions',
          style: TextStyle(
            color: Color(0xFF0C2340),
            fontSize: 18,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.2,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: const Color(0xFFEAEFEB), height: 1),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Search Bar
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2EBE5)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.02),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: TextField(
                onChanged: (val) => setState(() => _searchQuery = val),
                decoration: const InputDecoration(
                  hintText: 'Search questions, bottles, timings...',
                  hintStyle: TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                  prefixIcon: Icon(Icons.search_rounded, color: Color(0xFF0D5C3A), size: 20),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                ),
              ),
            ),
            const SizedBox(height: 14),

            // Category Chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _categories.map((cat) {
                  final isSel = _selectedCategory == cat;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: InkWell(
                      onTap: () => setState(() => _selectedCategory = cat),
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                        decoration: BoxDecoration(
                          color: isSel ? const Color(0xFF0D5C3A) : Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: isSel ? const Color(0xFF0D5C3A) : const Color(0xFFE2EBE5),
                          ),
                        ),
                        child: Text(
                          cat,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: isSel ? FontWeight.w800 : FontWeight.w600,
                            color: isSel ? Colors.white : const Color(0xFF475569),
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 16),

            // Results count
            Text(
              'Showing ${filteredFaqs.length} answered questions',
              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 10),

            // FAQs List (Accordion Cards)
            if (filteredFaqs.isEmpty)
              Container(
                padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
                alignment: Alignment.center,
                child: Column(
                  children: [
                    const Icon(Icons.help_outline_rounded, size: 40, color: Color(0xFF94A3B8)),
                    const SizedBox(height: 12),
                    const Text(
                      'No matching questions found',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Try searching with different keywords or contact support directly.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0D5C3A),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const ContactSupportScreen()),
                        );
                      },
                      icon: const Icon(Icons.chat_bubble_outline_rounded, size: 16, color: Colors.white),
                      label: const Text('Contact Customer Support', style: TextStyle(color: Colors.white, fontSize: 12)),
                    ),
                  ],
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: filteredFaqs.length,
                separatorBuilder: (_, index) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final item = filteredFaqs[index];
                  return Material(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    clipBehavior: Clip.antiAlias,
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFE2EBE5)),
                      ),
                      child: Theme(
                        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                        child: ExpansionTile(
                        tilePadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                        childrenPadding: const EdgeInsets.only(left: 14, right: 14, bottom: 14),
                        leading: Container(
                          width: 34,
                          height: 34,
                          decoration: BoxDecoration(
                            color: const Color(0xFFE2F1EA),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(item['icon'] as IconData, size: 18, color: const Color(0xFF0D5C3A)),
                        ),
                        title: Text(
                          item['question'],
                          style: const TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF0C2340),
                          ),
                        ),
                        subtitle: Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: Text(
                            item['category'],
                            style: const TextStyle(fontSize: 10.5, color: Color(0xFF0D5C3A), fontWeight: FontWeight.w700),
                          ),
                        ),
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: const Color(0xFFF1F5F9)),
                            ),
                            child: Text(
                              item['answer'],
                              style: const TextStyle(
                                fontSize: 12.5,
                                color: Color(0xFF334155),
                                height: 1.45,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
                },
              ),
            const SizedBox(height: 24),

            // STILL HAVE QUESTIONS CARD
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0D5C3A), Color(0xFF147A4D)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF0D5C3A).withValues(alpha: 0.25),
                    blurRadius: 14,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.headset_mic_rounded, color: Colors.white, size: 22),
                      SizedBox(width: 10),
                      Text(
                        'Still have questions?',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Our dedicated customer care team is available 24/7 on WhatsApp and phone call for any queries.',
                    style: TextStyle(fontSize: 12, color: Color(0xFFD1FAE5), height: 1.35),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: const Color(0xFF0D5C3A),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            elevation: 0,
                          ),
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const ContactSupportScreen()),
                            );
                          },
                          icon: const Icon(Icons.chat_bubble_outline_rounded, size: 16),
                          label: const Text(
                            'WhatsApp Chat',
                            style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }
}
