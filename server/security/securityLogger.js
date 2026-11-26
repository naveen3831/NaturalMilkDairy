/**
 * Centralized Security Event Logger
 * Logs authentication failures, authorization denials, rate-limit violations,
 * and administrative actions WITHOUT ever logging passwords, tokens, cookies, or secrets.
 */

function maskIdentifier(val) {
  if (!val || typeof val !== 'string') return 'unknown';
  const clean = val.trim();
  if (clean.includes('@')) {
    const [local, domain] = clean.split('@');
    return `${local.slice(0, 2)}***@${domain}`;
  }
  if (/^\d{7,}$/.test(clean)) {
    return `***${clean.slice(-4)}`;
  }
  return clean.slice(0, 24);
}

function logSecurityEvent(eventType, details = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    event: eventType,
    ip: details.ip || 'unknown',
    method: details.method || '',
    path: details.path || '',
    userId: details.userId || undefined,
    role: details.role || undefined,
    identifier: details.identifier ? maskIdentifier(details.identifier) : undefined,
    reason: details.reason || undefined,
  };
  console.warn(`[SECURITY_AUDIT] ${JSON.stringify(entry)}`);
}

module.exports = { logSecurityEvent, maskIdentifier };
