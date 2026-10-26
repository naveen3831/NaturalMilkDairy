import 'package:flutter/material.dart';

class StoryTab extends StatelessWidget {
  final VoidCallback? onExploreProducts;

  const StoryTab({super.key, this.onExploreProducts});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Hero Story Banner
          Container(
            width: double.infinity,
            height: 260,
            decoration: const BoxDecoration(
              image: DecorationImage(
                image: NetworkImage(
                  'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454809/natural-milk-dairy/cows-pasture.jpg',
                ),
                fit: BoxFit.cover,
              ),
            ),
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black.withValues(alpha: 0.3),
                    Colors.black.withValues(alpha: 0.75),
                  ],
                ),
              ),
              child: const Column(
                mainAxisAlignment: MainAxisAlignment.end,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.auto_awesome, color: Color(0xFFF5C249), size: 16),
                      SizedBox(width: 6),
                      Text(
                        'OUR FARM PHILOSOPHY',
                        style: TextStyle(
                          color: Color(0xFFF5C249),
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.1,
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 8),
                  Text(
                    'The Story of Pure,\nHonest Dairy',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 26,
                      fontWeight: FontWeight.w900,
                      height: 1.2,
                    ),
                  ),
                  SizedBox(height: 6),
                  Text(
                    'From ethically raised indigenous cattle straight to your doorstep before 6:30 AM.',
                    style: TextStyle(
                      color: Color(0xFFE2EBE5),
                      fontSize: 13,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Mission Statement
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE2F1EA),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFC3E2D3)),
                  ),
                  child: const Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.format_quote_rounded, color: Color(0xFF0D5C3A), size: 28),
                      SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'We believe pure nourishment begins at the grass level. No hormonal injections, no commercial milk powders, and zero dilution — just honest, untampered farm milk.',
                          style: TextStyle(
                            color: Color(0xFF0D5C3A),
                            fontSize: 13.5,
                            fontWeight: FontWeight.w600,
                            height: 1.5,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                const Text(
                  'Our 4 Non-Negotiable Standards',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0C2340),
                  ),
                ),
                const SizedBox(height: 14),

                _buildPillar(
                  icon: Icons.grass_rounded,
                  title: '100% Green Pasture Fed Cattle',
                  desc: 'Our cows graze freely and are nourished with chemical-free maize, sorghum, and natural mineral supplements.',
                ),
                _buildPillar(
                  icon: Icons.ac_unit_rounded,
                  title: 'Chilled to 4°C in 30 Minutes',
                  desc: 'Cold-chain preservation immediately locks in vital vitamins, healthy enzymes, and natural farm sweetness.',
                ),
                _buildPillar(
                  icon: Icons.verified_user_rounded,
                  title: 'Zero Hormones, Oxytocin & Antibiotics',
                  desc: 'We never inject cows to artificially boost yield. Every drop is cruelty-free and laboratory purity certified.',
                ),
                _buildPillar(
                  icon: Icons.wine_bar_rounded,
                  title: 'Delivered in Sterilized Glass Bottles',
                  desc: 'Eco-conscious reusable glass protects milk from microplastics, keeping your morning drop chilled and pristine.',
                ),
                const SizedBox(height: 20),

                // Farm Photo Showcase
                ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Image.network(
                    'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454812/natural-milk-dairy/organic-farm.jpg',
                    height: 190,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (ctx, err, stack) => const SizedBox.shrink(),
                  ),
                ),
                const SizedBox(height: 20),

                // CTA Button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: onExploreProducts,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0D5C3A),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 15),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      elevation: 0,
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('Taste The Difference', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                        SizedBox(width: 8),
                        Icon(Icons.arrow_forward_rounded, size: 18),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPillar({required IconData icon, required String title, required String desc}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFE2F1EA),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: const Color(0xFF0D5C3A), size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0C2340),
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  desc,
                  style: const TextStyle(
                    fontSize: 12.5,
                    color: Color(0xFF597361),
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
