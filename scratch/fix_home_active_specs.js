const fs = require('fs');

let content = fs.readFileSync('mobile/lib/screens/home/home_screen.dart', 'utf8');

// Normalize to LF
content = content.replace(/\r\n/g, '\n');

// 1. Hero banner right image
content = content.replace(
  "'assets/images/cat_img_milk.png',\n                        fit: BoxFit.contain,",
  "'assets/images/sub_hero_milk.png',\n                        fit: BoxFit.contain,"
);

// 2. OutlinedButton style for View Details button
content = content.replace(
  'side: const BorderSide(color: Color(0xFFD4E2D8)),',
  'side: const BorderSide(color: Color(0xFF0D5C3A), width: 1.2),'
);
content = content.replace(
  'color: Color(0xFF0C2340),\n                                  fontSize: 12.5,',
  'color: Color(0xFF0D5C3A),\n                                  fontSize: 12.5,'
);

// 3. Replace Wrap with 3 Spec Boxes
const oldWrapBlock = `                              const SizedBox(height: 8),
                              Wrap(
                                spacing: 10,
                                runSpacing: 4,
                                children: [
                                  _buildSubMiniInfo(Icons.water_drop_outlined, '1 L / day Pure A2 Milk'),
                                  _buildSubMiniInfo(Icons.access_time_rounded, 'Before 6:30 AM Morning Delivery'),
                                  _buildSubMiniInfo(Icons.location_on_outlined, 'Madhupur Delivery Area'),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),`;

const newBoxesBlock = `                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // 3 Spec Boxes in a Row matching Image 1
                    Row(
                      children: [
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 6),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF2F8F4),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: const Color(0xFFDEEDE2)),
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.local_drink_outlined, size: 14, color: Color(0xFF0D5C3A)),
                                SizedBox(width: 4),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '1 L / day',
                                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      Text(
                                        'Pure A2 Milk',
                                        style: TextStyle(fontSize: 8.5, color: Color(0xFF6B7280)),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 5),
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 6),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF2F8F4),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: const Color(0xFFDEEDE2)),
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.access_time_rounded, size: 14, color: Color(0xFF0D5C3A)),
                                SizedBox(width: 4),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Before 6:30 AM',
                                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      Text(
                                        'Morning Delivery',
                                        style: TextStyle(fontSize: 8.5, color: Color(0xFF6B7280)),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 5),
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 6),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF2F8F4),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: const Color(0xFFDEEDE2)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.location_on_outlined, size: 14, color: Color(0xFF0D5C3A)),
                                const SizedBox(width: 4),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        user?.area ?? 'Madhupur',
                                        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF0C2340)),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const Text(
                                        'Delivery Area',
                                        style: TextStyle(fontSize: 8.5, color: Color(0xFF6B7280)),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),`;

if (content.includes(oldWrapBlock)) {
  content = content.replace(oldWrapBlock, newBoxesBlock);
  console.log('Successfully replaced Wrap block with 3 Spec boxes in home_screen.dart!');
} else {
  console.log('oldWrapBlock not found directly');
}

fs.writeFileSync('mobile/lib/screens/home/home_screen.dart', content, 'utf8');
console.log('Done!');
