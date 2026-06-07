const CACHE_NAME = 'gr-korat-v1';
const ASSETS_TO_CACHE = [
  './index.html',
  './manifest.json'
];

// 1. ติดตั้ง Service Worker และทำการซ่อนไฟล์พื้นฐาน (Cache) ไว้เล่นแบบกึ่งออฟไลน์ได้
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. ล้าง Cache เก่าเมื่อมีการอัปเดตเวอร์ชันแอป
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. ดักจับ Request เพื่อดึงข้อมูลจาก Cache ช่วยให้แอปโหลดเร็วขึ้น
self.addEventListener('fetch', (event) => {
  // ปล่อยให้ Requests ที่ยิงไป Google Script ทำงานปกติ ไม่ต้องติด Cache
  if (event.request.url.includes('script.google.com')) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// 4. ระบบรับสัญญานเพื่อสั่งเด้ง Notification (รองรับทั้งคำสั่งภายในแอปและ Push Server)
self.addEventListener('push', (event) => {
  let title = '📢 ประกาศเรียกคิวใหม่!';
  let options = {
    body: 'กรุณาตรวจสอบลำดับคิวของคุณ',
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [200, 100, 200, 100, 200]
  };

  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      options.body = data.body || options.body;
    } catch (e) {
      options.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 5. เมื่อผู้ใช้ใช้นิ้วคลิกที่แถบการแจ้งเตือนบนมือถือ ให้เปิดหน้าเว็บคิวขึ้นมาทันที
self.addEventListener('notificationclick', (event) => {
  event.notification.close(); // ปิดแถบแจ้งเตือนหลังจากคลิกแล้ว
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // ถ้ามีหน้าเว็บเดิมเปิดค้างไว้อยู่แล้ว ให้สลับไปที่หน้านั้นเลย
      for (const client of clientList) {
        if (client.url.includes('index.html') && 'focus' in client) {
          return client.focus();
        }
      }
      // ถ้ายังไม่มีหน้าเว็บเปิดอยู่เลย ให้เปิดหน้าต่างใหม่ขึ้นมา
      if (clients.openWindow) {
        return clients.openWindow('./index.html');
      }
    })
  );
});