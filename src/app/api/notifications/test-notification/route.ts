import { NextRequest, NextResponse } from 'next/server';

// Web Push library for sending notifications
const webpush = require('web-push');

// VAPID configuration will be set inside the function when needed
let vapidConfigured = false;

const configureVapid = () => {
  if (vapidConfigured) return true;
  
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

  if (vapidPublicKey && vapidPrivateKey) {
    try {
      webpush.setVapidDetails(
        'mailto:your-email@example.com',
        vapidPublicKey,
        vapidPrivateKey
      );
      vapidConfigured = true;
      return true;
    } catch (error) {
      console.warn('Failed to set VAPID details:', error);
      return false;
    }
  } else {
    console.warn('VAPID keys not configured. Push notifications will not work.');
    return false;
  }
};

// Hardcoded test subscription - replace with your actual subscription
// You can get this by calling the subscribe endpoint and copying the response
const testSubscriptions = [
  // Replace this with your actual subscription data
  // You can get this by:
  // 1. Opening your app in browser
  // 2. Subscribing to push notifications
  // 3. Copying the subscription object from browser console
  {
    endpoint: 'https://jmt17.google.com/fcm/send/fP_dJTwksRY:APA91bGF49gXuSCm2HR5WFzRgQluZLczLq61w6TH_0lUy8F_F6sVb-qhIM4ftUbKumCYgtcKAZCjsBhduiFIKiDRecATEfddr15zr0vpk5TlDIweZc4WK_ShWN5vjRxjvqoed8aLXE7w',
    expirationTime: null,
    keys: {
      p256dh: 'BCgD3DYwI8m3AW5_HSTLb1BEIu6GaGVohbiCMk5p3wmi0-6WyQ4N-IOFK6j14Kfspzd-sCKbBByPVabacHjVCsk',
      auth: 'i_rvc5DwsEAVmlJ1pxwybA'
    }
  }
];

const sendPushNotification = async (subscription: any, title: string, body: string) => {
  try {
    // Configure VAPID only when actually sending notifications
    if (!configureVapid()) {
      console.warn('Skipping notification - VAPID not configured');
      return false;
    }

    const payload = JSON.stringify({
      title,
      body,
      url: '/'
    });

    await webpush.sendNotification(subscription, payload);
    console.log(`✅ Test notification sent: ${title}`);
    return true;
  } catch (error: any) {
    console.error('❌ Failed to send test notification:', error);
    return false;
  }
};

export async function POST(request: NextRequest) {
  console.log('🔔 Test notification function started via POST');
  
  try {
    const { message } = await request.json();
    const notificationMessage = message || 'Test push notification from Vercel!';
    
    return await sendTestNotification(notificationMessage);
    
  } catch (error) {
    console.error('❌ Error in test-notification POST:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send test notification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Main function for cron job
const sendTestNotification = async (customMessage?: string) => {
  console.log('🔔 Test notification function started');
  
  try {
    const messages = [
      '🚀 Hello from Vercel! This is a test notification.',
      '📅 Your daily reminder: Stay productive!',
      '🎯 Task completed successfully!',
      '🌟 Great work today! Keep it up!',
      '⏰ Time for a quick break?',
      '📱 Push notifications are working!',
      '✅ Vercel cron job is running smoothly!',
      '🎉 Congratulations! Your setup is working!'
    ];
    
    const randomMessage = customMessage || messages[Math.floor(Math.random() * messages.length)];
    
    console.log('🔔 Step 1: Sending test notification');
    let sentCount = 0;
    
    // Send notification to all test subscriptions
    for (const subscription of testSubscriptions) {
      const result = await sendPushNotification(
        subscription,
        '🧪 Test Notification',
        randomMessage
      );
      if (result) sentCount++;
    }
    
    console.log(`✅ Successfully sent ${sentCount} test notifications`);
    
    return NextResponse.json({ 
      success: true, 
      message: randomMessage,
      notificationsSent: sentCount,
      totalSubscriptions: testSubscriptions.length
    });
    
  } catch (error) {
    console.error('❌ Error in test-notification:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};

// For testing: manually trigger test notification
export async function GET() {
  console.log('🔔 Test notification function called via GET');
  return await sendTestNotification();
}
