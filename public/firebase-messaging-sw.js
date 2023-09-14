importScripts('http://localhost:8101/firebase-messaging-common.js');

self.addEventListener('activate', () => {
  console.log('activate listener')
  const clickActionURL = "http://localhost:8100/test"
  const iconUrl = "./icons/msapplication-icon-144x144.png"
  self.setClickActionAndIcon(clickActionURL, iconUrl);
});