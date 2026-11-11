/**
 * istDateTime.js
 * Centralized Indian Standard Time (IST - UTC+05:30, Asia/Kolkata) date & time formatter.
 * Ensures consistent IST representation across Admin, Delivery Partner, and Customer web portals.
 */

export const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Formats a Date or date string to full Indian Standard Time.
 * Example: "11 Nov 2026, 01:55:25 PM IST"
 */
export function formatISTDateTime(dateOrStr, options = {}) {
  if (!dateOrStr) return 'Realtime Verified (IST)';
  const d = new Date(dateOrStr);
  if (isNaN(d.getTime())) return String(dateOrStr);

  const formatted = d.toLocaleString('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: options.showSeconds !== false ? '2-digit' : undefined,
    hour12: true,
    ...options,
  });

  return formatted.includes('IST') ? formatted : `${formatted} IST`;
}

/**
 * Formats time only in IST.
 * Example: "01:55:25 PM IST"
 */
export function formatISTTime(dateOrStr) {
  if (!dateOrStr) return '';
  const d = new Date(dateOrStr);
  if (isNaN(d.getTime())) return String(dateOrStr);

  const formatted = d.toLocaleTimeString('en-IN', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return formatted.includes('IST') ? formatted : `${formatted} IST`;
}

/**
 * Formats date only in IST.
 * Example: "11 Nov 2026"
 */
export function formatISTDate(dateOrStr) {
  if (!dateOrStr) return '';
  const d = new Date(dateOrStr);
  if (isNaN(d.getTime())) return String(dateOrStr);

  return d.toLocaleDateString('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
