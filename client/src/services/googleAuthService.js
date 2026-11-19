/**
 * Google Authentication Service for Natural Milk Dairy (Web & Mobile Web)
 * Project: milkdairy-2800e
 */

const GOOGLE_CLIENT_ID = '402055824353-rbjkemrlk6snih6kg8vivcejl6aauooo.apps.googleusercontent.com';

let gsiScriptLoaded = false;
let gsiScriptPromise = null;
let activeCredentialCallback = null;
let isGsiInitialized = false;

/**
 * Access top-level window if accessible and same-origin (e.g. escaping simulator extension iframe)
 */
export function getActiveWindow() {
  try {
    if (
      typeof window !== 'undefined' &&
      window.top &&
      window.top !== window &&
      window.top.location?.origin === window.location.origin
    ) {
      return window.top;
    }
  } catch (_) {}
  return window;
}

/**
 * Access Google Identity Services instance from active or top-level window
 */
export function getActiveGoogleContext() {
  const topWin = getActiveWindow();
  if (topWin?.google?.accounts) {
    return topWin.google;
  }
  return window.google || null;
}

/**
 * Dynamically load Google Identity Services script
 */
export function loadGsiScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window unavailable'));
  if (window.google?.accounts?.id || window.google?.accounts?.oauth2) return Promise.resolve(window.google);
  if (gsiScriptPromise) return gsiScriptPromise;

  gsiScriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('google-gsi-client');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google));
      existing.addEventListener('error', (e) => reject(e));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-client';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      gsiScriptLoaded = true;
      resolve(window.google);
    };
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });

  return gsiScriptPromise;
}

/**
 * Decode payload from Google JWT ID token
 */
export function decodeJwtPayload(jwtToken) {
  try {
    const parts = jwtToken.split('.');
    if (parts.length !== 3) return {};
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (_) {
    return {};
  }
}

/**
 * Initialize Google Identity Services credential listener
 */
export async function initGoogleIdentityServices({ onCredential, onError } = {}) {
  await loadGsiScript();

  const googleCtx = getActiveGoogleContext() || window.google;
  if (!googleCtx?.accounts?.id) return;

  if (onCredential) {
    activeCredentialCallback = onCredential;
  }

  // Prevent multiple initialize calls (fixes [GSI_LOGGER] multiple initialize warning)
  if (isGsiInitialized) return;

  try {
    googleCtx.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        if (response?.credential) {
          const payload = decodeJwtPayload(response.credential);
          const result = {
            idToken: response.credential,
            token: response.credential,
            email: payload.email || '',
            name: payload.name || '',
            picture: payload.picture || '',
          };
          if (activeCredentialCallback) {
            activeCredentialCallback(result);
          }
        } else if (onError) {
          onError(new Error('No credential returned from Google.'));
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
      itp_support: true,
    });
    isGsiInitialized = true;
  } catch (err) {
    if (onError) onError(err);
  }
}

/**
 * Render Google's official Sign In button inside a DOM element
 */
export async function renderGoogleButton(container, options = {}) {
  if (!container) return;
  await loadGsiScript();
  if (!window.google?.accounts?.id) return;

  try {
    const parentWidth = container.offsetWidth || container.parentElement?.offsetWidth || 320;
    const defaultWidth = Math.min(Math.max(parentWidth, 240), 380);
    window.google.accounts.id.renderButton(container, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: defaultWidth,
      ...options,
    });
  } catch (err) {
    console.warn('Failed to render Google button:', err);
  }
}

/**
 * Trigger Google One Tap prompt
 */
export async function promptOneTap() {
  await loadGsiScript();
  if (!window.google?.accounts?.id) return;
  try {
    window.google.accounts.id.prompt();
  } catch (_) {}
}

/**
 * Trigger Google Sign-In with Google Identity Services (OAuth2 Token Client + ID Token fallback)
 * @param {string} portal - 'customer' or 'partner'
 * @returns {Promise<{idToken: string, email: string, name: string, picture: string}>}
 */
export async function triggerGoogleSignIn(portal = 'customer') {
  await loadGsiScript();

  const googleCtx = getActiveGoogleContext() || window.google;
  const oauth2 = googleCtx?.accounts?.oauth2 || window.google?.accounts?.oauth2;
  const idClient = googleCtx?.accounts?.id || window.google?.accounts?.id;

  if (!oauth2 && !idClient) {
    throw new Error('Google Identity Services failed to initialize. Please check your internet connection.');
  }

  return new Promise((resolve, reject) => {
    let settled = false;

    // 1. Try OAuth2 Token Client for 1-click account picker in active/top window
    if (oauth2) {
      try {
        const tokenClient = oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'email profile openid',
          callback: async (tokenResponse) => {
            if (settled) return;
            settled = true;
            if (tokenResponse?.access_token) {
              const accessToken = tokenResponse.access_token;
              let email = '';
              let name = '';
              let picture = '';
              try {
                const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${accessToken}` },
                });
                if (userRes.ok) {
                  const userInfo = await userRes.json();
                  email = userInfo.email || '';
                  name = userInfo.name || '';
                  picture = userInfo.picture || '';
                }
              } catch (_) {}
              resolve({
                idToken: accessToken,
                token: accessToken,
                email,
                name,
                picture,
              });
            } else if (tokenResponse?.error) {
              const err = tokenResponse.error_description || tokenResponse.error;
              reject(new Error(err || 'Authentication cancelled.'));
            } else {
              reject(new Error('No token returned from Google.'));
            }
          },
          error_callback: (err) => {
            if (settled) return;
            // If popup was blocked (e.g. inside simulator iframe), try One Tap prompt immediately
            if (idClient) {
              try {
                activeCredentialCallback = (cred) => {
                  if (settled) return;
                  settled = true;
                  resolve(cred);
                };
                idClient.prompt((notification) => {
                  if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                    if (!settled) {
                      settled = true;
                      reject(
                        new Error(
                          'Google Sign-In popup was prevented by the Mobile Simulator extension sandbox. Please test directly in Chrome (press Ctrl+Shift+M for mobile view).'
                        )
                      );
                    }
                  }
                });
                return;
              } catch (_) {}
            }
            settled = true;
            reject(
              new Error(
                err?.message ||
                  'Google Sign-In popup was prevented by the Mobile Simulator extension sandbox. Please test directly in Chrome (press Ctrl+Shift+M for mobile view).'
              )
            );
          },
        });

        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (err) {
        console.warn('OAuth2 token client error, falling back to One Tap:', err);
      }
    }

    // 2. Fallback to Google ID client prompt
    if (idClient) {
      try {
        activeCredentialCallback = (cred) => {
          if (settled) return;
          settled = true;
          resolve(cred);
        };
        idClient.prompt((notification) => {
          if (notification.isNotDisplayed()) {
            if (!settled) {
              settled = true;
              reject(
                new Error(
                  'Google Sign-In prompt was prevented by the Mobile Simulator extension sandbox. Please test directly in Chrome (press Ctrl+Shift+M for mobile view).'
                )
              );
            }
          }
        });
      } catch (e) {
        if (!settled) {
          settled = true;
          reject(e);
        }
      }
    }
  });
}

export { GOOGLE_CLIENT_ID };
