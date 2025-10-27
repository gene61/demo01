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

    // Get only subscriptions from users who have tasks (is_empty = false)
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('is_empty', false)
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

    console.log(`📤 Sending notifications to ${subscriptions.length} subscribers`);

    // Send notification to ALL subscriptions
    const results = [];
    const expiredSubscriptions = [];

    for (const subscriptionRow of subscriptions) {
      const subscription = subscriptionRow.subscription_data;
      try {
        await webpush.sendNotification(subscription, JSON.stringify({
          title: '📝 GoalBee Reminder',
          body: 'Check your tasks - some deadlines might be approaching!'
        }));
        console.log(`✅ Sent to: ${subscription.endpoint.substring(0, 50)}...`);
        results.push({ endpoint: subscription.endpoint, success: true });
      } catch (error: any) {
        console.log(`❌ Failed for: ${subscription.endpoint.substring(0, 50)}...`);
        results.push({ 
          endpoint: subscription.endpoint, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        
        // Remove expired subscriptions
        if (error.statusCode === 410) {
          expiredSubscriptions.push(subscription.endpoint);
          console.log(`🗑️ Marked expired subscription: ${subscription.endpoint}`);
        }
      }
    }

    // Remove expired subscriptions from database
    if (expiredSubscriptions.length > 0) {
      const { error: deleteError } = await supabase
        .from('subscriptions')
        .delete()
        .in('endpoint', expiredSubscriptions);

      if (deleteError) {
        console.error('Failed to remove expired subscriptions:', deleteError);
      } else {
        console.log(`🗑️ Removed ${expiredSubscriptions.length} expired subscriptions`);
      }
    }

    const successful = results.filter(r => r.success).length;
    
    return NextResponse.json({ 
      success: successful > 0,
      totalSubscriptions: subscriptions.length,
      successful: successful,
      failed: subscriptions.length - successful,
      expiredRemoved: expiredSubscriptions.length,
      results: results,
      message: `Sent notifications to ${successful}/${subscriptions.length} subscribers`
    });
  } catch (error) {
    console.error('Check deadlines error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
