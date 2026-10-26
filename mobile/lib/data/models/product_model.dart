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

    return ProductModel(
      id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
      name: parsedName,
      category: parsedCategory,
      tagline: json['tagline']?.toString() ?? 'Single-origin morning harvest',
      badge: json['badge']?.toString() ?? 'Fresh Daily',
      badgeColor: json['badgeColor']?.toString() ?? '#059669',
      fat: json['fat']?.toString() ?? '100% Pure',
      price: json['price']?.toString() ?? '₹${parsedPrice.toStringAsFixed(0)}',
      numericPrice: parsedPrice,
      unit: json['unit']?.toString() ?? '/ Litre',
      imageUrl: resolveImageUrl(rawImage, parsedName, parsedCategory),
      description: json['desc']?.toString() ?? json['description']?.toString() ?? '',
      highlights: parsedHighlights,
    );
  }

  /// Default fallback catalog matching client/src/pages/HomePage.jsx
  static List<ProductModel> get defaultCatalog => [
        ProductModel(
          id: 'p1',
          category: 'milk',
          name: 'Farm Fresh Cow Milk 1L',
          tagline: 'Single-origin morning harvest',
          badge: 'BESTSELLER',
          badgeColor: '#0D5C3A',
          fat: '4.2% Fat • 8.5% SNF',
          price: '₹60',
          numericPrice: 60.0,
          unit: '/ Litre',
          imageUrl: 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454805/natural-milk-dairy/product-cow-milk.jpg',
          description: 'Freshly milked pure organic farm cow milk chilled to 4°C in sterilized glass bottles',
          highlights: ['100% Unadulterated', 'Chilled to 4°C', 'Eco Glass Bottle'],
        ),
        ProductModel(
          id: 'p2',
          category: 'milk',
          name: 'Farm Fresh Cow Milk 500ml',
          tagline: 'Single-origin morning harvest',
          badge: 'FRESH DAILY',
          badgeColor: '#0C2340',
          fat: '4.2% Fat • 8.5% SNF',
          price: '₹30',
          numericPrice: 30.0,
          unit: '/ 500ml',
          imageUrl: 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454805/natural-milk-dairy/product-cow-milk.jpg',
          description: 'Convenient daily half-litre pack of pure farm cow milk, ideal for morning chai & coffee.',
          highlights: ['Glass Bottle Packaging', 'No Hormones / Oxytocin', 'Chilled to 4°C in 30 Mins'],
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
          unit: '/ Litre',
          imageUrl: 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1793013264/natural-milk-dairy/product-buffalo-milk.jpg',
          description: 'Thick creamy high-fat pure buffalo milk with rich natural malai.',
          highlights: ['Heavy Natural Malai', 'Zero Dilution', 'Pure Grass-Fed Cattle'],
        ),
        ProductModel(
          id: 'p4',
          category: 'curd',
          name: 'Thick Farm Curd 500g',
          tagline: 'Single-origin morning harvest',
          badge: 'PURE PRODUCE',
          badgeColor: '#0D5C3A',
          fat: '100% Pure',
          price: '₹35',
          numericPrice: 35.0,
          unit: '/ 500g',
          imageUrl: 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454807/natural-milk-dairy/product-curd.jpg',
          description: 'Traditional earthen pot set creamy dahi with natural gut probiotics.',
          highlights: ['100% Natural Probiotics', 'Traditional Matka Set', 'Zero Preservatives'],
        ),
        ProductModel(
          id: 'p5',
          category: 'curd',
          name: 'Fresh Malai Paneer 250g',
          tagline: 'Melt-in-your-mouth soft',
          badge: 'FARM MADE',
          badgeColor: '#0C2340',
          fat: '100% Pure Milk',
          price: '₹110',
          numericPrice: 110.0,
          unit: '/ 250g',
          imageUrl: 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454809/natural-milk-dairy/product-paneer.jpg',
          description: 'Handcrafted fresh malai paneer, super soft and rich in pure dairy proteins.',
          highlights: ['Melt-in-mouth Malai', 'High Pure Protein', 'Fresh Daily Made'],
        ),
        ProductModel(
          id: 'p6',
          category: 'ghee',
          name: 'A2 Vedic Bilona Ghee 500ml',
          tagline: 'Golden granular aroma',
          badge: 'VEDIC BILONA',
          badgeColor: '#D98A0D',
          fat: 'A2 Cultured',
          price: '₹850',
          numericPrice: 850.0,
          unit: '/ 500ml',
          imageUrl: 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454808/natural-milk-dairy/product-ghee.jpg',
          description: 'Traditional curd-churned wood-fired A2 Desi cow bilona ghee with heavenly aroma.',
          highlights: ['Hand-churned Bilona', 'Rich Danedar Aroma', 'A2 Cultured Cow Milk'],
        ),
      ];
}
