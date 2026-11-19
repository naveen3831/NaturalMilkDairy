try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

  const firebaseConfig = {
    apiKey: "AIzaSyBmkctkZJJcfZ8vTyRipmhsxOPeleG-sew",
    appId: "1:402055824353:web:28610a9bfe9a12b5ae88a0",
    projectId: "milkdairy-2800e",
    messagingSenderId: "402055824353",
    storageBucket: "milkdairy-2800e.firebasestorage.app",
  };

  firebase.initializeApp(firebaseConfig);

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.notification?.title || payload.data?.title || 'Natural Milk Dairy';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.message || 'New update received',
      icon: 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1794545619/natural-milk-dairy/assets/logo.jpg',
      badge: 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1794545619/natural-milk-dairy/assets/logo.jpg',
      data: payload.data || {},
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (swErr) {
  // Service worker fallback
  console.warn('Firebase ServiceWorker background init notice:', swErr?.message || swErr);
}
