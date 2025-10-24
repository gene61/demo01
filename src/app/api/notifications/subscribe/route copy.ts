import { NextRequest, NextResponse } from 'next/server';

// In a real app, you'd store this in a database
// For demo purposes, we'll use a simple in-memory store
export const subscriptions = new Map();

export async function POST(request: NextRequest) {
  try {
    const subscription = await request.json();
    
    if (!subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    // Store the subscription (in production, use a database)
    subscriptions.set(subscription.endpoint, subscription);
    
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
  // Return all subscriptions (for testing/debugging)
  const allSubscriptions = Array.from(subscriptions.values());
  return NextResponse.json({ subscriptions: allSubscriptions });
}

export async function DELETE(request: NextRequest) {
  try {
    const { endpoint } = await request.json();
    
    if (subscriptions.has(endpoint)) {
      subscriptions.delete(endpoint);
      console.log('Subscription removed:', endpoint);
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Subscription removed successfully'
    });

  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to remove subscription' },
      { status: 500 }
    );
  }
}
