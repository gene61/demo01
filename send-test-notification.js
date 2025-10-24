// Quick script to send a test push notification
// Run with: node send-test-notification.js

const webpush = require('web-push');

// Your VAPID keys (from environment variables)
const vapidPublicKey = 'BFmcFGGHRMCmdiGM-vUwQes-uAfDzL8-Tso_F4nSScdOcbvIBV6oJd6DVXKDN62Cq-w6lqAR0LgjC4umGWuxu-Q';
const vapidPrivateKey = 'IimaanQvbkd59Hgp4WFPWFJKHpTd1jLiBvwXO3bXEgo';

// Your subscription data
const subscription = {
  endpoint: 'https://jmt17.google.com/fcm/send/fCUDRc6Q8hQ:APA91bEdQHHqYmQFUDGuFojzXGFe2S1MdpRG_7LOs08Zd6PTzurrOFZG6KUEOnJzuLFuE8YfbqFrzXKwYdWlcTKG-pSnNRHQV3NMgyFmHEI2untq56gZj3P4Ro3ZtyWlfeI3pvieQE4n',
  expirationTime: null,
  keys: {
    p256dh: 'BFvNzM0FPF3E7fwXTUXt-G1v4fSGAKwfH2kRkVlE8dOKWM52QB9K2vIpEbAEdfl3gu5cq_7XAprxNJhr4poCbs8',
    auth: 't_ot5Nw1Vn562d56J-hpVw'
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
