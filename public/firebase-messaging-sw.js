importScripts('https://launchpad.hotwax.io/firebase-messaging-common.js');

self.addEventListener('activate', () => {
  const clickActionURL = window.location.protocol + "//" + window.location.host
  const iconUrl = "/img/icons/msapplication-icon-144x144.png"
  self.setClickActionAndIcon(clickActionURL, iconUrl);
});