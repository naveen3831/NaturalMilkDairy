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

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    final rawHighlights = json['highlights'];
    List<String> parsedHighlights = [];
    if (rawHighlights is List) {
      parsedHighlights = rawHighlights.map((e) => e.toString()).toList();
    }

    final double parsedPrice = (json['numericPrice'] as num?)?.toDouble() ??
        (double.tryParse(json['price']?.toString().replaceAll(RegExp(r'[^0-9.]'), '') ?? '') ?? 0.0);

    return ProductModel(
      id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Dairy Product',
      category: json['category']?.toString() ?? 'milk',
      tagline: json['tagline']?.toString() ?? 'Single-origin morning harvest',
      badge: json['badge']?.toString() ?? 'Fresh Daily',
      badgeColor: json['badgeColor']?.toString() ?? '#059669',
      fat: json['fat']?.toString() ?? '100% Pure',
      price: json['price']?.toString() ?? '₹${parsedPrice.toStringAsFixed(0)}',
      numericPrice: parsedPrice,
      unit: json['unit']?.toString() ?? '/ Litre',
      imageUrl: json['image']?.toString() ?? json['imageUrl']?.toString() ?? '',
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
          badge: 'Bestseller',
          badgeColor: '#059669',
          fat: '4.2% Fat • 8.5% SNF',
          price: '₹60',
          numericPrice: 60.0,
          unit: '/ Litre',
          imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80',
          description: 'Freshly milked pure organic farm cow milk chilled to 4°C in sterilized glass bottles.',
          highlights: ['Glass Bottle Packaging', 'No Hormones / Oxytocin', 'Chilled to 4°C in 30 Mins'],
        ),
        ProductModel(
          id: 'p2',
          category: 'milk',
          name: 'Farm Fresh Cow Milk 500ml',
          tagline: 'Single-origin morning harvest',
          badge: 'Fresh Daily',
          badgeColor: '#0C2340',
          fat: '4.2% Fat • 8.5% SNF',
          price: '₹30',
          numericPrice: 30.0,
          unit: '/ 500ml',
          imageUrl: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=800&q=80',
          description: 'Convenient daily half-litre pack of pure farm cow milk, ideal for morning chai & coffee.',
          highlights: ['Glass Bottle Packaging', 'No Hormones / Oxytocin', 'Chilled to 4°C in 30 Mins'],
        ),
        ProductModel(
          id: 'p3',
          category: 'milk',
          name: 'Pure Buffalo Milk 1L',
          tagline: 'Rich, thick & velvety',
          badge: 'High Cream Malai',
          badgeColor: '#D98A0D',
          fat: '7.5% Fat • 9.0% SNF',
          price: '₹75',
          numericPrice: 75.0,
          unit: '/ Litre',
          imageUrl: 'https://images.unsplash.com/photo-1527153857715-3908f2ae5e81?auto=format&fit=crop&w=800&q=80',
          description: 'Thick creamy high-fat pure buffalo milk with rich natural malai.',
          highlights: ['Heavy Natural Malai', 'Zero Dilution', 'Pure Grass-Fed Cattle'],
        ),
        ProductModel(
          id: 'p4',
          category: 'curd',
          name: 'Thick Farm Curd 500g',
          tagline: 'Single-origin morning harvest',
          badge: 'Pure Produce',
          badgeColor: '#059669',
          fat: '100% Pure',
          price: '₹35',
          numericPrice: 35.0,
          unit: '/ 500g',
          imageUrl: 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?auto=format&fit=crop&w=800&q=80',
          description: 'Traditional earthen pot set creamy dahi with natural gut probiotics.',
          highlights: ['Glass Jar / Clay Matka', 'Natural Probiotics', 'Thick & Creamy Texture'],
        ),
        ProductModel(
          id: 'p5',
          category: 'curd',
          name: 'Fresh Malai Paneer 250g',
          tagline: 'Melt-in-your-mouth soft',
          badge: 'Farm Made',
          badgeColor: '#0C2340',
          fat: '100% Pure Milk',
          price: '₹110',
          numericPrice: 110.0,
          unit: '/ 250g',
          imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80',
          description: 'Handcrafted fresh malai paneer, super soft and rich in pure dairy proteins.',
          highlights: ['Vacuum Sealed', 'Zero Starch / Chemicals', 'Soft Pillowy Texture'],
        ),
        ProductModel(
          id: 'p6',
          category: 'ghee',
          name: 'A2 Vedic Bilona Ghee 500ml',
          tagline: 'Golden granular aroma',
          badge: 'Vedic Bilona',
          badgeColor: '#D98A0D',
          fat: 'A2 Cultured',
          price: '₹850',
          numericPrice: 850.0,
          unit: '/ 500ml',
          imageUrl: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=800&q=80',
          description: 'Traditional curd-churned wood-fired A2 Desi cow bilona ghee with heavenly aroma.',
          highlights: ['Clay Pot Churned', 'Bilona Method', 'Rich Granular Danedar'],
        ),
      ];
}
