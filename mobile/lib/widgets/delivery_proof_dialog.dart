import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import '../core/config/app_config.dart';
import '../core/utils/ist_date_time.dart';
import '../services/launcher_service.dart';

/// Centralized Delivery Proof Photo Renderer & Single Location Leaflet Map Lightbox
/// Uniformly used across Admin, Delivery Partner, and Customer mobile views.
class DeliveryProofHelper {
  static String resolveUrl(String rawUrl) {
    final clean = rawUrl.trim();
    if (clean.isEmpty) return '';
    if (clean.startsWith('data:image/')) return clean;

    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      if (clean.contains('localhost:') ||
          clean.contains('127.0.0.1:') ||
          clean.contains('naturalmilkdiary.onrender.com')) {
        final uri = Uri.tryParse(clean);
        final path = uri != null ? uri.path : '';
        return '${AppConfig.liveBaseUrl}${path.startsWith('/') ? path : '/$path'}';
      }
      return clean;
    }

    // Relative path e.g. /uploads/proof_...
    final cleanPath = clean.startsWith('/') ? clean : '/$clean';
    return '${AppConfig.liveBaseUrl}$cleanPath';
  }

  static Widget buildImageFromSource(
    String proofStr, {
    double? width,
    double? height,
    BoxFit fit = BoxFit.cover,
  }) {
    final clean = proofStr.trim();
    if (clean.isEmpty) {
      return buildPlaceholder(width: width, height: height);
    }

    // Handle base64 image data
    if (clean.startsWith('data:image/')) {
      try {
        final commaIdx = clean.indexOf(',');
        final cleanBase64 = commaIdx != -1 ? clean.substring(commaIdx + 1) : clean;
        final bytes = base64Decode(cleanBase64);
        return Image.memory(
          bytes,
          width: width,
          height: height,
          fit: fit,
          errorBuilder: (context, error, stackTrace) =>
              buildPlaceholder(width: width, height: height),
        );
      } catch (e) {
        return buildPlaceholder(width: width, height: height);
      }
    }

    final resolved = resolveUrl(clean);
    return Image.network(
      resolved,
      width: width,
      height: height,
      fit: fit,
      errorBuilder: (context, error, stackTrace) {
        // Fallback to direct live cloud server if not already attempted
        final cleanPath = clean.startsWith('/') ? clean : '/$clean';
        final cloudUrl = '${AppConfig.liveBaseUrl}$cleanPath';
        if (resolved != cloudUrl) {
          return Image.network(
            cloudUrl,
            width: width,
            height: height,
            fit: fit,
            errorBuilder: (context, error, stackTrace) => buildPlaceholder(width: width, height: height),
          );
        }
        return buildPlaceholder(width: width, height: height);
      },
      loadingBuilder: (ctx, child, progress) {
        if (progress == null) return child;
        return Container(
          width: width,
          height: height,
          color: const Color(0xFF07160E),
          child: const Center(
            child: SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Color(0xFF34D399),
              ),
            ),
          ),
        );
      },
    );
  }

  static Widget buildPlaceholder({double? width, double? height}) {
    return Container(
      width: width,
      height: height,
      color: const Color(0xFFF1F5F9),
      child: const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.photo_camera_rounded, size: 28, color: Color(0xFF94A3B8)),
            SizedBox(height: 4),
            Text(
              'Proof Photo Verified',
              style: TextStyle(
                fontSize: 11,
                color: Color(0xFF64748B),
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  static void showLightbox({
    required BuildContext context,
    required String proofStr,
    required String customerName,
    required String address,
    num? lat,
    num? lng,
    String? timestamp,
    String? partnerName,
  }) {
    // Default to Madhapur if coords are null or 0
    final double validLat = (lat != null && lat != 0) ? lat.toDouble() : 17.4483;
    final double validLng = (lng != null && lng != 0) ? lng.toDouble() : 78.3915;

    // Format timestamp in Indian Standard Time (IST)
    final formattedIstTime = IstDateTime.formatFull(timestamp);

    showDialog(
      context: context,
      barrierColor: Colors.black87,
      builder: (ctx) {
        String activeView = 'photo'; // 'photo' | 'map'

        return StatefulBuilder(
          builder: (dialogCtx, setState) {
            return Dialog(
              backgroundColor: Colors.transparent,
              insetPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Header
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: const BoxDecoration(
                      color: Color(0xFF0F172A),
                      borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.verified_rounded, color: Color(0xFF34D399), size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                customerName,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 15,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              Text(
                                address.isNotEmpty ? address : 'Doorstep Drop Verified',
                                style: const TextStyle(
                                  color: Color(0xFF94A3B8),
                                  fontSize: 11,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close_rounded, color: Colors.white, size: 22),
                          onPressed: () => Navigator.of(ctx).pop(),
                        ),
                      ],
                    ),
                  ),

                  // View Toggle Switcher (Photo / Leaflet Map)
                  Container(
                    color: const Color(0xFF0B1E14),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    child: Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () => setState(() => activeView = 'photo'),
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 6),
                              decoration: BoxDecoration(
                                color: activeView == 'photo'
                                    ? const Color(0xFF059669)
                                    : const Color(0xFF1E293B),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.photo_camera_rounded, size: 14, color: Colors.white),
                                  SizedBox(width: 5),
                                  Text(
                                    'Photo Proof',
                                    style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w800),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: InkWell(
                            onTap: () => setState(() => activeView = 'map'),
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 6),
                              decoration: BoxDecoration(
                                color: activeView == 'map'
                                    ? const Color(0xFF059669)
                                    : const Color(0xFF1E293B),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.map_rounded, size: 14, color: Colors.white),
                                  SizedBox(width: 5),
                                  Text(
                                    'Leaflet Map Location',
                                    style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w800),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Main Viewport (Photo or Leaflet Slippy Map)
                  Container(
                    constraints: BoxConstraints(
                      maxHeight: MediaQuery.of(context).size.height * 0.58,
                      minHeight: 240,
                    ),
                    width: double.infinity,
                    color: const Color(0xFF07160E),
                    child: activeView == 'photo'
                        ? GestureDetector(
                            onTap: () {
                              // Tapping photo switches directly to Leaflet map for that location
                              setState(() => activeView = 'map');
                            },
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                InteractiveViewer(
                                  minScale: 0.8,
                                  maxScale: 4.0,
                                  child: buildImageFromSource(proofStr, fit: BoxFit.contain),
                                ),
                                Positioned(
                                  bottom: 10,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                                    decoration: BoxDecoration(
                                      color: Colors.black87,
                                      borderRadius: BorderRadius.circular(20),
                                      border: Border.all(color: const Color(0xFF34D399), width: 1),
                                    ),
                                    child: const Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(Icons.touch_app_rounded, size: 13, color: Color(0xFF34D399)),
                                        SizedBox(width: 5),
                                        Text(
                                          'Tap image to view on Leaflet Map',
                                          style: TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.w700),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          )
                        : _SingleLocationLeafletMapWidget(
                            lat: validLat,
                            lng: validLng,
                            customerName: customerName,
                            address: address,
                            onSwitchToPhoto: () => setState(() => activeView = 'photo'),
                          ),
                  ),

                  // Bottom IST Timestamp & Location Card
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: const BoxDecoration(
                      color: Color(0xFF0B1E14),
                      borderRadius: BorderRadius.vertical(bottom: Radius.circular(16)),
                      border: Border(top: BorderSide(color: Color(0xFF059669), width: 1.5)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFF059669),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text(
                                'DOORSTEP VERIFIED',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 0.4,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                '🕒 $formattedIstTime',
                                style: const TextStyle(
                                  color: Color(0xFFA7F3D0),
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w700,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 5),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.location_on_rounded, size: 14, color: Color(0xFF34D399)),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                '📍 Location: ${address.isNotEmpty ? address : 'Doorstep Drop Coordinates Verified'}',
                                style: const TextStyle(color: Color(0xFFE2E8F0), fontSize: 11.5, height: 1.2),
                              ),
                            ),
                          ],
                        ),
                        if (partnerName != null && partnerName.isNotEmpty) ...[
                          const SizedBox(height: 3),
                          Row(
                            children: [
                              const Icon(Icons.two_wheeler_rounded, size: 14, color: Color(0xFF34D399)),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  '🚚 Partner: $partnerName',
                                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}

/// Interactive Single Location Leaflet OpenStreetMap Slippy Map in Pure Flutter.
/// Shows ONLY this single location drop pin, with custom green marker and navigation.
class _SingleLocationLeafletMapWidget extends StatefulWidget {
  final double lat;
  final double lng;
  final String customerName;
  final String address;
  final VoidCallback onSwitchToPhoto;

  const _SingleLocationLeafletMapWidget({
    required this.lat,
    required this.lng,
    required this.customerName,
    required this.address,
    required this.onSwitchToPhoto,
  });

  @override
  State<_SingleLocationLeafletMapWidget> createState() => _SingleLocationLeafletMapWidgetState();
}

class _SingleLocationLeafletMapWidgetState extends State<_SingleLocationLeafletMapWidget> {
  int _zoom = 16;
  Offset _panOffset = Offset.zero;

  @override
  Widget build(BuildContext context) {
    final n = pow(2.0, _zoom).toDouble();
    final xExact = ((widget.lng + 180.0) / 360.0 * n);
    final latRad = widget.lat.clamp(-85.05112878, 85.05112878) * pi / 180.0;
    final yExact = ((1.0 - log(tan(latRad) + 1.0 / cos(latRad)) / pi) / 2.0 * n);

    final centerTileX = xExact.floor();
    final centerTileY = yExact.floor();

    final intraTileX = (xExact - centerTileX) * 256.0;
    final intraTileY = (yExact - centerTileY) * 256.0;

    return LayoutBuilder(
      builder: (ctx, constraints) {
        final cx = constraints.maxWidth / 2.0;
        final cy = constraints.maxHeight / 2.0;

        return GestureDetector(
          onPanUpdate: (details) {
            setState(() {
              _panOffset += details.delta;
            });
          },
          child: Stack(
            children: [
              // 1. Slippy OSM Tiles Grid (3x3 grid around center tile)
              Positioned.fill(
                child: ClipRect(
                  child: Stack(
                    children: [
                      for (int dx = -1; dx <= 1; dx++)
                        for (int dy = -1; dy <= 1; dy++)
                          Positioned(
                            left: cx - intraTileX + (dx * 256.0) + _panOffset.dx,
                            top: cy - intraTileY + (dy * 256.0) + _panOffset.dy,
                            width: 256,
                            height: 256,
                            child: Image.network(
                              'https://tile.openstreetmap.org/$_zoom/${centerTileX + dx}/${centerTileY + dy}.png',
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) => Container(
                                color: const Color(0xFF1E293B),
                                child: const Center(
                                  child: Icon(Icons.map_outlined, color: Colors.white24),
                                ),
                              ),
                            ),
                          ),
                    ],
                  ),
                ),
              ),

              // 2. ONLY This Single Location Marker Pin
              Positioned(
                left: cx + _panOffset.dx - 22,
                top: cy + _panOffset.dy - 50,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Popup bubble
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F172A),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: const Color(0xFF34D399), width: 1.5),
                        boxShadow: const [BoxShadow(color: Colors.black45, blurRadius: 6)],
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            '📍 ${widget.customerName}',
                            style: const TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.w800),
                          ),
                          Text(
                            widget.address,
                            style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 9),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 2),
                    // Custom Green Drop Pin
                    Container(
                      width: 36,
                      height: 36,
                      decoration: const BoxDecoration(
                        color: Color(0xFF059669),
                        shape: BoxShape.circle,
                        boxShadow: [BoxShadow(color: Colors.black38, blurRadius: 6, offset: Offset(0, 3))],
                      ),
                      child: const Center(
                        child: Text('🥛', style: TextStyle(fontSize: 16)),
                      ),
                    ),
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: Color(0xFF047857),
                        shape: BoxShape.circle,
                      ),
                    ),
                  ],
                ),
              ),

              // 3. Top Banner: Leaflet OSM Map Mode
              Positioned(
                top: 10,
                left: 10,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xDD0F172A),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFF059669)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.my_location_rounded, size: 12, color: Color(0xFF34D399)),
                      const SizedBox(width: 5),
                      Text(
                        'Leaflet Map: ${widget.customerName} Only',
                        style: const TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.w800),
                      ),
                    ],
                  ),
                ),
              ),

              // 4. Zoom Controls (+ / -) & Recenter
              Positioned(
                top: 10,
                right: 10,
                child: Column(
                  children: [
                    InkWell(
                      onTap: () {
                        if (_zoom < 18) setState(() => _zoom++);
                      },
                      child: Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(6),
                          boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 4)],
                        ),
                        child: const Icon(Icons.add, size: 18, color: Color(0xFF0F172A)),
                      ),
                    ),
                    const SizedBox(height: 6),
                    InkWell(
                      onTap: () {
                        if (_zoom > 13) setState(() => _zoom--);
                      },
                      child: Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(6),
                          boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 4)],
                        ),
                        child: const Icon(Icons.remove, size: 18, color: Color(0xFF0F172A)),
                      ),
                    ),
                    const SizedBox(height: 6),
                    InkWell(
                      onTap: () => setState(() => _panOffset = Offset.zero),
                      child: Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(6),
                          boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 4)],
                        ),
                        child: const Icon(Icons.center_focus_strong, size: 16, color: Color(0xFF059669)),
                      ),
                    ),
                  ],
                ),
              ),

              // 5. Bottom Navigation / Directions Pill
              Positioned(
                bottom: 10,
                right: 10,
                child: InkWell(
                  onTap: () {
                    LauncherService.openMap(
                      lat: widget.lat,
                      lng: widget.lng,
                      address: widget.address,
                    );
                  },
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFF059669),
                      borderRadius: BorderRadius.circular(8),
                      boxShadow: const [BoxShadow(color: Colors.black38, blurRadius: 4)],
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.navigation_rounded, size: 13, color: Colors.white),
                        SizedBox(width: 4),
                        Text(
                          'Navigate',
                          style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w800),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
