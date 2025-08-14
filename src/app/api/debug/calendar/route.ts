// src/app/api/debug/calendar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAllConnectedUsers } from '@/lib/firebase/userCalendarConnections';
import { getAllAppointments } from '@/lib/firebase/appointments';

// GET - Debug calendar integration status
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debugging calendar integration...');

    // Check connected users
    const connectedUsers = await getAllConnectedUsers();
    console.log(`Found ${connectedUsers.length} connected users`);

    // Check recent appointments
    const appointments = await getAllAppointments();
    const recentAppointments = appointments.slice(0, 5);
    console.log(`Found ${appointments.length} total appointments`);

    // Check for appointments with Google Calendar IDs
    const syncedAppointments = appointments.filter(apt => apt.googleCalendarEventId);
    console.log(`Found ${syncedAppointments.length} synced appointments`);

    const debugInfo = {
      connectedUsers: {
        count: connectedUsers.length,
        users: connectedUsers.map(user => ({
          userId: user.userId,
          email: user.email,
          connectedAt: user.connectedAt,
          hasTokens: !!user.tokens,
          tokenScope: user.tokens?.scope,
        }))
      },
      appointments: {
        total: appointments.length,
        synced: syncedAppointments.length,
        recent: recentAppointments.map(apt => ({
          id: apt.id,
          clientName: apt.clientName,
          dateOfSession: apt.dateOfSession,
          googleCalendarEventId: apt.googleCalendarEventId,
          createdByUserId: apt.createdByUserId,
          createdAt: apt.createdAt,
        }))
      },
      issues: []
    };

    // Identify potential issues
    if (connectedUsers.length === 0) {
      debugInfo.issues.push('No users have connected their Google Calendars. Users need to sign out and sign back in with Google.');
    }

    if (syncedAppointments.length === 0 && appointments.length > 0) {
      debugInfo.issues.push('Appointments exist but none are synced to Google Calendar. Check sync functionality.');
    }

    const usersWithoutTokens = connectedUsers.filter(user => !user.tokens);
    if (usersWithoutTokens.length > 0) {
      debugInfo.issues.push(`${usersWithoutTokens.length} users connected but missing tokens.`);
    }

    return NextResponse.json({
      success: true,
      debug: debugInfo,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in calendar debug:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to debug calendar integration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
