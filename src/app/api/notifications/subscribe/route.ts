import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const subscription = await request.json();
    
    if (!subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    // Store the subscription in Supabase with initial is_empty = false
    // (assuming user subscribes when they have tasks)
    const { data, error } = await supabase
      .from('subscriptions')
      .upsert({
        endpoint: subscription.endpoint,
        subscription_data: subscription,
        is_empty: false  // Default to false when subscribing
      }, {
        onConflict: 'endpoint'
      })
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to save subscription' },
        { status: 500 }
      );
    }
    
    console.log('New subscription stored:', subscription.endpoint);
    
    return NextResponse.json({ 
      success: true,
      message: 'Subscription saved successfully'
    });

  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Return all subscriptions from Supabase
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }
    
    const allSubscriptions = data.map(row => ({
      ...row.subscription_data,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
    
    return NextResponse.json({ subscriptions: allSubscriptions });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { endpoint, is_empty } = await request.json();
    
    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 }
      );
    }

    // Update is_empty status in Supabase
    const { data, error } = await supabase
      .from('subscriptions')
      .update({ is_empty })
      .eq('endpoint', endpoint)
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to update subscription status' },
        { status: 500 }
      );
    }
    
    console.log('Updated is_empty status:', { endpoint, is_empty });
    
    return NextResponse.json({ 
      success: true,
      message: 'Subscription status updated successfully'
    });

  } catch (error) {
    console.error('Update status error:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription status' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { endpoint } = await request.json();
    
    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 }
      );
    }

    // Delete subscription from Supabase
    const { data, error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to remove subscription' },
        { status: 500 }
      );
    }
    
    if (data && data.length > 0) {
      console.log('Subscription removed:', endpoint);
      return NextResponse.json({ 
        success: true,
        message: 'Subscription removed successfully'
      });
    } else {
      return NextResponse.json({ 
        success: true,
        message: 'Subscription not found'
      });
    }

  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to remove subscription' },
      { status: 500 }
    );
  }
}
