// /public/sw-notifications.js
// Service Worker for handling persistent notifications

self.addEventListener('install', function (event) {
  console.log('Notification service worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  console.log('Notification service worker activating...');
  event.waitUntil(self.clients.claim());
});

// Handle notification clicks
self.addEventListener('notificationclick', function (event) {
  console.log('Notification click received:', event.notification.data);

  event.notification.close();

  const data = event.notification.data || {};
  const { entityType, entityId, workspaceId, notificationId } = data;

  // Handle different notification actions
  if (event.action === 'reply') {
    // Open reply interface
    const replyUrl = `/${entityType}s/${entityId}?action=reply&notificationId=${notificationId}`;
    event.waitUntil(clients.openWindow(replyUrl));
  } else if (event.action === 'mark_read') {
    // Mark as read via API call
    event.waitUntil(
      fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isRead: true }),
      })
        .then(() => {
          // Notify all clients about the read status change
          return self.clients.matchAll().then((clientList) => {
            clientList.forEach((client) => {
              client.postMessage({
                type: 'NOTIFICATION_READ',
                data: { notificationId, isRead: true },
              });
            });
          });
        })
        .catch((err) => {
          console.error('Failed to mark notification as read:', err);
        }),
    );
  } else {
    // Default action - focus existing window or open new one
    event.waitUntil(
      clients
        .matchAll({
          type: 'window',
          includeUncontrolled: true,
        })
        .then(function (clientList) {
          // Try to find an existing window to focus
          for (let i = 0; i < clientList.length; i++) {
            const client = clientList[i];
            if (client.url.includes('/') && 'focus' in client) {
              // Send message to client about the notification click
              client.postMessage({
                type: 'NOTIFICATION_CLICK',
                data: data,
              });
              return client.focus();
            }
          }

          // No existing window found, open a new one
          if (clients.openWindow) {
            const targetUrl = entityType && entityId ? `/${entityType}s/${entityId}` : '/';
            return clients.openWindow(targetUrl);
          }
        }),
    );
  }
});

// Handle notification close
self.addEventListener('notificationclose', function (event) {
  console.log('Notification closed:', event.notification.data);

  // Optional: Track notification dismissal analytics
  const data = event.notification.data || {};
  if (data.notificationId) {
    // Could send analytics about notification dismissal
    console.log('Notification dismissed:', data.notificationId);
  }
});

// Handle background sync (if you want to sync missed notifications)
self.addEventListener('sync', function (event) {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

// Handle push messages (for server-sent notifications when app is closed)
self.addEventListener('push', function (event) {
  console.log('Push message received:', event);

  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || data.message || 'New notification',
      icon: '/icons/chat-notification.png',
      badge: '/icons/chat-badge.png',
      tag: data.tag || 'general',
      data: data.data || {},
      actions: [
        { action: 'reply', title: 'Reply', icon: '/icons/reply.png' },
        { action: 'mark_read', title: 'Mark Read', icon: '/icons/check.png' },
      ],
      requireInteraction: false,
      renotify: true,
    };

    event.waitUntil(self.registration.showNotification(data.title || 'New Message', options));
  }
});

// Function to sync notifications in background
async function syncNotifications() {
  try {
    // This would typically fetch missed notifications from your API
    const response = await fetch('/api/notifications/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const notifications = await response.json();

      // Show notifications for any missed items
      for (const notification of notifications.missed || []) {
        await self.registration.showNotification(notification.title, {
          body: notification.body,
          icon: '/icons/chat-notification.png',
          badge: '/icons/chat-badge.png',
          tag: notification.tag,
          data: notification.data,
        });
      }
    }
  } catch (error) {
    console.error('Failed to sync notifications:', error);
  }
}

// Handle messages from the main thread
self.addEventListener('message', function (event) {
  const { type, data } = event.data;

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (type === 'SYNC_NOTIFICATIONS') {
    // Trigger a background sync
    event.waitUntil(syncNotifications());
  }
});
