'use client';

import { useEffect } from 'react';

export default function ServiceWorkerHandler() {
  useEffect(() => {
    // Handle messages from service worker (notification clicks)
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
        console.log('Notification click received:', event.data);
        
        // For mobile PWAs, we might need to bring the app to foreground
        if (window.location.pathname !== event.data.url) {
          // Navigate to the notification URL if needed
          window.location.href = event.data.url;
        }
        
        // Try to focus the window (useful for mobile)
        if (document.hidden) {
          // If app is in background, try to bring to foreground
          window.focus();
        }
      }
    };

    // Register service worker and message handler
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      
      // Register service worker
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, []);

  return null; // This component doesn't render anything
}
