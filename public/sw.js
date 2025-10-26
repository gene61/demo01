// // Service Worker for Push Notifications
// self.addEventListener('install', (event) => {
//   console.log('Service Worker installed');
//   self.skipWaiting();
// });

// self.addEventListener('activate', (event) => {
//   console.log('Service Worker activated');
//   event.waitUntil(self.clients.claim());
// });

// self.addEventListener('push', (event) => {
//   if (!event.data) return;

//   const data = event.data.json();
//   const options = {
//     body: data.body,
//     icon: '/icon-192x192.svg',
//     badge: '/icon-192x192.svg',
//     vibrate: [200, 100, 200],
//     data: {
//       url: data.url || '/'
//     },
//     actions: [
//       {
//         action: 'open',
//         title: 'Open App'
//       },
//       {
//         action: 'close',
//         title: 'Close'
//       }
//     ]
//   };

//   event.waitUntil(
//     self.registration.showNotification(data.title, options)
//   );
// });

// self.addEventListener('notificationclick', (event) => {
//   event.notification.close();

//   const handleNotificationClick = async () => {
//     // Get all clients (windows, tabs, PWA instances)
//     const clientList = await self.clients.matchAll({ 
//       type: 'window',
//       includeUncontrolled: true 
//     });

//     // Try to find and focus any existing app window
//     for (const client of clientList) {
//       // Check if this is our app (matches the origin)
//       if (client.url.startsWith(self.location.origin)) {
//         console.log('Found existing app window:', client.url);
        
//         // Try to focus the window
//         if ('focus' in client) {
//           try {
//             await client.focus();
//             console.log('Successfully focused existing window');
            
//             // Send message to the focused window
//             client.postMessage({
//               type: 'NOTIFICATION_CLICK',
//               url: event.notification.data.url,
//               timestamp: Date.now()
//             });
//             return;
//           } catch (error) {
//             console.log('Failed to focus window, trying to navigate:', error);
//           }
//         }
        
//         // If focus fails, try to navigate the existing window
//         try {
//           const url = event.notification.data.url || '/';
//           await client.navigate(url);
//           console.log('Navigated existing window to:', url);
//           return;
//         } catch (error) {
//           console.log('Failed to navigate window:', error);
//         }
//       }
//     }
    
//     // If no existing window found or couldn't focus/navigate, open a new one
//     if (self.clients.openWindow) {
//       const url = event.notification.data.url || '/';
//       console.log('Opening new app window:', url);
      
//       // For mobile PWAs, we need to ensure the PWA opens properly
//       const newWindow = await self.clients.openWindow(url);
      
//       if (newWindow) {
//         console.log('New window opened successfully');
//       } else {
//         console.log('Failed to open new window - might be blocked by browser');
//         // Fallback: try to open in current tab if PWA window fails
//         self.clients.openWindow(url);
//       }
//     }
//   };

//   if (event.action === 'open') {
//     event.waitUntil(handleNotificationClick());
//   } else if (event.action === 'close') {
//     // Just close the notification, do nothing else
//     console.log('Notification closed by user');
//   } else {
//     // Default click behavior (when clicking the notification body)
//     event.waitUntil(handleNotificationClick());
//   }
// });

// self.addEventListener('notificationclose', (event) => {
//   console.log('Notification closed', event.notification);
// });


// Service Worker for Push Notifications
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon-192x192.svg',
    badge: '/icon-192x192.svg',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    },
    actions: [
      // {
      //   action: 'open',
      //   title: 'Open App'
      // },
      {
        action: 'close',
        title: 'Close This Notification'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// self.addEventListener('notificationclick', (event) => {
//   console.log('=== NOTIFICATION CLICK DEBUG ===');
//   console.log('Action:', event.action);
//   console.log('Notification URL:', event.notification.data.url);
  
//   event.notification.close();

//   const handleNotificationClick = async () => {
//     const url = event.notification.data.url || '/';
//     const absoluteUrl = new URL(url, self.location.origin).href;
    
//     console.log('Processing notification click for URL:', absoluteUrl);

//     try {
//       // Get all window clients
//       const clientList = await self.clients.matchAll({ 
//         type: 'window',
//         includeUncontrolled: true 
//       });

//       console.log('Found clients:', clientList.length);
//       clientList.forEach((client, index) => {
//         console.log(`Client ${index}:`, client.url, 'focused:', client.focused);
//       });

//       // Try to find an existing client from our origin
//       let existingClient = null;
//       for (const client of clientList) {
//         if (client.url.startsWith(self.location.origin)) {
//           existingClient = client;
//           console.log('Found existing app client:', client.url);
//           break;
//         }
//       }

//       if (existingClient) {
//         // Strategy 1: Try to focus existing client
//         if ('focus' in existingClient) {
//           try {
//             await existingClient.focus();
//             console.log('Successfully focused existing window');
            
//             // Send message to navigate to the target URL
//             existingClient.postMessage({
//               type: 'NOTIFICATION_CLICK',
//               url: absoluteUrl,
//               timestamp: Date.now()
//             });
//             return;
//           } catch (focusError) {
//             console.log('Focus failed, trying navigate:', focusError);
//           }
//         }

//         // Strategy 2: Try to navigate existing client (from internet code)
//         if ('navigate' in existingClient) {
//           try {
//             await existingClient.navigate(absoluteUrl);
//             console.log('Successfully navigated existing window');
            
//             if ('focus' in existingClient) {
//               await existingClient.focus();
//             }
//             return;
//           } catch (navigateError) {
//             console.log('Navigate failed:', navigateError);
//           }
//         }
//       }

//       // Strategy 3: No suitable existing client found, open new window
//       console.log('Opening new window for URL:', absoluteUrl);
      
//       if (self.clients.openWindow) {
//         // Mobile PWA specific: ensure we're opening the PWA properly
//         const newWindow = await self.clients.openWindow(absoluteUrl);
        
//         if (!newWindow) {
//           console.log('First openWindow attempt returned null, retrying...');
//           // Mobile browsers sometimes block the first attempt
//           // Wait a bit and try again
//           await new Promise(resolve => setTimeout(resolve, 300));
//           const retryWindow = await self.clients.openWindow(absoluteUrl);
          
//           if (!retryWindow) {
//             console.error('All openWindow attempts failed');
//             // Final fallback - this might trigger browser's popup blocker notice
//             self.clients.openWindow(absoluteUrl).catch(finalError => {
//               console.error('Final openWindow attempt failed:', finalError);
//             });
//           }
//         } else {
//           console.log('New window opened successfully');
//         }
//       }
      
//     } catch (error) {
//       console.error('Error in notification click handler:', error);
      
//       // Ultimate fallback
//       try {
//         await self.clients.openWindow(absoluteUrl);
//       } catch (finalError) {
//         console.error('All navigation attempts failed:', finalError);
//       }
//     }
//   };

//   // Handle different notification actions
//   if (event.action === 'open' || !event.action) {
//     console.log('Executing open action');
//     event.waitUntil(handleNotificationClick());
//   } else if (event.action === 'close') {
//     console.log('Notification closed by user action');
//     // Just close the notification, do nothing else
//   }
// });

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // If close button is clicked, do nothing and return immediately
  if (event.action === 'close') {
    console.log('Close button clicked - doing nothing');
    return;
  }

  // This looks to see if the current window is already open and
  // focuses if it is
  event.waitUntil(
    clients
      .matchAll({
        type: "window",
      })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === "/" && "focus" in client)
            return client.focus();
        }
        if (clients.openWindow) return clients.openWindow("/");
      })
  );
});


self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed', event.notification);
});

// Optional: Handle messages from the client
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
