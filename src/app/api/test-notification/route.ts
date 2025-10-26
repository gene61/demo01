import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const webpush = require('web-push');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    // Configure VAPID
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    
    if (vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(
        'mailto:your-email@example.com',
        vapidPublicKey,
        vapidPrivateKey
      );
    }

    // Get all subscriptions (for testing)
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch subscriptions from database' 
      });
    }
    
    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No subscriptions found. Users need to subscribe first.' 
      });
    }

    console.log(`📤 Sending test notifications to ${subscriptions.length} subscribers`);

    // Send test notification to ALL subscriptions
    const results = [];

    for (const subscriptionRow of subscriptions) {
      const subscription = subscriptionRow.subscription_data;
      try {
        await webpush.sendNotification(subscription, JSON.stringify({
          title: '🧪 Test Notification',
          body: `This is a test notification! You have ${subscriptionRow.is_empty ? 'NO' : 'SOME'} tasks.`,
          url: '/'
        }));
        console.log(`✅ Test sent to: ${subscription.endpoint.substring(0, 50)}...`);
        results.push({ 
          endpoint: subscription.endpoint, 
          is_empty: subscriptionRow.is_empty,
          success: true 
        });
      } catch (error: any) {
        console.log(`❌ Test failed for: ${subscription.endpoint.substring(0, 50)}...`);
        results.push({ 
          endpoint: subscription.endpoint, 
          is_empty: subscriptionRow.is_empty,
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    
    return NextResponse.json({ 
      success: successful > 0,
      totalSubscriptions: subscriptions.length,
      successful: successful,
      failed: subscriptions.length - successful,
      results: results,
      message: `Sent test notifications to ${successful}/${subscriptions.length} subscribers`
    });
  } catch (error) {
    console.error('Test notification error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
