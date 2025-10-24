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

// Mock data stores (in production, use a database)
// Note: These are in-memory and will reset on server restart
// In production, use a database like Redis, PostgreSQL, or Vercel KV
const todosStore = new Map();

// Hardcoded subscription for testing - replace with your actual subscription
const hardcodedSubscriptions = [
  {
    endpoint: 'https://jmt17.google.com/fcm/send/fCUDRc6Q8hQ:APA91bEdQHHqYmQFUDGuFojzXGFe2S1MdpRG_7LOs08Zd6PTzurrOFZG6KUEOnJzuLFuE8YfbqFrzXKwYdWlcTKG-pSnNRHQV3NMgyFmHEI2untq56gZj3P4Ro3ZtyWlfeI3pvieQE4n',
    expirationTime: null,
    keys: {
      p256dh: 'BFvNzM0FPF3E7fwXTUXt-G1v4fSGAKwfH2kRkVlE8dOKWM52QB9K2vIpEbAEdfl3gu5cq_7XAprxNJhr4poCbs8',
      auth: 't_ot5Nw1Vn562d56J-hpVw'
    }
  }
];

// Helper functions
const getUpcomingDeadlines = async () => {
  console.log('🔔 Step 1: Fetching upcoming deadlines');
  
  // In production, fetch from database
  // For now, return mock data or empty array
  const todos = Array.from(todosStore.values());
  
  // Use Perth timezone (UTC+8)
  const perthTimeZone = 'Australia/Perth';
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: perthTimeZone }));
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  
  const upcomingDeadlines = todos.filter(todo => {
    if (!todo.deadline || todo.completed) return false;
    
    const deadline = new Date(todo.deadline);
    return deadline <= oneHourFromNow && deadline > now;
  });
  
  console.log(`Found ${upcomingDeadlines.length} upcoming deadlines`);
  return upcomingDeadlines;
};

const getOverdueDeadlines = async () => {
  console.log('🔔 Step 1b: Fetching overdue deadlines');
  
  const todos = Array.from(todosStore.values());
  
  // Use Perth timezone (UTC+8)
  const perthTimeZone = 'Australia/Perth';
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: perthTimeZone }));
  
  const overdueDeadlines = todos.filter(todo => {
    if (!todo.deadline || todo.completed) return false;
    
    const deadline = new Date(todo.deadline);
    return deadline <= now;
  });
  
  console.log(`Found ${overdueDeadlines.length} overdue deadlines`);
  return overdueDeadlines;
};

const getSubscribedUsers = async () => {
  console.log('🔔 Step 2: Getting subscribed users');
  console.log(`Found ${hardcodedSubscriptions.length} hardcoded subscribers`);
  return hardcodedSubscriptions;
};

const sendPushNotification = async (subscription: any, title: string, body: string, url: string) => {
  try {
    // Configure VAPID only when actually sending notifications
    if (!configureVapid()) {
      console.warn('Skipping notification - VAPID not configured');
      return false;
    }

    const payload = JSON.stringify({
      title,
      body,
      url
    });

    await webpush.sendNotification(subscription, payload);
    console.log(`✅ Notification sent: ${title}`);
    return true;
  } catch (error: any) {
    console.error('❌ Failed to send notification:', error);
    // Note: Can't remove hardcoded subscriptions, but log the error
    if (error.statusCode === 410) {
      console.log(`Subscription expired: ${subscription.endpoint}`);
    }
    return false;
  }
};

export async function POST(request: NextRequest) {
  console.log('🔔 Check deadlines function started via POST');
  
  try {
    // Get todos from request body (for manual testing)
    const { todos } = await request.json();
    
    if (todos && Array.isArray(todos)) {
      // Store todos for later use
      todos.forEach(todo => {
        if (todo.id) {
          todosStore.set(todo.id, todo);
        }
      });
      console.log(`Stored ${todos.length} todos from request`);
    }
    
    return await checkDeadlines();
    
  } catch (error) {
    console.error('❌ Error in check-deadlines POST:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check deadlines',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Main function for cron job
const checkDeadlines = async () => {
  console.log('🔔 Check deadlines function started');
  
  try {
    // Get upcoming deadlines
    const upcomingDeadlines = await getUpcomingDeadlines();
    const overdueDeadlines = await getOverdueDeadlines();
    
    // Get subscribed users
    const subscribers = await getSubscribedUsers();
    
    console.log('🔔 Step 3: Sending notifications');
    let sentCount = 0;
    
    // Send notifications for upcoming deadlines
    for (const todo of upcomingDeadlines) {
      const timeUntilDeadline = Math.floor((new Date(todo.deadline).getTime() - new Date().getTime()) / (60 * 1000));
      
      for (const subscriber of subscribers) {
        const result = await sendPushNotification(
          subscriber,
          '⏰ Task Deadline Approaching',
          `"${todo.text}" is due in ${timeUntilDeadline} minutes`,
          `/task/${todo.id}`
        );
        if (result) sentCount++;
      }
    }
    
    // Send notifications for overdue deadlines
    for (const todo of overdueDeadlines) {
      for (const subscriber of subscribers) {
        const result = await sendPushNotification(
          subscriber,
          '⚠️ Task Overdue',
          `"${todo.text}" is overdue!`,
          `/task/${todo.id}`
        );
        if (result) sentCount++;
      }
    }
    
    console.log(`✅ Successfully sent ${sentCount} notifications`);
    
    return NextResponse.json({ 
      success: true, 
      upcomingDeadlines: upcomingDeadlines.length,
      overdueDeadlines: overdueDeadlines.length,
      subscribers: subscribers.length,
      notificationsSent: sentCount
    });
    
  } catch (error) {
    console.error('❌ Error in check-deadlines:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};

// For testing: manually trigger deadline check
export async function GET() {
  console.log('🔔 Check deadlines function called via GET');
  return await checkDeadlines();
}
