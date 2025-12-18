const firebaseSwContent = `
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAUkDu4Ti0hqCksbvdySf2SaNvQvktf2fQ",
  authDomain: "testquestionss.firebaseapp.com",
  projectId: "testquestionss",
  storageBucket: "testquestionss.firebasestorage.app",
  messagingSenderId: "253992693238",
  appId: "1:253992693238:web:f5b2f58b089dda2f2bebd7",
  measurementId: "G-RSBJ8RHPZQ"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // अगर कोई browser इस फाइल को मांगे, तो हम यह कोड भेज देंगे
    if (url.pathname === '/firebase-messaging-sw.js') {
      return new Response(firebaseSwContent, {
        headers: {
          'content-type': 'application/javascript;charset=UTF-8',
        },
      });
    }

    // बाकी सभी रिक्वेस्ट को ब्लॉगर (Origin) पर जाने दो
    return fetch(request);
  },
};
