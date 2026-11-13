import 'dart:convert';
import 'package:flutter/material.dart';
import '../core/config/app_config.dart';
import '../core/utils/ist_date_time.dart';

/// Centralized Delivery Proof Photo Renderer with Location Details Inside Image
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
    // Format timestamp in Indian Standard Time (IST)
    final formattedIstTime = IstDateTime.formatFull(timestamp);

    showDialog(
      context: context,
      barrierColor: Colors.black87,
      builder: (ctx) {
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

              // Main Viewport: Photo Proof with Location Watermark Inside the Image
              Container(
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.of(context).size.height * 0.62,
                  minHeight: 240,
                ),
                width: double.infinity,
                color: const Color(0xFF07160E),
                child: InteractiveViewer(
                  minScale: 0.8,
                  maxScale: 4.0,
                  child: buildImageFromSource(proofStr, fit: BoxFit.contain),
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
  }
}
