/**
 * Google Authentication Service for Natural Milk Dairy (Web & Mobile Web)
 * Project: milkdairy-2800e
 */

const GOOGLE_CLIENT_ID = '402055824353-rbjkemrlk6snih6kg8vivcejl6aauooo.apps.googleusercontent.com';

let gsiScriptLoaded = false;
let gsiScriptPromise = null;

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
 * Initiates full-page OAuth redirect (works 100% in iframes, mobile simulators, and popup-blocked browsers)
 */
export function redirectToGoogleOAuth(portal = 'customer') {
  if (typeof window === 'undefined') return { pendingRedirect: true };

  try {
    sessionStorage.setItem('nmd_google_portal', portal);
    sessionStorage.setItem('nmd_google_oauth_in_progress', 'true');
  } catch (_) {}

  const redirectUri = window.location.origin + window.location.pathname;
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'token',
    scope: 'email profile openid',
    prompt: 'select_account',
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  // If running inside an iframe (like mobile responsive simulators), try navigating the top window
  if (window.top && window.top !== window.self) {
    try {
      window.top.location.href = authUrl;
      return { pendingRedirect: true };
    } catch (_) {}
  }

  window.location.href = authUrl;
  return { pendingRedirect: true };
}

/**
 * Checks for returned OAuth access token in URL hash after redirect
 */
export async function checkAndHandleOAuthRedirect() {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  if (!hash || !hash.includes('access_token=')) return null;

  try {
    const cleanHash = hash.replace(/^#/, '');
    const params = new URLSearchParams(cleanHash);
    const accessToken = params.get('access_token');
    if (!accessToken) return null;

    // Clean hash from URL so it doesn't linger
    window.history.replaceState(null, '', window.location.pathname + window.location.search);

    const portal = sessionStorage.getItem('nmd_google_portal') || 'customer';
    try {
      sessionStorage.removeItem('nmd_google_portal');
      sessionStorage.removeItem('nmd_google_oauth_in_progress');
    } catch (_) {}

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
    } catch (e) {
      console.warn('Could not fetch userinfo via access token:', e);
    }

    return {
      idToken: accessToken,
      token: accessToken,
      email,
      name,
      picture,
      portal,
    };
  } catch (err) {
    console.error('Error handling OAuth redirect hash:', err);
    return null;
  }
}

/**
 * Trigger Google Sign-In with automatic fallback from popup to redirect
 * @param {string} portal - 'customer' or 'partner'
 * @returns {Promise<{idToken: string, email: string, name: string, picture: string, pendingRedirect?: boolean}>}
 */
export async function triggerGoogleSignIn(portal = 'customer') {
  // If running inside an iframe (e.g. mobile responsive extension/simulator), popups are blocked by sandbox.
  // Immediately use OAuth redirect for seamless authentication.
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
  if (isInIframe) {
    return redirectToGoogleOAuth(portal);
  }

  await loadGsiScript();

  if (!window.google?.accounts?.oauth2 && !window.google?.accounts?.id) {
    // If GIS fails to load, fallback directly to OAuth redirect URL
    return redirectToGoogleOAuth(portal);
  }

  return new Promise((resolve, reject) => {
    let settled = false;

    // 1. Try OAuth2 Token Client for 1-click popup
    if (window.google.accounts?.oauth2) {
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
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
              if (err.includes('origin_mismatch') || err.includes('redirect_uri_mismatch')) {
                reject(
                  new Error(
                    `Google OAuth origin mismatch: please ensure ${window.location.origin} is added to Authorized JavaScript origins in Google Cloud Console.`
                  )
                );
              } else {
                reject(new Error(err));
              }
            } else {
              reject(new Error('No token returned from Google.'));
            }
          },
          error_callback: (err) => {
            if (settled) return;
            settled = true;
            const errMsg = String(err?.message || err?.type || '');
            // If popup was blocked or failed to open, automatically fall back to redirect
            if (
              err?.type === 'popup_failed_to_open' ||
              err?.type === 'popup_closed' ||
              errMsg.toLowerCase().includes('popup') ||
              errMsg.toLowerCase().includes('failed to open')
            ) {
              console.log('Google Sign-In popup was blocked or closed. Switching to redirect flow...');
              resolve(redirectToGoogleOAuth(portal));
              return;
            }
            reject(new Error(err?.message || 'Google Sign-In popup was closed or blocked.'));
          },
        });

        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (err) {
        console.warn('OAuth2 token client error, attempting redirect fallback:', err);
        settled = true;
        resolve(redirectToGoogleOAuth(portal));
        return;
      }
    }

    // 2. Fallback to Google ID client if oauth2 is not available
    if (window.google.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (settled) return;
            settled = true;
            if (response?.credential) {
              const credential = response.credential;
              let email = '';
              let name = '';
              let picture = '';
              try {
                const payloadBase64 = credential.split('.')[1];
                const decodedJson = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
                email = decodedJson.email || '';
                name = decodedJson.name || '';
                picture = decodedJson.picture || '';
              } catch (_) {}
              resolve({
                idToken: credential,
                token: credential,
                email,
                name,
                picture,
              });
            } else {
              reject(new Error('No credential returned from Google.'));
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed()) {
            if (!settled) {
              settled = true;
              resolve(redirectToGoogleOAuth(portal));
            }
          }
        });
      } catch (e) {
        if (!settled) {
          settled = true;
          resolve(redirectToGoogleOAuth(portal));
        }
      }
    }
  });
}

export { GOOGLE_CLIENT_ID };
