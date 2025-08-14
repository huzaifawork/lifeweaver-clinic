// src/app/api/google-calendar/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserCalendarConnection, removeUserCalendarConnection } from '@/lib/firebase/userCalendarConnections';

// GET - Check user's Google Calendar connection status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const connection = await getUserCalendarConnection(userId);

    if (connection) {
      return NextResponse.json({
        success: true,
        connected: true,
        email: connection.email,
        connectedAt: connection.connectedAt,
        lastSyncAt: connection.lastSyncAt,
      });
    } else {
      return NextResponse.json({
        success: true,
        connected: false,
      });
    }
  } catch (error) {
    console.error('Error checking calendar status:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check calendar status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Disconnect user's Google Calendar
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    await removeUserCalendarConnection(userId);

    return NextResponse.json({
      success: true,
      message: 'Google Calendar disconnected successfully',
    });
  } catch (error) {
    console.error('Error disconnecting calendar:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to disconnect calendar',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
