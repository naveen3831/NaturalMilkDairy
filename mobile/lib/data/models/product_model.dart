class ProductModel {
  final String id;
  final String name;
  final String category;
  final String tagline;
  final String badge;
  final String badgeColor;
  final String fat;
  final String price;
  final double numericPrice;
  final String unit;
  final String imageUrl;
  final String description;
  final List<String> highlights;

  ProductModel({
    required this.id,
    required this.name,
    required this.category,
    this.tagline = 'Single-origin morning harvest',
    this.badge = 'Fresh Daily',
    this.badgeColor = '#059669',
    this.fat = '4.2% Fat • 8.5% SNF',
    required this.price,
    required this.numericPrice,
    required this.unit,
    required this.imageUrl,
    required this.description,
    this.highlights = const [],
  });

  static String resolveImageUrl(String? raw, String name, String category) {
    final trimmed = (raw ?? '').trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      // Fix broken Unsplash URL for buffalo milk
      if (trimmed.contains('photo-1527153857715-3908f2ae5e81')) {
        return 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1793013264/natural-milk-dairy/product-buffalo-milk.jpg';
      }
      return trimmed;
    }

    final n = name.toLowerCase();
    final c = category.toLowerCase();

    if (n.contains('buffalo')) {
      return 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1793013264/natural-milk-dairy/product-buffalo-milk.jpg';
    }
    if ((n.contains('500') || n.contains('half')) && (n.contains('cow') || c == 'milk')) {
      return 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454805/natural-milk-dairy/product-cow-milk.jpg';
    }
    if (n.contains('cow') || c == 'milk') {
      return 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454805/natural-milk-dairy/product-cow-milk.jpg';
    }
    if (c == 'curd' || n.contains('curd') || n.contains('dahi')) {
      return 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454807/natural-milk-dairy/product-curd.jpg';
    }
    if (c == 'ghee' || n.contains('ghee')) {
      return 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454808/natural-milk-dairy/product-ghee.jpg';
    }
    if (c == 'paneer' || n.contains('paneer')) {
      return 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454809/natural-milk-dairy/product-paneer.jpg';
    }
    return 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454805/natural-milk-dairy/product-cow-milk.jpg';
  }

  static String resolveAssetFallback(String name, String category) {
    final n = name.toLowerCase();
    final c = category.toLowerCase();
    if (n.contains('buffalo')) {
      return 'assets/images/prod_img_buffalo.png';
    }
    if ((n.contains('500') || n.contains('half')) && (n.contains('cow') || c == 'milk')) {
      return 'assets/images/product-cow-milk-500ml.jpg';
    }
    if (n.contains('cow') || c == 'milk') {
      return 'assets/images/prod_img_cow.png';
    }
    if (c == 'curd' || n.contains('curd') || n.contains('dahi')) {
      return 'assets/images/prod_img_curd.png';
    }
    if (c == 'ghee' || n.contains('ghee')) {
      return 'assets/images/cat_img_ghee.png';
    }
    if (c == 'paneer' || n.contains('paneer') || n.contains('sweet')) {
      return 'assets/images/cat_img_sweets.png';
    }
    return 'assets/images/prod_img_cow.png';
  }

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    final rawHighlights = json['highlights'];
    List<String> parsedHighlights = [];
    if (rawHighlights is List) {
      parsedHighlights = rawHighlights.map((e) => e.toString()).toList();
    }

    final double parsedPrice = (json['numericPrice'] as num?)?.toDouble() ??
        (double.tryParse(json['price']?.toString().replaceAll(RegExp(r'[^0-9.]'), '') ?? '') ?? 0.0);

    final String parsedName = json['name']?.toString() ?? 'Dairy Product';
    final String parsedCategory = json['category']?.toString() ?? 'milk';
    final String rawImage = json['image']?.toString() ?? json['imageUrl']?.toString() ?? '';

    final nameLower = parsedName.toLowerCase();
    final catLower = parsedCategory.toLowerCase();

    // Default rich metadata matching design
    String defaultTagline = 'Single-origin morning harvest';
    String defaultBadge = 'Fresh Daily';
    String defaultBadgeColor = '#059669';
    String defaultFat = '100% Pure';

    if (nameLower.contains('ghee') || catLower == 'ghee') {
      defaultTagline = 'Traditional Bilona churned';
      defaultBadge = 'Bilona Churned';
      defaultBadgeColor = '#b45309';
      defaultFat = '100% Pure A2 Butter Fat';
      if (parsedHighlights.isEmpty) {
        parsedHighlights = ['Traditional Bilona Method', 'Granular Golden Grain'];
      }
    } else if (nameLower.contains('curd') || catLower == 'curd') {
      defaultTagline = 'Single-origin morning harvest';
      defaultBadge = 'Pure Produce';
      defaultBadgeColor = '#059669';
      defaultFat = '100% Pure';
      if (parsedHighlights.isEmpty) {
        parsedHighlights = ['Glass Bottle Packaging', 'No Hormones / Oxytocin'];
      }
    } else if (nameLower.contains('paneer') || catLower == 'paneer') {
      defaultTagline = 'Melt-in-your-mouth soft';
      defaultBadge = 'Farm Made';
      defaultBadgeColor = '#166534';
      defaultFat = 'High Protein • Pure Cow Milk';
      if (parsedHighlights.isEmpty) {
        parsedHighlights = ['Melt-in-mouth Malai', 'High Pure Protein'];
      }
    } else if (nameLower.contains('buffalo')) {
      defaultTagline = 'Rich, thick & velvety';
      defaultBadge = 'High Cream Malai';
      defaultBadgeColor = '#d98a0d';
      defaultFat = '7.5% Fat • 9.0% SNF';
      if (parsedHighlights.isEmpty) {
        parsedHighlights = ['Heavy Natural Malai', 'Zero Dilution'];
      }
    } else {
      defaultTagline = 'Single-origin morning harvest';
      defaultBadge = nameLower.contains('500') ? 'Fresh Daily' : 'Bestseller';
      defaultBadgeColor = '#059669';
      defaultFat = '4.2% Fat • 8.5% SNF';
      if (parsedHighlights.isEmpty) {
        parsedHighlights = ['Glass Bottle Packaging', 'Chilled to 4°C in 30 Mins'];
      }
    }

    final String finalTagline = (json['tagline']?.toString().isNotEmpty == true)
        ? json['tagline'].toString()
        : defaultTagline;
    final String finalBadge = (json['badge']?.toString().isNotEmpty == true)
        ? json['badge'].toString()
        : defaultBadge;
    final String finalBadgeColor = (json['badgeColor']?.toString().isNotEmpty == true)
        ? json['badgeColor'].toString()
        : defaultBadgeColor;
    final String finalFat = (json['fat']?.toString().isNotEmpty == true)
        ? json['fat'].toString()
        : defaultFat;

    return ProductModel(
      id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
      name: parsedName,
      category: parsedCategory,
      tagline: finalTagline,
      badge: finalBadge,
      badgeColor: finalBadgeColor,
      fat: finalFat,
      price: json['price']?.toString() ?? '₹${parsedPrice.toStringAsFixed(0)}',
      numericPrice: parsedPrice,
      unit: json['unit']?.toString() ?? '/ Litre',
      imageUrl: resolveImageUrl(rawImage, parsedName, parsedCategory),
      description: json['desc']?.toString() ?? json['description']?.toString() ?? '',
      highlights: parsedHighlights,
    );
  }

  /// Default fallback catalog matching server/config/db.js and HomePage.jsx
  static List<ProductModel> get defaultCatalog => [
        ProductModel(
          id: 'p1',
          category: 'milk',
          name: 'Farm Fresh Cow Milk 1L',
          tagline: 'Single-origin morning harvest',
          badge: 'BESTSELLER',
          badgeColor: '#059669',
          fat: '4.2% Fat • 8.5% SNF',
          price: '₹65',
          numericPrice: 65.0,
          unit: '/ 1 L',
          imageUrl: 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454805/natural-milk-dairy/product-cow-milk.jpg',
          description: 'Freshly milked pure organic farm cow milk chilled to 4°C in sterilized glass bottles',
          highlights: ['Glass Bottle Packaging', 'Chilled to 4°C in 30 Mins'],
        ),
        ProductModel(
          id: 'p2',
          category: 'milk',
          name: 'Farm Fresh Cow Milk 500ml',
          tagline: 'Single-origin morning harvest',
          badge: 'FRESH DAILY',
          badgeColor: '#059669',
          fat: '4.2% Fat • 8.5% SNF',
          price: '₹30',
          numericPrice: 30.0,
          unit: '/ 500 ml',
          imageUrl: 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454805/natural-milk-dairy/product-cow-milk.jpg',
          description: 'Convenient daily half-litre pack of pure farm cow milk, ideal for morning chai & coffee.',
          highlights: ['Glass Bottle Packaging', 'No Hormones / Oxytocin'],
        ),
        ProductModel(
          id: 'p3',
          category: 'milk',
          name: 'Pure Buffalo Milk 1L',
          tagline: 'Rich, thick & velvety',
          badge: 'HIGH CREAM MALAI',
          badgeColor: '#D98A0D',
          fat: '7.5% Fat • 9.0% SNF',
          price: '₹75',
          numericPrice: 75.0,
          unit: '/ 1 L',
          imageUrl: 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1793013264/natural-milk-dairy/product-buffalo-milk.jpg',
          description: 'Thick creamy high-fat pure buffalo milk with rich natural malai.',
          highlights: ['Heavy Natural Malai', 'Zero Dilution'],
        ),
        ProductModel(
          id: 'p4',
          category: 'curd',
          name: 'Thick Farm Curd 1kg',
          tagline: 'Single-origin morning harvest',
          badge: 'PURE PRODUCE',
          badgeColor: '#059669',
          fat: '100% Pure',
          price: '₹65',
          numericPrice: 65.0,
          unit: '/ 1 kg',
          imageUrl: 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454807/natural-milk-dairy/product-curd.jpg',
          description: 'Traditional earthen pot set creamy dahi with natural gut probiotics.',
          highlights: ['Glass Bottle Packaging', 'No Hormones / Oxytocin'],
        ),
        ProductModel(
          id: 'p5',
          category: 'curd',
          name: 'Thick Farm Curd 500g',
          tagline: 'Single-origin morning harvest',
          badge: 'PURE PRODUCE',
          badgeColor: '#059669',
          fat: '100% Pure',
          price: '₹35',
          numericPrice: 35.0,
          unit: '/ 500 g',
          imageUrl: 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454807/natural-milk-dairy/product-curd.jpg',
          description: 'Traditional earthen pot set creamy dahi with natural gut probiotics.',
          highlights: ['Glass Bottle Packaging', 'No Hormones / Oxytocin'],
        ),
        ProductModel(
          id: 'p6',
          category: 'ghee',
          name: 'A2 Vedic Desi Ghee 500ml',
          tagline: 'Traditional Bilona churned',
          badge: 'BILONA CHURNED',
          badgeColor: '#B45309',
          fat: '100% Pure A2 Butter Fat',
          price: '₹480',
          numericPrice: 480.0,
          unit: '/ 500 ml',
          imageUrl: 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454808/natural-milk-dairy/product-ghee.jpg',
          description: 'Traditional curd-churned wood-fired A2 Desi cow bilona ghee with heavenly nutty aroma.',
          highlights: ['Traditional Bilona Method', 'Granular Golden Grain'],
        ),
        ProductModel(
          id: 'p7',
          category: 'curd',
          name: 'Fresh Malai Paneer 500g',
          tagline: 'Melt-in-your-mouth soft',
          badge: 'FARM MADE',
          badgeColor: '#166534',
          fat: 'High Protein • Pure Cow Milk',
          price: '₹190',
          numericPrice: 190.0,
          unit: '/ 500 g',
          imageUrl: 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454809/natural-milk-dairy/product-paneer.jpg',
          description: 'Handcrafted fresh malai paneer, super soft and rich in pure dairy proteins.',
          highlights: ['Melt-in-mouth Malai', 'High Pure Protein'],
        ),
      ];
}
