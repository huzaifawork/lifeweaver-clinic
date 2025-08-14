// src/app/api/calendar/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { syncWithGoogleCalendar } from '@/lib/firebase/appointments';

// POST - Manual sync with Google Calendar
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting manual Google Calendar sync...');
    
    const result = await syncWithGoogleCalendar();
    
    const response = {
      success: true,
      message: 'Google Calendar sync completed',
      data: {
        synced: result.synced,
        updated: result.updated,
        errors: result.errors,
        timestamp: new Date().toISOString(),
      }
    };

    if (result.errors.length > 0) {
      console.warn('⚠️ Sync completed with warnings:', result.errors);
      response.message = `Sync completed with ${result.errors.length} warnings`;
    } else {
      console.log('✅ Sync completed successfully:', result);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Manual sync failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to sync with Google Calendar',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// GET - Get sync status/history
export async function GET(request: NextRequest) {
  try {
    // You could implement sync history tracking here
    // For now, just return basic status
    
    return NextResponse.json({
      success: true,
      status: 'ready',
      message: 'Google Calendar sync service is ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get sync status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
