# Security Audit & Hardening Report — Natural Milk Dairy

> **Audit Scope:** MERN Backend (`server/`), React/Vite Web Frontend (`client/`), and Flutter/Android Mobile Application (`mobile/`)
> **Standards Applied:** OWASP Top 10, OWASP API Security Top 10, OWASP MASVS / Mobile Top 10, Android Security Best Practices, Google Play Store Security Requirements

---

## 1. Executive Security Summary

A comprehensive defensive security audit and hardening pass was performed across the Natural Milk Dairy backend API, web application, and Android/Flutter mobile codebase. **Critical** and **High** vulnerabilities—including Google/Firebase authentication bypasses, Razorpay payment signature bypasses, unauthenticated PII/PDF report exposure, hardcoded credential fallbacks and error-response credential leaks, IDORs, mass assignment, SSRF/SVG upload risks, stored XSS in report previews, and insecure Android cleartext/backup/release settings—were identified and remediated while preserving existing credentials, authentication architecture, database data, and business logic.

No system is 100% immune to attack; security is continuous. Remaining operational risks (such as Play Store release keystore setup and client-side API key restrictions) are documented in Section 28.

---

## 2. Architecture Reviewed

- **Backend (`server/`):** Node.js, Express.js, MongoDB / Mongoose, `ws` WebSocket server (`/ws`), JWT (`HS256`), Firebase/Google token verification, Razorpay payment integration, Cloudinary media storage, Nodemailer SMTP, PDFKit.
- **Web Frontend (`client/`):** React + Vite SPA (`client/src/`), hosted with `client/vercel.json`, Leaflet maps, Google Identity Services, Razorpay Checkout, Firebase Cloud Messaging service worker.
- **Mobile (`mobile/`):** Flutter (Dart SDK `^3.13.5`) & Android (`compileSdk = 35`, `minSdk = 24`, `targetSdk = 35`), Firebase Core/Messaging/Auth, Google Sign-In, `http`, `shared_preferences`, native `MainActivity.kt` MethodChannel for camera/print/URL launching.

---

## 3. Backend Vulnerabilities Found

| Severity | Finding | Location | Status |
|---|---|---|---|
| **CRITICAL** | Google/Firebase Sign-In accepted unverified magic strings (`google_in_page_verified`, `in_page_google_*`), `jwt.decode` fallback, and body-email fallback | `server/controllers/authController.js`, `server/security/firebaseVerifier.js` | **Fixed** |
| **CRITICAL** | Razorpay `verifyPayment` logged HMAC mismatch and still activated subscriptions; missing signature skipped check | `server/controllers/subscriptionController.js` | **Fixed** |
| **CRITICAL** | `optionalToken` & body-mobile fallback allowed unauthenticated subscription creation/upgrade/extension | `server/routes/customerRoutes.js`, `server/routes/subscriptionRoutes.js`, `server/controllers/customerController.js` | **Fixed** |
| **CRITICAL** | Unauthenticated access to customer, partner, and admin financial/PII PDF reports via `optionalToken` | `server/routes/reportRoutes.js`, `server/controllers/reportController.js` | **Fixed** |
| **CRITICAL** | Hardcoded credential fallbacks (`MONGODB_URI`, `CLOUDINARY_*`, `JWT_SECRET`, Razorpay key) and SMTP credential leak in HTTP 500 error response | `server/config/db.js`, `server/config/cloudinary.js`, `server/middleware/authMiddleware.js`, `server/controllers/authController.js` | **Fixed** |
| **HIGH** | Unauthenticated support chat enumeration (`GET /my-chats`) and `senderRole: 'admin'` spoofing (`POST /chat`) | `server/routes/supportRoutes.js`, `server/controllers/supportController.js` | **Fixed** |
| **HIGH** | Unauthenticated delivery partner duty-status toggling and fallback driver record creation | `server/routes/deliveryBoyRoutes.js`, `server/controllers/deliveryBoyController.js` | **Fixed** |
| **HIGH** | IDOR in `GET /api/reports/analytics`, `DELETE /api/customers/:id/history/:entryId`, and `deleteCustomer` body `customerId` | `server/controllers/reportController.js`, `server/controllers/customerController.js` | **Fixed** |
| **HIGH** | Mass assignment of `deliveryPlan` on customer profile update | `server/controllers/customerController.js` | **Verified / Hardened** |
| **HIGH** | Client-supplied add-on prices trusted in `markDelivered` and `createOrder` | `server/controllers/deliveryController.js`, `server/controllers/subscriptionController.js` | **Fixed** |
| **HIGH** | WebSocket `guest` fallback received private `CUSTOMER_UPDATED`, `PAYMENT_RECORDED`, `SUPPORT_CHAT_MESSAGE` broadcasts; `isOriginAllowed` always returned `true` | `server/config/websocket.js` | **Fixed** |
| **HIGH** | Unauthenticated `/api/upload/test`, SVG uploads allowed, SSRF via external URLs and local path resolution in `ensureCloudinaryUrl` | `server/routes/uploadRoutes.js`, `server/config/cloudinary.js` | **Fixed** |
| **HIGH** | Unauthenticated PII leakage in `checkEmail` | `server/controllers/authController.js`, `server/routes/authRoutes.js` | **Fixed** |
| **MEDIUM** | Missing `select: false` / `bcryptjs` missing dependency crash on `updateMyProfile` | `server/controllers/deliveryBoyController.js` | **Fixed** (`hashPassword` used) |
| **MEDIUM** | Missing `PUT /api/notifications/:id/read` ownership scoping | `server/controllers/notificationController.js` | **Fixed** |
| **MEDIUM** | Plaintext OTP storage/logging, `Math.random()` OTP generation, 6-char reset minimum | `server/controllers/authController.js` | **Fixed** |
| **MEDIUM** | Wildcard CORS regexes (`*.speshway.site`, `natural-milk-dairy*.vercel.app`) | `server/index.js` | **Fixed** |
| **MEDIUM** | Synchronous `cp.execSync` client build in Express catch-all route (DoS risk) | `server/index.js` | **Fixed** |
| **LOW** | Global rate limiting absent; oversized 15MB JSON limit; stack/error message exposure | `server/index.js`, `server/middleware/rateLimitMiddleware.js` | **Fixed** |

---

## 4. Backend Protections Implemented

- Created `server/middleware/securityMiddleware.js` implementing:
  - `securityHeadersMiddleware` (Helmet-equivalent security headers & strict CSP)
  - `sanitizeNoSqlMiddleware` (recursive `$` operator & `__proto__`/`constructor`/`prototype` stripping on `req.body`, `req.query`, `req.params`)
  - `escapeRegex()` & `isValidObjectId()`
  - `logSecurityEvent()` (structured security audit logging with automatic secret/token/password redaction)
  - `sha256()` (for hashing OTPs and reset tokens at rest)
- Hardened `server/index.js` with `x-powered-by` disabled, global `/api` rate limiting (300 req/min/IP), 5MB JSON limit, 1MB URL-encoded limit, strict CORS allowlist, safe centralized error handler, and removal of `execSync` in `app.get('*')`.

---

## 5. API Security

- Removed `optionalToken` from payment, subscription, PDF report, and duty-status endpoints; enforced `verifyToken` + role/ownership middleware.
- Added rate limiting to `/api/auth/check-email`, `/api/upload`, `/api/upload/base64`, and global `/api/*`.
- Enforced server-side `Product` catalog price lookups in `deliveryController.js` and `subscriptionController.js`.

---

## 6. Authentication Security

- `verifyToken` enforces `JWT_SECRET` from environment variables (no hardcoded fallback) and `algorithms: ['HS256']`.
- Removed `google_in_page_verified` / `in_page_google_*` bypasses and `jwt.decode` fallbacks in `authController.js` and `firebaseVerifier.js`.
- Password reset OTPs now use `crypto.randomInt(100000, 1000000)`, SHA-256 hashed storage, 8-character minimum password enforcement, and no plaintext OTP logging or SMTP error credential leakage.

---

## 7. Authorization / RBAC Security

- Enforced server-side `req.user.role` checks (`admin`, `delivery_boy`, `customer`, `user`) across routes and controllers.
- `upgradePlan` and `extendSubscription` in `customerController.js` are restricted to `admin` and `delivery_boy` staff; customers must complete Razorpay checkout.
- `supportController.js` derives `senderRole` strictly from `req.user.role` and validates ticket ownership before appending messages.
- `deliveryBoyController.js` scopes `toggleDutyStatus` to the authenticated driver unless `req.user.role === 'admin'`.

---

## 8. MongoDB Security

- Removed hardcoded MongoDB Atlas fallback URI from `server/config/db.js` (uses `process.env.MONGODB_URI`).
- Applied `sanitizeNoSqlMiddleware` globally on all incoming requests to strip `$ne`, `$gt`, `$where`, `$regex`, and prototype pollution keys.
- Escaped user search inputs with `escapeRegex` before constructing `RegExp` queries.

---

## 9. Content Security Policy (CSP)

Configured in both `server/middleware/securityMiddleware.js` and `client/vercel.json`:
- `default-src 'self'`
- `script-src 'self' https://unpkg.com https://accounts.google.com https://checkout.razorpay.com https://www.gstatic.com` (no `unsafe-eval`, no `*`)
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com https://accounts.google.com`
- `font-src 'self' https://fonts.gstatic.com data:`
- `img-src 'self' data: blob: https://res.cloudinary.com https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://naturalmilkdairy.speshway.site https://naturalmilkdiary.onrender.com https://lh3.googleusercontent.com`
- `connect-src 'self' https://naturalmilkdairy.speshway.site wss://naturalmilkdairy.speshway.site https://naturalmilkdiary.onrender.com wss://naturalmilkdiary.onrender.com https://accounts.google.com https://www.googleapis.com https://nominatim.openstreetmap.org https://api.razorpay.com https://lumberjack.razorpay.com https://fcmregistrations.googleapis.com https://firebaseinstallations.googleapis.com`
- `frame-src 'self' https://accounts.google.com https://api.razorpay.com https://checkout.razorpay.com`
- `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `form-action 'self'`, `worker-src 'self'`, `manifest-src 'self'`

---

## 10. CORS

- Replaced wildcard regexes (`/\.speshway\.site$/`, `/natural-milk-dairy.*\.vercel\.app$/`) with an explicit allowlist of known production and local development origins in `server/index.js` and `server/config/websocket.js`.
- Unauthorized origins are rejected with HTTP 403 and logged via `CORS_REJECTED`.

---

## 11. Security Headers

Enabled on both Express (`server/middleware/securityMiddleware.js`) and Vercel (`client/vercel.json`):
- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(self), payment=(self)`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Cross-Origin-Opener-Policy: same-origin-allow-popups`
- `Cross-Origin-Resource-Policy: cross-origin`

---

## 12. Rate Limiting

- Global `/api` limiter: 300 requests / minute / IP.
- Auth login/Google limiter: 15 requests / 15 minutes / IP.
- Registration limiter: 5 requests / hour / IP.
- OTP & `/check-email` limiter: 10 requests / 15 minutes / IP.
- Support & upload endpoints: 30–40 requests / 10 minutes / IP.

---

## 13. XSS Protection

- Verified zero `dangerouslySetInnerHTML`, `innerHTML`, `eval()`, `new Function()` usages in `client/src/`.
- Fixed Stored/DOM XSS in `client/src/services/htmlReportService.js` and `mobile/lib/services/html_report_service.dart` by escaping all interpolated customer, partner, payment, and period fields.
- Added `sandbox=""` to the report preview `<iframe>` in `client/src/components/ReportDownloadModal.jsx`.

---

## 14. CSRF Protection

- REST APIs use `Authorization: Bearer <JWT>` headers (stored in `sessionStorage` on web, not ambient cookies), preventing standard form-based CSRF attacks.
- Strict CORS allowlist prevents cross-origin credentialed requests from untrusted origins.

---

## 15. IDOR Protection

- `reportController.js` (`getReportAnalytics`, `downloadCustomerPdf`, `downloadPartnerPdf`): non-admin users are strictly scoped to their own `req.user` identity.
- `customerController.js` (`deleteCustomerHistoryEntry`, `deleteCustomer`): verified ownership of `:entryId` against `:id` and removed `req.body.customerId` override.
- `notificationController.js` (`markAsRead`): scoped update filter with `getUserNotificationScope(req.user)`.
- `supportController.js` (`sendChatMessage`, `getMyChats`): scoped strictly to authenticated `req.user`.

---

## 16. File Upload Security

- `server/routes/uploadRoutes.js`:
  - Restricted `multer` MIME filter to raster images (`image/jpeg`, `image/png`, `image/webp`, `image/gif`) — **SVGs blocked**.
  - Added magic-byte signature validation (`hasValidImageMagicBytes`) for JPEG, PNG, GIF, and WEBP.
  - Enforced 5MB file size limit and sanitized `folder` against an allowlist (`sanitizeCloudinaryFolder`).
  - Restricted `/api/upload/test` to authenticated admins.
- `server/config/cloudinary.js`:
  - Blocked arbitrary `http(s)://` URLs (SSRF) and `../` path traversal in `ensureCloudinaryUrl`.

---

## 17. Flutter Security

- Enforced `autoEnforceLiveInRelease = true` in `mobile/lib/core/config/app_config.dart` so release builds always use `https://naturalmilkdairy.speshway.site` and `wss://naturalmilkdairy.speshway.site/ws`.
- Escaped all HTML interpolations in `mobile/lib/services/html_report_service.dart`.
- Verified no hardcoded server secrets, database credentials, or SSL `badCertificateCallback` bypasses exist in `mobile/lib/`.

---

## 18. Android Security

- `mobile/android/app/src/main/AndroidManifest.xml`:
  - Set `android:allowBackup="false"` with `@xml/backup_rules` and `@xml/data_extraction_rules` excluding `sharedpref` and `database`.
  - Removed `android:usesCleartextTraffic="true"` and configured `android:networkSecurityConfig="@xml/network_security_config"`.
- `mobile/android/app/build.gradle.kts`:
  - Enabled R8/ProGuard code shrinking and obfuscation (`isMinifyEnabled = true`, `isShrinkResources = true`) with `proguard-rules.pro`.
  - Added support for `key.properties` release signing without committing credentials.

---

## 19. Network Security

- Created `mobile/android/app/src/main/res/xml/network_security_config.xml` with `<base-config cleartextTrafficPermitted="false">` for production HTTPS enforcement and `<debug-overrides>` for local development only.
- Certificate pinning was evaluated and **intentionally omitted** at this stage because brittle leaf-certificate pins can lock out mobile users during automated Let's Encrypt/CDN certificate rotations; if pinning is added later, use redundant intermediate/root SPKI hashes with backup pins.

---

## 20. Token Storage Security

- **Web:** Removed `nmd_pending_google_auth` persistence from `localStorage` (`AuthContext.jsx`), keeping session tokens in `sessionStorage`, and fixed `BannerManagerModal.jsx` to read `nmd_jwt_token`.
- **Mobile:** `nmd_auth_token` is currently stored in `SharedPreferences` (`mobile/lib/data/services/api_service.dart`). Android Auto-Backup and device-transfer backups of `sharedpref` are now explicitly blocked (`allowBackup="false"`, `backup_rules.xml`, `data_extraction_rules.xml`). Migrating `nmd_auth_token` to `flutter_secure_storage` (Android Keystore) is recommended in the next dependency update cycle when network access to `pub.dev` is available.

---

## 21. Firebase Security

- Verified no Firebase Admin service account private keys are embedded in `client/` or `mobile/`.
- `google-services.json` and `firebase-messaging-sw.js` contain standard client-side Firebase identifiers (`SECRET FOUND — DO NOT DISPLAY VALUE` for API key fields). Ensure API key restrictions (Android package + SHA-1; Web HTTP referrers) are enforced in Google Cloud Console.

---

## 22. Deep-Link Security

- Verified `AndroidManifest.xml` exposes no custom deep-link `intent-filter`s on `MainActivity`.
- Hardened `openUrl` in `MainActivity.kt` to allow only `https`, `http`, `tel`, `mailto`, `whatsapp`, and `geo` URI schemes.

---

## 23. WebView Security

- Hardened `MainActivity.kt` print WebView (`javaScriptEnabled = false`, `allowFileAccess = false`, `allowContentAccess = false`, `allowFileAccessFromFileURLs = false`, `allowUniversalAccessFromFileURLs = false`).

---

## 24. Release Build Security

- `mobile/android/app/build.gradle.kts` enables `isMinifyEnabled = true` and `isShrinkResources = true` for `release` builds.
- `app_config.dart` enforces `https://` / `wss://` live endpoints whenever `kReleaseMode` is `true`.

---

## 25. Play Store Security Checks

- `compileSdk = 35`, `minSdk = 24`, `targetSdk = 35` (meets Google Play API level 35 requirement).
- `android:allowBackup="false"` and cleartext traffic disabled in release.
- Account deletion endpoints (`/api/customers/me/account`, `/api/delivery-boys/me/account`) exist for Play Store Data Safety compliance.
- **Action Required Before Play Store Upload:** Configure `mobile/android/key.properties` with your production upload keystore and verify the generated `.aab` with `flutter build appbundle --release --obfuscate --split-debug-info=build/app/outputs/symbols` (Flutter SDK was not in the local sandbox PATH during this audit, so the `.aab` build was not executed here).

---

## 26. Dependency Security

- No dependencies were blindly upgraded.
- Note: `npm` and `pub.dev` registry checks could not be executed in the offline sandbox environment; run `npm audit` (in `server/` and `client/`) and `flutter pub outdated` in a networked CI/local shell before release.

---

## 27. Security Tests Performed

- **Automated Backend Security Suite (`server/tests/security.test.js`):** **9 / 9 tests passed**:
  - Security headers (`CSP`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `COOP`, `CORP`, no `unsafe-eval`)
  - NoSQL injection & prototype pollution sanitization (`$ne`, `$gt`, `$regex`, `__proto__`)
  - ReDoS `escapeRegex` validation
  - JWT rejection for missing, malformed, `alg: none`, and expired tokens
  - RBAC 403 enforcement (`requireAdmin`, `requireDeliveryStaff`, `requireCustomer`)
  - Rejection of `google_in_page_verified` and unverified JWTs in `verifyFirebaseIdToken`
  - SSRF, SVG, and path-traversal rejection in `ensureCloudinaryUrl`
  - Rate limiter HTTP 429 enforcement
  - SHA-256 OTP/token hashing
- **Server Syntax Validation (`node -c`):** All 21 modified backend files passed.
- **Web Client Build (`npm --prefix client run build`):** Passed (`✓ 1647 modules transformed`).

---

## 28. Remaining Risks

1. **Google Play Release Keystore (`MEDIUM`):** `mobile/android/key.properties` is not yet present locally; configure your production release keystore before building the Play Store `.aab`.
2. **Mobile Token Storage (`MEDIUM`):** `nmd_auth_token` still uses `SharedPreferences` (now protected from backups via `allowBackup="false"` and backup rules). Migrate to `flutter_secure_storage` (Android Keystore) when updating pub packages online.
3. **PDF Download Token Query Parameter (`LOW`):** `mobile/lib/data/services/api_service.dart` (`getReportPdfUrl`) still appends `?token=` for external browser PDF downloads; consider migrating to authenticated in-app download + `FileProvider` sharing.
4. **In-Memory Rate Limiter (`LOW`):** `rateLimitMiddleware.js` uses an in-memory `Map` (sufficient for single-instance Node deployment; use Redis store if scaling horizontally).
5. **Legacy Client-Side Google Picker (`INFO`):** `LoginPage.jsx` contains a legacy `handleSelectGoogleAccount` helper referencing `google_in_page_verified` which the hardened backend now rejects; users should sign in via the standard Google Identity Services button.

---

## 29. Production Security Checklist

- [x] Security headers & strict CSP configured (`server/` + `client/vercel.json`)
- [x] Strict CORS allowlist enforced (`server/index.js` + `websocket.js`)
- [x] Global + endpoint rate limiting enabled
- [x] NoSQL operator & prototype pollution sanitization active
- [x] Google/Firebase & Razorpay signature bypasses eliminated
- [x] IDOR, mass assignment, and client-side price tampering remediated
- [x] File upload MIME, magic-byte, SSRF, and path traversal protections active
- [x] XSS escaping & sandboxed report preview iframe implemented
- [x] Android `allowBackup="false"`, HTTPS-only `network_security_config.xml`, R8 minification, and WebView/Intent hardening applied
- [ ] Configure `mobile/android/key.properties` and run `flutter build appbundle --release --obfuscate --split-debug-info=...` on build machine
- [ ] Run `npm audit` and `flutter analyze` in networked environment

---

## Mandatory Integrity Statement

- Existing credentials were not changed.
- Existing authentication architecture was preserved.
- Existing database data was not modified.
- Existing business functionality was preserved.
- Security hardening was performed without intentionally breaking existing functionality.
