// Quick script to send a test push notification
// Run with: node send-test-notification.js

const webpush = require('web-push');

// Your VAPID keys (from environment variables)
const vapidPublicKey = 'BFmcFGGHRMCmdiGM-vUwQes-uAfDzL8-Tso_F4nSScdOcbvIBV6oJd6DVXKDN62Cq-w6lqAR0LgjC4umGWuxu-Q';
const vapidPrivateKey = 'IimaanQvbkd59Hgp4WFPWFJKHpTd1jLiBvwXO3bXEgo';

// Your subscription data
const subscription = {
  "endpoint": "https://jmt17.google.com/fcm/send/e1BXGu0Ousc:APA91bHTOw3je-HSMgmrBKd3uHmW_JOBHKMDuUuEDVZThhlKXF9af8Svn6U6gQs3d0cmclKMs3UfofFxuOxVZIuWtJtWreEmTn9JNkwu-bEskIc8fvXppereQAvoM3Op0Uu9E-HM2rCW",
  "expirationTime": null,
  "keys": {
    "p256dh": "BDZ8aqrjiyL90UJjSzgwBTGNpegnE9IzASZRd0fGd1o4gtyIVNix4lvLBRHUu5uGu7dFxp9wtAXhEM8lAVxF85A",
    "auth": "dEtL76naQ2wvRXO9--89Zg"
  }
};

// Configure VAPID
webpush.setVapidDetails(
  'mailto:your-email@example.com',
  vapidPublicKey,
  vapidPrivateKey
);

// Send notification
async function sendNotification() {
  try {
    const payload = JSON.stringify({
      title: '🚀 Test Notification',
      body: 'This is a quick test push notification!',
      url: '/'
    });

    console.log('📤 Sending push notification...');
    const result = await webpush.sendNotification(subscription, payload);
    console.log('✅ Notification sent successfully!');
    console.log('Status:', result.statusCode);
    
  } catch (error) {
    console.error('❌ Failed to send notification:');
    console.error('Error:', error.message);
    if (error.statusCode) {
      console.error('Status Code:', error.statusCode);
    }
    if (error.body) {
      console.error('Response Body:', error.body);
    }
  }
}

sendNotification();
