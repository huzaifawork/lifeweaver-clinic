// src/app/api/calendar/sync-appointment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  createAppointmentInAllCalendars,
  updateAppointmentInAllCalendars,
  deleteAppointmentFromAllCalendars 
} from '@/lib/services/multiUserCalendarSync';

// POST - Sync appointment to all users' calendars
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 SYNC API CALLED - Starting appointment sync...');

    const { appointment, operation, creatorUserId } = await request.json();

    console.log('📋 Sync request data:', {
      appointmentId: appointment?.id,
      clientName: appointment?.clientName,
      operation,
      creatorUserId,
      dateOfSession: appointment?.dateOfSession
    });

    if (!appointment) {
      console.error('❌ No appointment data provided');
      return NextResponse.json(
        { success: false, error: 'Appointment data is required' },
        { status: 400 }
      );
    }

    if (!operation || !['create', 'update', 'delete'].includes(operation)) {
      console.error('❌ Invalid operation:', operation);
      return NextResponse.json(
        { success: false, error: 'Valid operation (create, update, delete) is required' },
        { status: 400 }
      );
    }

    console.log(`🔄 Processing ${operation} operation for appointment: ${appointment.id}`);

    let syncResult;

    console.log('🔄 Calling multi-user sync function...');

    switch (operation) {
      case 'create':
        console.log('📝 Creating appointment in all calendars...');
        syncResult = await createAppointmentInAllCalendars(appointment, creatorUserId);
        break;
      case 'update':
        console.log('✏️ Updating appointment in all calendars...');
        syncResult = await updateAppointmentInAllCalendars(appointment, creatorUserId);
        break;
      case 'delete':
        console.log('🗑️ Deleting appointment from all calendars...');
        syncResult = await deleteAppointmentFromAllCalendars(appointment, creatorUserId);
        break;
    }

    console.log('📊 Sync result:', {
      success: syncResult.success,
      successfulSyncs: syncResult.successfulSyncs,
      totalUsers: syncResult.totalUsers,
      errors: syncResult.errors,
      userResults: syncResult.userResults.map(r => ({
        userId: r.userId,
        email: r.email,
        success: r.success,
        error: r.error
      }))
    });

    if (syncResult.success) {
      // Get the first successful event ID for the response
      const firstSuccessfulResult = syncResult.userResults.find(r => r.success && r.eventId);

      console.log(`✅ SYNC SUCCESS! ${syncResult.successfulSyncs}/${syncResult.totalUsers} calendars updated`);

      return NextResponse.json({
        success: true,
        eventId: firstSuccessfulResult?.eventId,
        successfulSyncs: syncResult.successfulSyncs,
        totalUsers: syncResult.totalUsers,
        userResults: syncResult.userResults,
        message: `Appointment ${operation}d successfully in ${syncResult.successfulSyncs}/${syncResult.totalUsers} users' calendars`,
      });
    } else {
      console.warn(`⚠️ SYNC FAILED! Errors:`, syncResult.errors);

      return NextResponse.json({
        success: false,
        errors: syncResult.errors,
        successfulSyncs: syncResult.successfulSyncs,
        totalUsers: syncResult.totalUsers,
        message: `Failed to ${operation} appointment in calendars`,
      });
    }

  } catch (error) {
    console.error(`Error syncing appointment:`, error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to sync appointment to calendars',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
