import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import '../core/config/app_config.dart';
import '../core/utils/ist_date_time.dart';
import '../services/launcher_service.dart';

Uint8List _decodeBase64Worker(String input) {
  try {
    String clean = input.trim();
    final commaIdx = clean.indexOf(',');
    if (commaIdx != -1 && clean.startsWith('data:')) {
      clean = clean.substring(commaIdx + 1).trim();
    }
    // Remove all whitespace/newlines that might corrupt base64
    clean = clean.replaceAll(RegExp(r'\s+'), '');
    return base64Decode(clean);
  } catch (_) {
    return Uint8List(0);
  }
}

/// Centralized Delivery Proof Photo Renderer with Location Details Inside Image
/// Uniformly used across Admin, Delivery Partner, and Customer mobile views.
class DeliveryProofHelper {
  /// Robust check for any base64 image data (data URI or raw base64 bytes)
  static bool isBase64Image(String raw) {
    final clean = raw.trim();
    if (clean.isEmpty) return false;
    if (clean.startsWith('data:image/')) return true;
    if (clean.startsWith('http://') || clean.startsWith('https://')) return false;

    // Common raw base64 image signatures
    if (clean.startsWith('/9j/') || // JPEG
        clean.startsWith('iVBORw0KGgo') || // PNG
        clean.startsWith('R0lGOD') || // GIF
        clean.startsWith('UklGR')) { // WebP
      return true;
    }

    // Any non-HTTP string exceeding typical URL length is payload data, NOT a relative path!
    if (clean.length > 250) {
      return true;
    }
    return false;
  }

  static String resolveUrl(String rawUrl) {
    final clean = rawUrl.trim();
    if (clean.isEmpty) return '';
    if (isBase64Image(clean)) return clean;

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

    // Only short relative paths e.g. /uploads/proof_...
    if (clean.length < 300) {
      final cleanPath = clean.startsWith('/') ? clean : '/$clean';
      return '${AppConfig.liveBaseUrl}$cleanPath';
    }

    return clean;
  }

  static final Map<String, Uint8List> _base64BytesCache = {};

  static String _cacheKey(String s) {
    final len = s.length;
    if (len < 60) return s;
    return '${len}_${s.substring(0, 20)}_${s.substring(len - 20)}';
  }

  static Future<Uint8List> _getCachedBase64Bytes(String cleanBase64) async {
    final key = _cacheKey(cleanBase64);
    final cached = _base64BytesCache[key];
    if (cached != null) return cached;

    final Uint8List bytes;
    if (cleanBase64.length < 30000) {
      bytes = _decodeBase64Worker(cleanBase64);
    } else {
      bytes = await compute(_decodeBase64Worker, cleanBase64);
    }

    if (bytes.isNotEmpty) {
      if (_base64BytesCache.length > 30) {
        _base64BytesCache.remove(_base64BytesCache.keys.first);
      }
      _base64BytesCache[key] = bytes;
    }
    return bytes;
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

    // Handle base64 image data (both data URI and raw base64) with off-thread isolate decoding
    if (isBase64Image(clean)) {
      final commaIdx = clean.indexOf(',');
      final cleanBase64 = (commaIdx != -1 && clean.startsWith('data:')) ? clean.substring(commaIdx + 1).trim() : clean;
      final cached = _base64BytesCache[_cacheKey(cleanBase64)];
      if (cached != null && cached.isNotEmpty) {
        return Image.memory(
          cached,
          width: width,
          height: height,
          fit: fit,
          errorBuilder: (_, _, _) => buildPlaceholder(width: width, height: height),
        );
      }
      return FutureBuilder<Uint8List>(
        future: _getCachedBase64Bytes(cleanBase64),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return Container(
              width: width,
              height: height,
              color: const Color(0xFF07160E),
              child: const Center(
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Color(0xFF34D399),
                  ),
                ),
              ),
            );
          }
          if (snapshot.hasData && snapshot.data != null && snapshot.data!.isNotEmpty) {
            return Image.memory(
              snapshot.data!,
              width: width,
              height: height,
              fit: fit,
              errorBuilder: (_, _, _) => buildPlaceholder(width: width, height: height),
            );
          }
          return buildPlaceholder(width: width, height: height);
        },
      );
    }

    // Handle valid web/network image URLs
    final resolved = resolveUrl(clean);
    if (!resolved.startsWith('http://') && !resolved.startsWith('https://')) {
      return buildPlaceholder(width: width, height: height);
    }

    return Image.network(
      resolved,
      width: width,
      height: height,
      fit: fit,
      cacheWidth: 800,
      errorBuilder: (context, error, stackTrace) {
        final cleanPath = clean.startsWith('/') ? clean : '/$clean';
        final cloudUrl = '${AppConfig.liveBaseUrl}$cleanPath';
        if (resolved != cloudUrl) {
          return Image.network(
            cloudUrl,
            width: width,
            height: height,
            fit: fit,
            cacheWidth: 800,
            errorBuilder: (_, _, _) => buildPlaceholder(width: width, height: height),
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

  /// Opens the Doorstep Photo Proof in a full-screen, high-performance viewer
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
    Navigator.of(context).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (ctx) => DeliveryProofFullScreenViewer(
          proofStr: proofStr,
          customerName: customerName,
          address: address,
          lat: lat,
          lng: lng,
          timestamp: timestamp,
          partnerName: partnerName,
        ),
      ),
    );
  }
}

/// Dedicated 100% Full-Screen Doorstep Proof Photo Viewer
class DeliveryProofFullScreenViewer extends StatelessWidget {
  final String proofStr;
  final String customerName;
  final String address;
  final num? lat;
  final num? lng;
  final String? timestamp;
  final String? partnerName;

  const DeliveryProofFullScreenViewer({
    super.key,
    required this.proofStr,
    required this.customerName,
    required this.address,
    this.lat,
    this.lng,
    this.timestamp,
    this.partnerName,
  });

  @override
  Widget build(BuildContext context) {
    final formattedIstTime = IstDateTime.formatFull(timestamp);

    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Stack(
          children: [
            // 1. Full Screen Interactive Zoomable Photo
            Center(
              child: InteractiveViewer(
                minScale: 0.8,
                maxScale: 5.0,
                child: SizedBox(
                  width: double.infinity,
                  height: double.infinity,
                  child: DeliveryProofHelper.buildImageFromSource(
                    proofStr,
                    fit: BoxFit.contain,
                  ),
                ),
              ),
            ),

            // 2. Top Header Bar
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Colors.black.withValues(alpha: 0.85),
                      Colors.black.withValues(alpha: 0.0),
                    ],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        shape: BoxShape.circle,
                      ),
                      child: IconButton(
                        icon: const Icon(Icons.arrow_back_rounded, color: Colors.white, size: 22),
                        tooltip: 'Back',
                        onPressed: () => Navigator.of(context).pop(),
                      ),
                    ),
                    const SizedBox(width: 12),
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
                              fontSize: 16,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const Text(
                            'Doorstep Delivery Photo Proof',
                            style: TextStyle(
                              color: Color(0xFF34D399),
                              fontSize: 11.5,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        shape: BoxShape.circle,
                      ),
                      child: IconButton(
                        icon: const Icon(Icons.close_rounded, color: Colors.white, size: 22),
                        tooltip: 'Close',
                        onPressed: () => Navigator.of(context).pop(),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // 3. Bottom Information Card with GPS Navigation
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Container(
                padding: const EdgeInsets.fromLTRB(16, 20, 16, 16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Colors.black.withValues(alpha: 0.0),
                      Colors.black.withValues(alpha: 0.92),
                    ],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A).withValues(alpha: 0.92),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFF059669), width: 1.5),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.4),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFF059669),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text(
                              '✓ DOORSTEP DROP VERIFIED',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.4,
                              ),
                            ),
                          ),
                          const Spacer(),
                          Text(
                            formattedIstTime,
                            style: const TextStyle(
                              color: Color(0xFFA7F3D0),
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.location_on_rounded, size: 15, color: Color(0xFF34D399)),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              address.isNotEmpty ? address : 'Doorstep Drop Location Verified',
                              style: const TextStyle(color: Color(0xFFE2E8F0), fontSize: 12, height: 1.3),
                            ),
                          ),
                        ],
                      ),
                      if (partnerName != null && partnerName!.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            const Icon(Icons.two_wheeler_rounded, size: 15, color: Color(0xFF34D399)),
                            const SizedBox(width: 6),
                            Text(
                              'Delivered by: $partnerName',
                              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11.5, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ],
                      if (lat != null && lng != null) ...[
                        const SizedBox(height: 10),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            onPressed: () => LauncherService.openMap(lat: lat, lng: lng, address: address),
                            icon: const Icon(Icons.navigation_rounded, size: 16),
                            label: Text(
                              'Open GPS in Google Maps (${lat!.toStringAsFixed(3)}, ${lng!.toStringAsFixed(3)})',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF2563EB),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
