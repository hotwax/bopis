importScripts('https://www.gstatic.com/firebasejs/10.3.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.3.1/firebase-messaging-compat.js');

// This worker controls no pages (its scope is /firebase-cloud-messaging-push-scope), so taking over
// immediately is safe.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

// Every push shows a notification from inside its own push event, whether or not the app is open.
//
// WebKit requires that: a push event that ends without calling showNotification counts as a
// silent push, and after a few of those Safari revokes the push subscription, leaving the device
// registered but receiving nothing. Firebase's own push handler does not satisfy it. When a window
// is visible it only forwards the message to the page and returns; the page then shows the banner
// itself, but by then the push event has already finished. So the banner is raised here, for
// every push, and Firebase's handlers are left to do the rest (forwarding to the page, the
// background broadcast).
//
// The tag matches the one the page's foreground banner uses (orderId when the payload has it,
// otherwise the FCM message id, which the SDK hands the page as messageId), so when the page also
// shows one it replaces this banner instead of stacking a second.
self.addEventListener('push', event => {
  let payload = null;
  try {
    payload = event.data ? event.data.json() : null;
  } catch (error) {
    payload = null;
  }

  const data = (payload && payload.data) || {};
  const notification = (payload && payload.notification) || {};
  const title = data.title || notification.title || 'New notification received.';
  const tag = data.orderId
    ? `bopis-order-${data.orderId}`
    : ((payload && payload.fcmMessageId) || `bopis-${Date.now()}`);

  event.waitUntil(
    clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(windowClients => {
      // A payload with a `notification` block is displayed by Firebase itself when no window is
      // visible, so showing it here as well would put two banners up for one push.
      const isAppVisible = windowClients.some(client => client.visibilityState === 'visible');
      if (payload && payload.notification && !isAppVisible) return;

      return self.registration.showNotification(title, {
        body: data.body || notification.body || '',
        icon: "/img/icons/msapplication-icon-144x144.png",
        tag,
        data: {
          click_action: "/notifications"
        }
      });
    })
  );
});

// Registered notificationclick outside the Firebase setup, so a click still routes into the app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const deepLink = (event.notification.data && event.notification.data.click_action) || '/notifications';
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

// wrapping the logic inside function and calling it as an IIFE to provide return statement support
(function () {
  const firebaseConfig = { apiKey: "", authDomain: "", databaseURL: "", projectId: "", storageBucket: "", messagingSenderId: "", appId: "" }

  if (Object.values(firebaseConfig).some(value => !value)) {
    return
  }

  // A throw here must never fail the worker's installation: without an installed worker the
  // device has no push subscription at all, which is far harder to recover from than a worker
  // that is installed but could not attach the background handler.
  try {
    // Initialize the Firebase app in the service worker by passing in your app's Firebase config object.
    // https://firebase.google.com/docs/web/setup#config-object
    firebase.initializeApp(firebaseConfig);

    // Retrieve an instance of Firebase Messaging so that it can handle background messages.
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage(payload => {
      const broadcast = new BroadcastChannel('FB_BG_MESSAGES');
      broadcast.postMessage(payload);
    });
  } catch (error) {
    console.error('Firebase messaging could not be initialised in the service worker', error);
  }
})()