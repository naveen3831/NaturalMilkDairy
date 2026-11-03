import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../core/constants/app_colors.dart';

class SelectLocationMapScreen extends StatefulWidget {
  final double? initialLat;
  final double? initialLng;
  final String? initialArea;

  const SelectLocationMapScreen({
    super.key,
    this.initialLat,
    this.initialLng,
    this.initialArea,
  });

  @override
  State<SelectLocationMapScreen> createState() => _SelectLocationMapScreenState();
}

class _SelectLocationMapScreenState extends State<SelectLocationMapScreen>
    with SingleTickerProviderStateMixin {
  // Default coordinates: Madhapur / Hitec City, Hyderabad
  late double _currentLat;
  late double _currentLng;
  int _zoom = 16;

  // Continuous Leaflet World-Pixel Coordinates (Web Mercator Projection)
  late double _worldX;
  late double _worldY;

  // Momentum Fling Animation Controller for Leaflet-like inertia
  late AnimationController _flingController;
  Animation<Offset>? _flingAnimation;

  String _placeTitle = 'Silicon Valley';
  String _placeSubtitle = 'Madhapur, Silicon Valley, Hyderabad';
  bool _isReverseGeocoding = false;

  final TextEditingController _searchCtrl = TextEditingController();
  List<Map<String, dynamic>> _searchResults = [];
  bool _isSearching = false;
  Timer? _searchDebounce;
  Timer? _geocodeDebounce;

  @override
  void initState() {
    super.initState();
    _currentLat = widget.initialLat ?? 17.4483;
    _currentLng = widget.initialLng ?? 78.3915;

    _worldX = _lngToWorldX(_currentLng, _zoom);
    _worldY = _latToWorldY(_currentLat, _zoom);

    if (widget.initialArea != null && widget.initialArea!.isNotEmpty) {
      _placeTitle = widget.initialArea!;
      _placeSubtitle = '${widget.initialArea!}, Hyderabad';
    }

    _flingController = AnimationController(vsync: this);
    _flingController.addListener(() {
      if (_flingAnimation != null) {
        setState(() {
          _worldX = _flingAnimation!.value.dx;
          _worldY = _flingAnimation!.value.dy;
          _currentLat = _worldYToLat(_worldY, _zoom);
          _currentLng = _worldXToLng(_worldX, _zoom);
        });
      }
    });

    _reverseGeocode(_currentLat, _currentLng);
  }

  @override
  void dispose() {
    _flingController.dispose();
    _searchCtrl.dispose();
    _searchDebounce?.cancel();
    _geocodeDebounce?.cancel();
    super.dispose();
  }

  // --- Web Mercator Projection Math (Identical to Leaflet's L.CRS.EPSG3857) ---
  double _latToWorldY(double lat, int zoom) {
    final s = 256.0 * pow(2.0, zoom);
    final latRad = lat.clamp(-85.05112878, 85.05112878) * pi / 180.0;
    return (1.0 - log(tan(latRad) + 1.0 / cos(latRad)) / pi) / 2.0 * s;
  }

  double _lngToWorldX(double lng, int zoom) {
    final s = 256.0 * pow(2.0, zoom);
    return (lng + 180.0) / 360.0 * s;
  }

  double _worldXToLng(double x, int zoom) {
    final s = 256.0 * pow(2.0, zoom);
    return (x / s) * 360.0 - 180.0;
  }

  double _worldYToLat(double y, int zoom) {
    final s = 256.0 * pow(2.0, zoom);
    final n = pi - 2.0 * pi * y / s;
    return 180.0 / pi * atan(0.5 * (exp(n) - exp(-n)));
  }

  // --- Smooth Panning & Leaflet Momentum Physics ---
  void _onPanDown(DragDownDetails details) {
    if (_flingController.isAnimating) {
      _flingController.stop();
    }
  }

  void _onPanUpdate(DragUpdateDetails details) {
    setState(() {
      _worldX -= details.delta.dx;
      _worldY -= details.delta.dy;
      _currentLat = _worldYToLat(_worldY, _zoom);
      _currentLng = _worldXToLng(_worldX, _zoom);
    });
  }

  void _onPanEnd(DragEndDetails details) {
    final v = details.velocity.pixelsPerSecond;
    if (v.distance > 80) {
      // Smooth deceleration glide matching Leaflet's inertiaDeceleration
      final start = Offset(_worldX, _worldY);
      final end = Offset(_worldX - (v.dx * 0.22), _worldY - (v.dy * 0.22));

      _flingAnimation = Tween<Offset>(begin: start, end: end).animate(
        CurvedAnimation(parent: _flingController, curve: Curves.decelerate),
      );
      _flingController.duration = const Duration(milliseconds: 380);
      _flingController.forward(from: 0).whenComplete(() {
        _triggerDebouncedGeocode();
      });
    } else {
      _triggerDebouncedGeocode();
    }
  }

  void _triggerDebouncedGeocode() {
    _geocodeDebounce?.cancel();
    _geocodeDebounce = Timer(const Duration(milliseconds: 250), () {
      _reverseGeocode(_currentLat, _currentLng);
    });
  }

  // --- Smooth Zoom In & Zoom Out ---
  void _zoomIn() {
    if (_zoom < 19) {
      setState(() {
        _zoom++;
        _worldX = _lngToWorldX(_currentLng, _zoom);
        _worldY = _latToWorldY(_currentLat, _zoom);
      });
      _triggerDebouncedGeocode();
    }
  }

  void _zoomOut() {
    if (_zoom > 13) {
      setState(() {
        _zoom--;
        _worldX = _lngToWorldX(_currentLng, _zoom);
        _worldY = _latToWorldY(_currentLat, _zoom);
      });
      _triggerDebouncedGeocode();
    }
  }

  Future<void> _reverseGeocode(double lat, double lng) async {
    setState(() => _isReverseGeocoding = true);
    try {
      final url = Uri.parse(
        'https://nominatim.openstreetmap.org/reverse?format=json&lat=$lat&lon=$lng&zoom=18&addressdetails=1',
      );
      final res = await http.get(url, headers: {
        'Accept-Language': 'en',
        'User-Agent': 'NaturalMilkDairyApp/1.0 (contact@naturalmilkdairy.com)',
      });
      if (res.statusCode == 200) {
        final data = json.decode(res.body);
        if (data is Map && data['address'] != null) {
          final addr = data['address'] as Map;
          final title = addr['neighbourhood'] ??
              addr['suburb'] ??
              addr['residential'] ??
              addr['road'] ??
              addr['city_district'] ??
              (widget.initialArea ?? 'Selected Location');

          final parts = [
            addr['suburb'] ?? addr['neighbourhood'],
            addr['road'],
            addr['city'] ?? 'Hyderabad',
          ].where((e) => e != null && e.toString().trim().isNotEmpty).toList();

          final subtitle = parts.isNotEmpty ? parts.join(', ') : (data['display_name'] ?? 'Hyderabad');

          if (mounted) {
            setState(() {
              _placeTitle = title.toString();
              _placeSubtitle = subtitle.toString();
              _isReverseGeocoding = false;
            });
          }
          return;
        }
      }
    } catch (_) {
      // Quiet fallback
    }
    if (mounted) {
      setState(() {
        _isReverseGeocoding = false;
      });
    }
  }

  void _onSearchChanged(String query) {
    _searchDebounce?.cancel();
    if (query.trim().length < 3) {
      setState(() => _searchResults = []);
      return;
    }
    _searchDebounce = Timer(const Duration(milliseconds: 350), () async {
      setState(() => _isSearching = true);
      try {
        final q = Uri.encodeComponent('${query.trim()}, Hyderabad, Telangana');
        final url = Uri.parse('https://nominatim.openstreetmap.org/search?format=json&q=$q&limit=5');
        final res = await http.get(url, headers: {
          'Accept-Language': 'en',
          'User-Agent': 'NaturalMilkDairyApp/1.0 (contact@naturalmilkdairy.com)',
        });
        if (res.statusCode == 200) {
          final data = json.decode(res.body);
          if (data is List && mounted) {
            setState(() {
              _searchResults = data.map((e) => Map<String, dynamic>.from(e as Map)).toList();
            });
          }
        }
      } catch (_) {
        // Quiet
      } finally {
        if (mounted) setState(() => _isSearching = false);
      }
    });
  }

  void _selectSearchResult(Map<String, dynamic> item) {
    final lat = double.tryParse(item['lat']?.toString() ?? '') ?? _currentLat;
    final lon = double.tryParse(item['lon']?.toString() ?? '') ?? _currentLng;
    setState(() {
      _currentLat = lat;
      _currentLng = lon;
      _worldX = _lngToWorldX(lat, _zoom);
      _worldY = _latToWorldY(lat, _zoom);
      _searchResults = [];
      _searchCtrl.clear();
    });
    FocusScope.of(context).unfocus();
    _reverseGeocode(lat, lon);
  }

  void _centerToCurrentGps() {
    setState(() {
      _currentLat = 17.4483;
      _currentLng = 78.3915;
      _worldX = _lngToWorldX(17.4483, _zoom);
      _worldY = _latToWorldY(17.4483, _zoom);
    });
    _reverseGeocode(17.4483, 78.3915);
  }

  void _confirmAndReturn() {
    Navigator.of(context).pop({
      'latitude': _currentLat,
      'longitude': _currentLng,
      'placeTitle': _placeTitle,
      'address': _placeSubtitle,
      'area': _placeTitle,
    });
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final screenCenterX = size.width / 2.0;
    final screenCenterY = size.height / 2.0;

    // Calculate visible tile ranges with 1-tile buffer on all sides for 0 pop-in
    final minTileX = ((_worldX - screenCenterX) / 256.0).floor() - 1;
    final maxTileX = ((_worldX + screenCenterX) / 256.0).floor() + 1;
    final minTileY = ((_worldY - screenCenterY) / 256.0).floor() - 1;
    final maxTileY = ((_worldY + screenCenterY) / 256.0).floor() + 1;

    final numTiles = 1 << _zoom;

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Stack(
          children: [
            // 1. Ultra-Smooth Leaflet Web Mercator Tile Canvas
            Positioned.fill(
              child: GestureDetector(
                onPanDown: _onPanDown,
                onPanUpdate: _onPanUpdate,
                onPanEnd: _onPanEnd,
                onDoubleTap: _zoomIn,
                child: Container(
                  color: const Color(0xFFF1F5F9),
                  child: ClipRect(
                    child: Stack(
                      children: [
                        for (int ty = minTileY; ty <= maxTileY; ty++)
                          if (ty >= 0 && ty < numTiles)
                            for (int tx = minTileX; tx <= maxTileX; tx++) ...[
                              Builder(
                                builder: (context) {
                                  final wrappedX = ((tx % numTiles) + numTiles) % numTiles;
                                  final leftPos = (tx * 256.0) - _worldX + screenCenterX;
                                  final topPos = (ty * 256.0) - _worldY + screenCenterY;

                                  return Positioned(
                                    key: ValueKey('tile-$_zoom-$wrappedX-$ty'),
                                    left: leftPos,
                                    top: topPos,
                                    width: 256,
                                    height: 256,
                                    child: Image.network(
                                      'https://tile.openstreetmap.org/$_zoom/$wrappedX/$ty.png',
                                      headers: const {
                                        'User-Agent': 'NaturalMilkDairyApp/1.0 (contact@naturalmilkdairy.com)',
                                      },
                                      fit: BoxFit.cover,
                                      errorBuilder: (context, error, stackTrace) => Image.network(
                                        'https://a.tile.openstreetmap.fr/hot/$_zoom/$wrappedX/$ty.png',
                                        headers: const {
                                          'User-Agent': 'NaturalMilkDairyApp/1.0 (contact@naturalmilkdairy.com)',
                                        },
                                        fit: BoxFit.cover,
                                        errorBuilder: (context, error, stackTrace) => Container(
                                          color: const Color(0xFFE2ECE3),
                                          child: const Center(
                                            child: Icon(Icons.map_outlined, color: AppColors.primaryGreen, size: 28),
                                          ),
                                        ),
                                      ),
                                    ),
                                  );
                                },
                              ),
                            ],
                      ],
                    ),
                  ),
                ),
              ),
            ),

            // 2. Center Delivery Drop Marker Matching Screenshot in Brand Colors
            Positioned.fill(
              child: IgnorePointer(
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Floating Brand Dark Blue Tooltip Bubble
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
                        decoration: BoxDecoration(
                          color: AppColors.dairyBlue,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.dairyBlue.withValues(alpha: 0.35),
                              blurRadius: 16,
                              offset: const Offset(0, 6),
                            ),
                          ],
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Text(
                              'Order will be delivered here',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w900,
                                color: Colors.white,
                                letterSpacing: 0.2,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _isReverseGeocoding ? 'Detecting exact spot...' : 'Place the pin to your exact location',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF6EE7B7),
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Downward Pointer Triangle
                      CustomPaint(
                        size: const Size(12, 6),
                        painter: _TrianglePainter(color: AppColors.dairyBlue),
                      ),
                      const SizedBox(height: 4),

                      // Brand Primary Green Drop Pin
                      Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: AppColors.primaryGreen,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2.5),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primaryGreen.withValues(alpha: 0.4),
                              blurRadius: 8,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: Center(
                          child: Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ),
                      ),
                      Container(
                        width: 2.5,
                        height: 12,
                        decoration: BoxDecoration(
                          color: AppColors.primaryGreen,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                      // Ground Shadow Circle
                      Container(
                        width: 18,
                        height: 6,
                        decoration: BoxDecoration(
                          color: AppColors.primaryGreen.withValues(alpha: 0.20),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.primaryGreen.withValues(alpha: 0.45), width: 1),
                        ),
                      ),
                      const SizedBox(height: 38), // Center offset
                    ],
                  ),
                ),
              ),
            ),

            // 3. Top Floating Search & Back Header Bar
            Positioned(
              top: 12,
              left: 16,
              right: 16,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Row: Back button + Title
                  Row(
                    children: [
                      InkWell(
                        onTap: () => Navigator.of(context).pop(),
                        borderRadius: BorderRadius.circular(22),
                        child: Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.06),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: AppColors.dairyBlue),
                        ),
                      ),
                      const SizedBox(width: 14),
                      const Text(
                        'Select Your Location',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          color: AppColors.dairyBlue,
                          letterSpacing: -0.2,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Search Bar
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.borderSubtle),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.dairyBlue.withValues(alpha: 0.06),
                          blurRadius: 10,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: TextField(
                      controller: _searchCtrl,
                      onChanged: _onSearchChanged,
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.dairyBlue),
                      decoration: InputDecoration(
                        hintText: 'Search for apartment, street name...',
                        hintStyle: const TextStyle(fontSize: 13.5, color: AppColors.textLight, fontWeight: FontWeight.w500),
                        prefixIcon: const Icon(Icons.search_rounded, color: AppColors.primaryGreen, size: 22),
                        suffixIcon: _isSearching
                            ? const Padding(
                                padding: EdgeInsets.all(12),
                                child: SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primaryGreen),
                                ),
                              )
                            : (_searchCtrl.text.isNotEmpty
                                ? IconButton(
                                    icon: const Icon(Icons.close_rounded, size: 18, color: AppColors.textMuted),
                                    onPressed: () {
                                      _searchCtrl.clear();
                                      setState(() => _searchResults = []);
                                    },
                                  )
                                : null),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      ),
                    ),
                  ),

                  // Search Results Dropdown List
                  if (_searchResults.isNotEmpty)
                    Container(
                      margin: const EdgeInsets.only(top: 6),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.borderSubtle),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.dairyBlue.withValues(alpha: 0.12),
                            blurRadius: 16,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      constraints: const BoxConstraints(maxHeight: 220),
                      child: ListView.separated(
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        shrinkWrap: true,
                        itemCount: _searchResults.length,
                        separatorBuilder: (context, index) => const Divider(height: 1, color: Color(0xFFF1F5F9)),
                        itemBuilder: (ctx, idx) {
                          final item = _searchResults[idx];
                          return ListTile(
                            dense: true,
                            leading: const Icon(Icons.location_on_rounded, color: AppColors.primaryGreen, size: 20),
                            title: Text(
                              item['display_name'] ?? '',
                              style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.textMain),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            onTap: () => _selectSearchResult(item),
                          );
                        },
                      ),
                    ),
                ],
              ),
            ),

            // 4. Floating Zoom (+ / -) & GPS Buttons on Right
            Positioned(
              right: 18,
              bottom: 160,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Zoom In Button (+)
                  InkWell(
                    onTap: _zoomIn,
                    borderRadius: BorderRadius.circular(22),
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.borderSubtle),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.dairyBlue.withValues(alpha: 0.10),
                            blurRadius: 10,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      child: const Center(
                        child: Icon(Icons.add, color: AppColors.dairyBlue, size: 22),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Zoom Out Button (-)
                  InkWell(
                    onTap: _zoomOut,
                    borderRadius: BorderRadius.circular(22),
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.borderSubtle),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.dairyBlue.withValues(alpha: 0.10),
                            blurRadius: 10,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      child: const Center(
                        child: Icon(Icons.remove, color: AppColors.dairyBlue, size: 22),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // GPS Crosshair Button
                  InkWell(
                    onTap: _centerToCurrentGps,
                    borderRadius: BorderRadius.circular(26),
                    child: Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.borderSubtle),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.dairyBlue.withValues(alpha: 0.12),
                            blurRadius: 14,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: const Center(
                        child: Icon(Icons.my_location_rounded, color: AppColors.primaryGreen, size: 24),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // 5. Bottom Location Details Card & Confirm Location Button Matching Brand Palette
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: Container(
                padding: const EdgeInsets.fromLTRB(20, 18, 20, 22),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.dairyBlue.withValues(alpha: 0.08),
                      blurRadius: 20,
                      offset: const Offset(0, -6),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _placeTitle,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        color: AppColors.dairyBlue,
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _placeSubtitle,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textMuted,
                        height: 1.35,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 18),

                    // Full-width Natural Milk Dairy Brand Green "Confirm Location" Button
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primaryGreen,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          elevation: 0,
                          shadowColor: Colors.transparent,
                        ),
                        onPressed: _confirmAndReturn,
                        child: const Text(
                          'Confirm Location',
                          style: TextStyle(
                            fontSize: 15.5,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                            letterSpacing: 0.3,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TrianglePainter extends CustomPainter {
  final Color color;
  _TrianglePainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    final path = Path()
      ..moveTo(0, 0)
      ..lineTo(size.width / 2, size.height)
      ..lineTo(size.width, 0)
      ..close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
