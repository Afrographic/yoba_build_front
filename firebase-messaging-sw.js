importScripts(
'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js'
);

importScripts(
'https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js'
);


firebase.initializeApp({

  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"

});


const messaging = firebase.messaging();


messaging.onBackgroundMessage(
(payload) => {

  console.log(
    "Background message",
    payload
  );


  self.registration.showNotification(
    payload.notification.title,
    {
      body:
      payload.notification.body,

      icon:
      "/icons/Icon-192.png"
    }
  );

});