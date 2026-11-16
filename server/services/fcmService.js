const fs = require('fs');
const path = require('path');
const DeviceToken = require('../models/DeviceToken');

let admin = null;
let isInitialized = false;

// Attempt to initialize Firebase Admin SDK
try {
  const adminPkg = require('firebase-admin');
  
  // Check if a service account file exists or env var is provided
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    : path.join(__dirname, '../config/firebase-service-account.json');

  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    adminPkg.initializeApp({
      credential: adminPkg.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id || 'milkdairy-2800e',
    });
    admin = adminPkg;
    isInitialized = true;
    console.log('✅ Firebase Admin SDK initialized with service account:', serviceAccount.project_id);
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      adminPkg.initializeApp({
        credential: adminPkg.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || 'milkdairy-2800e',
      });
      admin = adminPkg;
      isInitialized = true;
      console.log('✅ Firebase Admin SDK initialized from JSON environment variable');
    } catch (parseErr) {
      console.warn('⚠️ Could not parse FIREBASE_SERVICE_ACCOUNT_JSON:', parseErr.message);
    }
  } else {
    // Initialize with project ID (can send via Google Cloud Application Default Credentials if present)
    adminPkg.initializeApp({
      projectId: 'milkdairy-2800e',
    });
    admin = adminPkg;
    isInitialized = true;
    console.log('ℹ️ Firebase Admin SDK initialized for project: milkdairy-2800e');
  }
} catch (err) {
  console.warn('ℹ️ firebase-admin optional initialization notice:', err.message);
}

/**
 * Register or update an FCM device token
 */
async function registerDeviceToken({ token, userId = '', role = 'customer', platform = 'android' }) {
  if (!token || typeof token !== 'string') return null;
  const cleanToken = token.trim();
  if (!cleanToken) return null;

  try {
    const record = await DeviceToken.findOneAndUpdate(
      { token: cleanToken },
      {
        token: cleanToken,
        userId: String(userId || '').trim(),
        role: String(role || 'customer').trim(),
        platform: String(platform || 'android').trim().toLowerCase(),
        lastActive: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return record;
  } catch (err) {
    console.error('Failed to register device FCM token:', err.message);
    return null;
  }
}

/**
 * Unregister device token (e.g., upon logout)
 */
async function unregisterDeviceToken(token) {
  if (!token) return;
  try {
    await DeviceToken.deleteOne({ token: token.trim() });
  } catch (err) {
    console.error('Failed to unregister device FCM token:', err.message);
  }
}

/**
 * Send Push Notification to relevant devices
 */
async function sendPushNotification({ recipientRole = 'all', recipientId = '', title, body, data = {} }) {
  if (!title || !body) return { sentCount: 0, failedCount: 0 };

  try {
    const query = {};
    if (recipientRole && recipientRole !== 'all') {
      query.role = recipientRole;
    }
    if (recipientId && String(recipientId).trim()) {
      query.userId = String(recipientId).trim();
    }

    const deviceRecords = await DeviceToken.find(query).lean();
    if (!deviceRecords || deviceRecords.length === 0) {
      return { sentCount: 0, failedCount: 0, reason: 'No registered devices' };
    }

    const tokens = [...new Set(deviceRecords.map((d) => d.token).filter(Boolean))];
    if (tokens.length === 0) return { sentCount: 0, failedCount: 0 };

    if (!admin || !isInitialized) {
      console.log(`ℹ️ [FCM Queue] Would send push to ${tokens.length} devices: "${title}" (Waiting for Firebase Admin credentials)`);
      return { sentCount: 0, pendingCount: tokens.length };
    }

    // Prepare stringified payload data for FCM
    const sanitizedData = {};
    if (data && typeof data === 'object') {
      for (const [k, v] of Object.entries(data)) {
        sanitizedData[String(k)] = typeof v === 'object' ? JSON.stringify(v) : String(v);
      }
    }

    const message = {
      notification: {
        title: String(title),
        body: String(body),
      },
      data: sanitizedData,
      tokens,
      android: {
        priority: 'high',
        notification: {
          channelId: 'natural_milk_dairy_channel',
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
      webpush: {
        headers: {
          Urgency: 'high',
        },
        notification: {
          title: String(title),
          body: String(body),
          icon: 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1794545619/natural-milk-dairy/assets/logo.jpg',
          badge: 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1794545619/natural-milk-dairy/assets/logo.jpg',
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    // Clean up stale / unregistered tokens
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errCode = resp.error?.code;
          if (
            errCode === 'messaging/invalid-registration-token' ||
            errCode === 'messaging/registration-token-not-registered'
          ) {
            failedTokens.push(tokens[idx]);
          }
        }
      });
      if (failedTokens.length > 0) {
        await DeviceToken.deleteMany({ token: { $in: failedTokens } });
      }
    }

    return {
      sentCount: response.successCount,
      failedCount: response.failureCount,
    };
  } catch (err) {
    console.error('Error dispatching FCM push notifications:', err.message);
    return { sentCount: 0, error: err.message };
  }
}

module.exports = {
  registerDeviceToken,
  unregisterDeviceToken,
  sendPushNotification,
};
