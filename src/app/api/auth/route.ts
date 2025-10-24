import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    
    // Get the actual password from environment variables (server-side only)
    const correctPassword = process.env.APP_PASSWORD || '61';
    
    if (password === correctPassword) {
      return NextResponse.json({ 
        success: true,
        message: 'Authentication successful'
      });
    } else {
      return NextResponse.json(
        { 
          success: false,
          message: 'Incorrect password' 
        },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Authentication failed' 
      },
      { status: 500 }
    );
  }
}
