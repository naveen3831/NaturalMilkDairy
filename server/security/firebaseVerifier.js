const https = require('https');
const jwt = require('jsonwebtoken');

const FIREBASE_PROJECT_ID = 'milkdairy-2800e';
const GOOGLE_CLIENT_ID = '402055824353-rbjkemrlk6snih6kg8vivcejl6aauooo.apps.googleusercontent.com';

let cachedCerts = null;
let certsExpiry = 0;

/**
 * Fetch Google's public certificates for Firebase Auth
 */
async function getGooglePublicCerts() {
  if (cachedCerts && Date.now() < certsExpiry) {
    return cachedCerts;
  }

  return new Promise((resolve) => {
    https
      .get('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com', (res) => {
        let rawData = '';
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          try {
            cachedCerts = JSON.parse(rawData);
            // Default cache 6 hours
            certsExpiry = Date.now() + 6 * 60 * 60 * 1000;
            resolve(cachedCerts);
          } catch (_) {
            resolve(null);
          }
        });
      })
      .on('error', () => resolve(null));
  });
}

/**
 * Fallback verify using Google OAuth tokeninfo endpoint
 */
function fetchHttpsJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    https
      .get(url, options, (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            resolve(data);
          } catch (e) {
            reject(new Error('Failed to parse Google response'));
          }
        });
      })
      .on('error', (err) => reject(err));
  });
}

async function verifyViaTokenInfo(token) {
  // 1. Try id_token parameter
  let data = await fetchHttpsJson(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
  
  // 2. If error, try access_token parameter
  if (data?.error || data?.error_description) {
    const accessData = await fetchHttpsJson(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`);
    if (!accessData?.error) {
      data = accessData;
    }
  }

  // 3. If still error or missing email, try Google Userinfo API
  if ((data?.error || !data?.email) && token) {
    try {
      const userData = await fetchHttpsJson('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (userData?.email) {
        data = {
          ...data,
          ...userData,
          sub: userData.sub,
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
          email_verified: userData.email_verified,
        };
      }
    } catch (_) {}
  }

  if (data?.error || data?.error_description) {
    throw new Error(data.error_description || data.error || 'Invalid Google token');
  }

  const cleanEmail = (data.email || '').trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Google token does not contain a verified email address.');
  }

  return {
    uid: data.sub || data.user_id,
    email: cleanEmail,
    name: data.name || data.given_name || 'Google User',
    picture: data.picture || '',
    emailVerified: data.email_verified === 'true' || data.email_verified === true,
  };
}

/**
 * Authoritatively verify a Firebase or Google ID Token
 * Returns: { uid, email, name, picture }
 */
async function verifyFirebaseIdToken(idToken) {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('A valid Firebase ID token is required.');
  }

  const cleanToken = idToken.trim().replace(/^Bearer\s+/i, '');
  if (!cleanToken) {
    throw new Error('Firebase ID token is empty.');
  }

  // 1. Try cryptographic verification via Google's public certs
  try {
    const decodedHeader = jwt.decode(cleanToken, { complete: true });
    if (decodedHeader && decodedHeader.header && decodedHeader.header.kid) {
      const certs = await getGooglePublicCerts();
      if (certs && certs[decodedHeader.header.kid]) {
        const cert = certs[decodedHeader.header.kid];
        const payload = jwt.verify(cleanToken, cert, {
          algorithms: ['RS256'],
          audience: FIREBASE_PROJECT_ID,
          issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
        });

        const cleanEmail = (payload.email || '').trim().toLowerCase();
        if (!cleanEmail) {
          throw new Error('Google token does not contain a verified email address.');
        }

        return {
          uid: payload.user_id || payload.sub,
          email: cleanEmail,
          name: payload.name || 'Google User',
          picture: payload.picture || '',
          emailVerified: payload.email_verified === true,
        };
      }
    }
  } catch (certErr) {
    // If cert verify failed or kid mismatch, fall back to Google tokeninfo
  }

  // 2. Fallback to Google OAuth tokeninfo endpoint
  return await verifyViaTokenInfo(cleanToken);
}

module.exports = {
  verifyFirebaseIdToken,
  FIREBASE_PROJECT_ID,
  GOOGLE_CLIENT_ID,
};
