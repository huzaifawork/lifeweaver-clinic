// src/app/api/calendar/sync-existing/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAllSessions } from '@/lib/firebase/sessions';
import { getAllAppointments } from '@/lib/firebase/appointments';
import { syncAppointmentToSpecificUser } from '@/lib/services/multiUserCalendarSync';

// POST - Sync all existing appointments to newly connected user
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting sync of existing appointments to newly connected user...');
    
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log(`👤 Syncing existing appointments for user: ${userId}`);

    // Get all existing sessions and appointments
    const [sessions, appointments] = await Promise.all([
      getAllSessions(),
      getAllAppointments()
    ]);

    console.log(`📋 Found ${sessions.length} sessions and ${appointments.length} appointments`);

    const results = {
      totalItems: 0,
      successfulSyncs: 0,
      errors: [] as string[]
    };

    // Sync all sessions (convert to appointment format)
    for (const session of sessions) {
      try {
        results.totalItems++;
        
        // Convert session to appointment format
        const appointmentData = {
          id: session.id,
          clientId: session.clientId,
          clientName: session.clientName || 'Unknown Client',
          attendingClinicianId: session.attendingClinicianId,
          attendingClinicianName: session.attendingClinicianName,
          attendingClinicianVocation: session.attendingClinicianVocation,
          type: session.sessionType || 'therapy',
          status: 'confirmed' as const,
          dateOfSession: session.dateOfSession,
          duration: session.duration || 60,
          location: session.location || 'TBD',
          content: session.content,
          createdByUserId: session.createdByUserId || 'Unknown User',
          createdByUserName: session.createdByUserName,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        };

        // Only sync to the specific new user (not all users)
        const syncResult = await syncAppointmentToSpecificUser(appointmentData, userId, session.createdByUserId);
        
        if (syncResult.success) {
          results.successfulSyncs++;
          console.log(`✅ Synced session ${session.id} for ${session.clientName}`);
        } else {
          results.errors.push(`Session ${session.id}: ${syncResult.errors.join(', ')}`);
          console.warn(`⚠️ Failed to sync session ${session.id}:`, syncResult.errors);
        }
      } catch (error) {
        const errorMsg = `Session ${session.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        console.error(`❌ Error syncing session ${session.id}:`, error);
      }
    }

    // Sync all appointments
    for (const appointment of appointments) {
      try {
        results.totalItems++;
        
        const syncResult = await syncAppointmentToSpecificUser(appointment, userId, appointment.createdByUserId);
        
        if (syncResult.success) {
          results.successfulSyncs++;
          console.log(`✅ Synced appointment ${appointment.id} for ${appointment.clientName}`);
        } else {
          results.errors.push(`Appointment ${appointment.id}: ${syncResult.errors.join(', ')}`);
          console.warn(`⚠️ Failed to sync appointment ${appointment.id}:`, syncResult.errors);
        }
      } catch (error) {
        const errorMsg = `Appointment ${appointment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        console.error(`❌ Error syncing appointment ${appointment.id}:`, error);
      }
    }

    console.log(`📊 Sync complete: ${results.successfulSyncs}/${results.totalItems} items synced`);

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${results.successfulSyncs}/${results.totalItems} existing appointments`,
      totalItems: results.totalItems,
      successfulSyncs: results.successfulSyncs,
      errors: results.errors,
    });

  } catch (error) {
    console.error('Error syncing existing appointments:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to sync existing appointments',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
