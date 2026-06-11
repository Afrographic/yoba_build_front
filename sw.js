

const CACHE_NAME = "app-v1";

const STATIC_ASSETS = [
  "/",
  "/favicon.ico",
  "/manifest.json",
  "/assets/audios/ring.mp3",

  "/main-es5.js",
  "/main-es2017.js",
  "/polyfills-es5.js",
  "/polyfills-es2017.js",
  "/Raleway-Black.ttf",
  "/Raleway-Bold.ttf",
  "/Raleway-Regular.ttf",
  "/runtime-es5.js",
  "/runtime-es2017.js",
  "/scripts.js",
  "/styles.css",

  "/assets/scripts/chart.js",
  "/assets/scripts/cinetpay.js",
  "/assets/scripts/froala.css",
  "/assets/scripts/froala.js",
  "/assets/scripts/jsstore.js",
  "/assets/scripts/jsstore.worker.js",
  "/assets/scripts/socket.io.js",

  "/assets/images/emoji/1.svg",
  "/assets/images/emoji/2.svg",
  "/assets/images/emoji/3.svg",
  "/assets/images/emoji/4.svg",
  "/assets/images/emoji/5.svg",
  "/assets/images/emoji/6.svg",
  "/assets/images/emoji/7.svg",
  "/assets/images/emoji/8.svg",
  "/assets/images/emoji/9.svg",
  "/assets/images/emoji/10.svg",
  "/assets/images/emoji/11.svg",
  "/assets/images/emoji/12.svg",
  "/assets/images/emoji/13.svg",
  "/assets/images/emoji/14.svg",
  "/assets/images/emoji/15.svg",

  "/assets/images/about.svg",
  "/assets/images/add_pub.svg",
  "/assets/images/add_videos.svg",
  "/assets/images/add.svg",
  "/assets/images/admin.svg",
  "/assets/images/ads_user.svg",
  "/assets/images/agent.svg",
  "/assets/images/aplig.jpg",
  "/assets/images/back_all.svg",
  "/assets/images/back.svg",
  "/assets/images/bg_logo.svg",
  "/assets/images/bio.svg",
  "/assets/images/boost.svg",
  "/assets/images/camera.svg",
  "/assets/images/chat_user.svg",
  "/assets/images/chat.svg",
  "/assets/images/checked.svg",
  "/assets/images/chevron.svg",
  "/assets/images/circle.svg",
  "/assets/images/close_image_preview.svg",
  "/assets/images/close_pub.svg",
  "/assets/images/close.png",
  "/assets/images/compte.svg",
  "/assets/images/condition.svg",
  "/assets/images/copy.svg",
  "/assets/images/default_pic.svg",
  "/assets/images/delete_ac.svg",
  "/assets/images/delete_img.svg",
  "/assets/images/delete_new.svg",
  "/assets/images/delete.svg",
  "/assets/images/edit_new.svg",
  "/assets/images/edit_profile_icon.svg",
  "/assets/images/edit.svg",
  "/assets/images/empty.svg",
  "/assets/images/error_msg.svg",
  "/assets/images/face_structure.svg",
  "/assets/images/faq.svg",
  "/assets/images/favoris.svg",
  "/assets/images/file_1.svg",
  "/assets/images/file_chat.svg",
  "/assets/images/filleul.svg",
  "/assets/images/flip.svg",
  "/assets/images/gains.svg",
  "/assets/images/group_icon.png",
  "/assets/images/group.svg",
  "/assets/images/hidden.svg",
  "/assets/images/home.svg",
  "/assets/images/id_card.svg",
  "/assets/images/image.svg",
  "/assets/images/img_2.svg",
  "/assets/images/img_chat.svg",
  "/assets/images/import.svg",
  "/assets/images/interaction.svg",
  "/assets/images/iosInstall.png",
  "/assets/images/itineraire.svg",
  "/assets/images/liked.svg",
  "/assets/images/location_home.svg",
  "/assets/images/location_only.svg",
  "/assets/images/location.svg",
  "/assets/images/logo_v2.svg",
  "/assets/images/logout.svg",
  "/assets/images/mail.svg",
  "/assets/images/menu_icon.svg",
  "/assets/images/menu.svg",
  "/assets/images/message.svg",
  "/assets/images/more.svg",
  "/assets/images/msg_delete.svg",
  "/assets/images/msg_edit.svg",
  "/assets/images/next.svg",
  "/assets/images/notif.svg",
  "/assets/images/num_id.svg",
  "/assets/images/out.svg",
  "/assets/images/password.svg",
  "/assets/images/pending.svg",
  "/assets/images/phone.svg",
  "/assets/images/photo_id.svg",
  "/assets/images/pub.svg",
  "/assets/images/public_profile.svg",
  "/assets/images/pubs.svg",
  "/assets/images/read.svg",
  "/assets/images/recharge.svg",
  "/assets/images/record.svg",
  "/assets/images/reject_1.svg",
  "/assets/images/reject_icon.svg",
  "/assets/images/reject_retrait.svg",
  "/assets/images/reject.svg",
  "/assets/images/reply.svg",
  "/assets/images/retrait.svg",
  "/assets/images/search_dd.svg",
  "/assets/images/search.svg",
  "/assets/images/send.svg",
  "/assets/images/settings.svg",
  "/assets/images/share_btn.svg",
  "/assets/images/share_offre.svg",
  "/assets/images/share.svg",
  "/assets/images/show_more.svg",
  "/assets/images/signal_user.svg",
  "/assets/images/signal.svg",
  "/assets/images/success.svg",
  "/assets/images/swap.svg",
  "/assets/images/tempLogo.svg",
  "/assets/images/timer.svg",
  "/assets/images/unliked.svg",
  "/assets/images/unread.svg",
  "/assets/images/user.svg",
  "/assets/images/valid.svg",
  "/assets/images/verify.svg",
  "/assets/images/visible.svg",
  "/assets/images/vue.svg",
  "/assets/images/wallet.svg",
  "/assets/images/welcome.svg",

  "/icons/icon-192.png",
  "/icons/icon-512.png",
];




self.addEventListener("push", (event) => {
  const data = event.data.json();

  self.registration.showNotification(data.title, {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(clients.openWindow("/#/contacts?contacts=true"));
});




// Install and cache files
self.addEventListener('install', event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
  );
});


// Activate immediately
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      clients.claim(),
    ])
  );
});

// Serve cached files first
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;

        return fetch(event.request)
          .then(response => {
            const responseClone = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, responseClone));

            return response;
          });
      })
  );
});