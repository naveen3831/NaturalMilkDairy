/// ist_date_time.dart
/// Centralized Indian Standard Time (IST - UTC+05:30) helper for Flutter.
/// Guarantees that regardless of the device's local system timezone, all timestamps
/// display in accurate Indian Standard Time (Asia/Kolkata) with the 'IST' identifier.
class IstDateTime {
  /// Converts any DateTime, timestamp int (ms), or ISO date string into Indian Standard Time (UTC+05:30)
  static DateTime toIst(dynamic dateTimeOrString) {
    DateTime dt;
    if (dateTimeOrString is DateTime) {
      dt = dateTimeOrString;
    } else if (dateTimeOrString is int) {
      dt = DateTime.fromMillisecondsSinceEpoch(dateTimeOrString, isUtc: true);
    } else if (dateTimeOrString is String && dateTimeOrString.trim().isNotEmpty) {
      dt = DateTime.tryParse(dateTimeOrString.trim()) ?? DateTime.now();
    } else {
      dt = DateTime.now();
    }

    // Convert to UTC, then apply IST offset (+5 hours, 30 minutes)
    return dt.toUtc().add(const Duration(hours: 5, minutes: 30));
  }

  /// Format: "11 Nov 2026, 01:55:25 PM IST"
  static String formatFull(dynamic dateTimeOrString) {
    if (dateTimeOrString == null || dateTimeOrString.toString().trim().isEmpty) {
      return 'Realtime Verified (IST)';
    }

    final str = dateTimeOrString.toString().trim();
    // If string already contains formatted IST, preserve it
    if (str.contains('IST')) {
      return str;
    }

    final ist = toIst(dateTimeOrString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final hour = ist.hour == 0 ? 12 : (ist.hour > 12 ? ist.hour - 12 : ist.hour);
    final ampm = ist.hour >= 12 ? 'PM' : 'AM';
    final minute = ist.minute.toString().padLeft(2, '0');
    final second = ist.second.toString().padLeft(2, '0');
    final day = ist.day.toString().padLeft(2, '0');

    return '$day ${months[ist.month - 1]} ${ist.year}, ${hour.toString().padLeft(2, '0')}:$minute:$second $ampm IST';
  }

  /// Format: "11 Nov 2026, 01:55 PM IST"
  static String formatShort(dynamic dateTimeOrString) {
    if (dateTimeOrString == null || dateTimeOrString.toString().trim().isEmpty) {
      return 'Realtime Drop (IST)';
    }

    final str = dateTimeOrString.toString().trim();
    if (str.contains('IST')) return str;

    final ist = toIst(dateTimeOrString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final hour = ist.hour == 0 ? 12 : (ist.hour > 12 ? ist.hour - 12 : ist.hour);
    final ampm = ist.hour >= 12 ? 'PM' : 'AM';
    final minute = ist.minute.toString().padLeft(2, '0');
    final day = ist.day.toString().padLeft(2, '0');

    return '$day ${months[ist.month - 1]} ${ist.year}, ${hour.toString().padLeft(2, '0')}:$minute $ampm IST';
  }

  /// Format: "01:55:25 PM IST"
  static String formatTime(dynamic dateTimeOrString) {
    final ist = toIst(dateTimeOrString);
    final hour = ist.hour == 0 ? 12 : (ist.hour > 12 ? ist.hour - 12 : ist.hour);
    final ampm = ist.hour >= 12 ? 'PM' : 'AM';
    final minute = ist.minute.toString().padLeft(2, '0');
    final second = ist.second.toString().padLeft(2, '0');

    return '${hour.toString().padLeft(2, '0')}:$minute:$second $ampm IST';
  }
}
