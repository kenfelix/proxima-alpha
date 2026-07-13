importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBIv-ce5-zxLxMFaQCHKZO6X31SxaZwInw", 
  authDomain: "proxima-5ad14.firebaseapp.com",
  projectId: "proxima-5ad14",
  storageBucket: "proxima-5ad14.firebasestorage.app",
  messagingSenderId: "753066828759",
  appId: "1:753066828759:web:9f9bd28b582c11e91da192"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon512_rounded.png' 
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
