// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here. Other Firebase libraries
// are not available in the service worker.
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// wrapping the logic inside function and calling it as an IIFE
// to provide return statement support
(function () {
  const firebaseConfig = { apiKey: "", authDomain: "", databaseURL: "", projectId: "", storageBucket: "", messagingSenderId: "", appId: "" }

  if (Object.values(firebaseConfig).some(value => !value)) {
    return
  }
  // Initialize the Firebase app in the service worker by passing in
  // your app's Firebase config object.
  // https://firebase.google.com/docs/web/setup#config-object
  firebase.initializeApp(firebaseConfig);

  // Retrieve an instance of Firebase Messaging so that it can handle background
  // messages.
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage(payload => {
    // Customize notification here
    const notificationTitle = payload.data.title;
    const notificationOptions = {
      body: payload.data.body,
      icon: "/img/icons/msapplication-icon-144x144.png",
      data: {
        click_action: "/notifications"
      }
    };
    self.registration.showNotification(notificationTitle, notificationOptions);

    // broadcast background message on FB_BG_MESSAGES so that app can receive that message 
    const broadcast = new BroadcastChannel('FB_BG_MESSAGES');
    broadcast.postMessage(payload);
  });

  self.addEventListener('notificationclick', event => {
    event.notification.close();
    const deepLink = event.notification.data.click_action;
    event.waitUntil(
      clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(windowClients => {
        // Check if the app window is already open
        for (let client of windowClients) {
          const clientPath = (new URL(client.url)).pathname;
          if (clientPath === deepLink && 'focus' in client) {
            return client.focus();
          }
        }

        // If the app window is not open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(deepLink);
        }
      })
    );
  });
})()