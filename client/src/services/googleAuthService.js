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
function loadGsiScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window unavailable'));
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
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
 * Trigger Google Sign-In popup flow
 * @returns {Promise<{idToken: string, email: string, name: string, picture: string}>}
 */
export async function triggerGoogleSignIn() {
  await loadGsiScript();

  if (!window.google?.accounts?.oauth2 && !window.google?.accounts?.id) {
    throw new Error('Google Identity Services failed to initialize. Please check your internet connection.');
  }

  return new Promise((resolve, reject) => {
    let settled = false;

    // Prefer OAuth2 Token Client for interactive button clicks
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
            reject(new Error(err?.message || 'Google Sign-In popup was closed or blocked.'));
          },
        });

        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (err) {
        console.warn('OAuth2 token client error, attempting fallback:', err);
      }
    }

    // Fallback to Google ID client
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
              reject(new Error('Google Sign-In prompt could not be displayed. Please check popup blockers.'));
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
