import { NextRequest, NextResponse } from 'next/server';

// Web Push library for sending notifications
const webpush = require('web-push');

// Configure web push only if VAPID keys are available
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(
      'mailto:your-email@example.com',
      vapidPublicKey,
      vapidPrivateKey
    );
  } catch (error) {
    console.warn('Failed to set VAPID details:', error);
  }
} else {
  console.warn('VAPID keys not configured. Push notifications will not work.');
}

// Mock subscriptions store (in production, use a database)
const subscriptions = new Map();

export async function POST(request: NextRequest) {
  try {
    // Get todos from request body (in production, fetch from database)
    const { todos } = await request.json();
    
    if (!todos || !Array.isArray(todos)) {
      return NextResponse.json(
        { error: 'Invalid todos data' },
        { status: 400 }
      );
    }

    // Use Perth timezone (UTC+8)
    const perthTimeZone = 'Australia/Perth';
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: perthTimeZone }));
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const notificationsSent = [];

    // Check each todo for upcoming deadlines
    for (const todo of todos) {
      if (!todo.deadline || todo.completed) continue;

      const deadline = new Date(todo.deadline);
      
      // Check if deadline is within the next hour
      if (deadline <= oneHourFromNow && deadline > now) {
        const timeUntilDeadline = Math.floor((deadline.getTime() - now.getTime()) / (60 * 1000));
        
        // Send notification to all subscribers
        for (const subscription of subscriptions.values()) {
          try {
            const payload = JSON.stringify({
              title: '⏰ Task Deadline Approaching',
              body: `"${todo.text}" is due in ${timeUntilDeadline} minutes`,
              url: `/task/${todo.id}`
            });

            await webpush.sendNotification(subscription, payload);
            notificationsSent.push({
              todoId: todo.id,
              todoText: todo.text,
              timeUntilDeadline,
              endpoint: subscription.endpoint
            });
            
            console.log(`Notification sent for todo: ${todo.text}`);
          } catch (error: any) {
            console.error('Failed to send notification:', error);
            // Remove expired/invalid subscriptions
            if (error.statusCode === 410) {
              subscriptions.delete(subscription.endpoint);
            }
          }
        }
      }
      
      // Check if deadline has passed
      if (deadline <= now && !todo.completed) {
        for (const subscription of subscriptions.values()) {
          try {
            const payload = JSON.stringify({
              title: '⚠️ Task Overdue',
              body: `"${todo.text}" is overdue!`,
              url: `/task/${todo.id}`
            });

            await webpush.sendNotification(subscription, payload);
            notificationsSent.push({
              todoId: todo.id,
              todoText: todo.text,
              status: 'overdue',
              endpoint: subscription.endpoint
            });
            
            console.log(`Overdue notification sent for todo: ${todo.text}`);
          } catch (error: any) {
            console.error('Failed to send overdue notification:', error);
            if (error.statusCode === 410) {
              subscriptions.delete(subscription.endpoint);
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Checked ${todos.length} todos`,
      notificationsSent: notificationsSent.length,
      details: notificationsSent
    });

  } catch (error) {
    console.error('Deadline check error:', error);
    return NextResponse.json(
      { error: 'Failed to check deadlines' },
      { status: 500 }
    );
  }
}

// For testing: manually trigger deadline check
export async function GET() {
  return NextResponse.json({
    message: 'Deadline check endpoint',
    subscriptions: Array.from(subscriptions.values()).length
  });
}
