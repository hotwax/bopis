importScripts('http://localhost:8101/firebase-messaging-common.js');

self.addEventListener('activate', () => {
  const clickActionURL = "http://localhost:8100/"
  const iconUrl = "/img/icons/msapplication-icon-144x144.png"
  self.setClickActionAndIcon(clickActionURL, iconUrl);
});