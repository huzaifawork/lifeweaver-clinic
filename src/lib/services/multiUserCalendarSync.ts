// src/lib/services/multiUserCalendarSync.ts
import { googleCalendarOAuth } from '@/lib/google-calendar-oauth';
import {
  getAllConnectedUsers,
  getUserCalendarConnection,
  updateUserCalendarTokens,
  updateUserLastSync
} from '@/lib/firebase/userCalendarConnections';
import { appointmentToCalendarEvent } from '@/lib/utils/appointmentCalendarSync';
import type { Appointment } from '@/lib/types';

export interface SyncResult {
  success: boolean;
  userResults: {
    userId: string;
    email: string;
    success: boolean;
    eventId?: string;
    error?: string;
  }[];
  totalUsers: number;
  successfulSyncs: number;
  errors: string[];
}

/**
 * Sync appointment to all connected users' calendars
 */
export const syncAppointmentToAllUsers = async (
  appointment: Appointment,
  operation: 'create' | 'update' | 'delete',
  creatorUserId?: string
): Promise<SyncResult> => {
  const result: SyncResult = {
    success: false,
    userResults: [],
    totalUsers: 0,
    successfulSyncs: 0,
    errors: []
  };

  try {
    console.log('🔍 Getting all connected users...');

    // Get all connected users
    const connectedUsers = await getAllConnectedUsers();
    result.totalUsers = connectedUsers.length;

    console.log(`👥 Found ${connectedUsers.length} connected users:`,
      connectedUsers.map(u => ({ email: u.email, userId: u.userId }))
    );

    if (connectedUsers.length === 0) {
      console.warn('⚠️ No users have connected their Google Calendars');
      result.errors.push('No users have connected their Google Calendars');
      return result;
    }

    console.log(`🔄 Starting sync to ${connectedUsers.length} users' calendars...`);

    // Process each user's calendar
    for (const userConnection of connectedUsers) {
      const userResult = {
        userId: userConnection.userId,
        email: userConnection.email,
        success: false,
        error: undefined as string | undefined,
        eventId: undefined as string | undefined,
      };

      try {
        console.log(`🔄 Processing user: ${userConnection.email} (${userConnection.userId})`);

        // Initialize OAuth client with user's tokens
        console.log('🔑 Initializing OAuth with user tokens...');
        googleCalendarOAuth.initializeWithTokens(userConnection.tokens);

        // Perform the calendar operation
        if (operation === 'create') {
          console.log('📝 Creating calendar event...');
          const calendarEvent = appointmentToCalendarEvent(appointment);
          
          // Add creator info and permissions
          const eventData = {
            ...calendarEvent,
            description: `${calendarEvent.description}\n\n${getPermissionText(userConnection.userId, creatorUserId)}`,
            // Make event read-only for non-creators
            guestsCanModify: userConnection.userId === creatorUserId,
            guestsCanInviteOthers: false,
            guestsCanSeeOtherGuests: true,
          };

          console.log('📅 Event data being sent to Google Calendar:', JSON.stringify(eventData, null, 2));

          const event = await googleCalendarOAuth.createEvent(eventData);

          console.log('✅ Google Calendar event created successfully:', {
            eventId: event.id,
            summary: event.summary,
            start: event.start,
            end: event.end
          });

          userResult.eventId = event.id;
          userResult.success = true;
          
        } else if (operation === 'update' && appointment.googleCalendarEventId) {
          const calendarEvent = appointmentToCalendarEvent(appointment);
          
          const eventData = {
            ...calendarEvent,
            description: `${calendarEvent.description}\n\n${getPermissionText(userConnection.userId, creatorUserId)}`,
            guestsCanModify: userConnection.userId === creatorUserId,
          };

          await googleCalendarOAuth.updateEvent(appointment.googleCalendarEventId, eventData);
          userResult.eventId = appointment.googleCalendarEventId;
          userResult.success = true;
          
        } else if (operation === 'delete' && appointment.googleCalendarEventId) {
          await googleCalendarOAuth.deleteEvent(appointment.googleCalendarEventId);
          userResult.success = true;
        }

        // Update last sync time
        await updateUserLastSync(userConnection.userId);

        console.log(`✅ Synced to ${userConnection.email}`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        userResult.error = errorMessage;
        result.errors.push(`${userConnection.email}: ${errorMessage}`);

        console.error(`❌ Failed to sync to ${userConnection.email}:`, {
          error: errorMessage,
          fullError: error,
          stack: error instanceof Error ? error.stack : undefined,
          userTokens: {
            hasTokens: !!userConnection.tokens,
            tokenType: userConnection.tokens?.token_type,
            scope: userConnection.tokens?.scope,
            hasAccessToken: !!userConnection.tokens?.access_token
          }
        });
      }

      result.userResults.push(userResult);
      if (userResult.success) {
        result.successfulSyncs++;
      }
    }

    result.success = result.successfulSyncs > 0;
    
    console.log(`📊 Sync complete: ${result.successfulSyncs}/${result.totalUsers} successful`);
    
    return result;

  } catch (error) {
    console.error('Error in multi-user calendar sync:', error);
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return result;
  }
};

/**
 * Get permission text for calendar event description
 */
function getPermissionText(userId: string, creatorUserId?: string): string {
  if (userId === creatorUserId) {
    return '🔧 You created this appointment - you can edit or delete it from Google Calendar';
  } else {
    return '👁️ View-only appointment - created by a colleague. Edit in LWV Dashboard if needed.';
  }
}

/**
 * Sync appointment creation to all users
 */
export const createAppointmentInAllCalendars = async (
  appointment: Appointment,
  creatorUserId: string
): Promise<SyncResult> => {
  return syncAppointmentToAllUsers(appointment, 'create', creatorUserId);
};

/**
 * Sync appointment update to all users
 */
export const updateAppointmentInAllCalendars = async (
  appointment: Appointment,
  creatorUserId?: string
): Promise<SyncResult> => {
  return syncAppointmentToAllUsers(appointment, 'update', creatorUserId);
};

/**
 * Sync appointment deletion to all users
 */
export const deleteAppointmentFromAllCalendars = async (
  appointment: Appointment,
  creatorUserId?: string
): Promise<SyncResult> => {
  return syncAppointmentToAllUsers(appointment, 'delete', creatorUserId);
};

/**
 * Sync appointment to a specific user's calendar only
 */
export const syncAppointmentToSpecificUser = async (
  appointment: Appointment,
  targetUserId: string,
  creatorUserId?: string
): Promise<SyncResult> => {
  const result: SyncResult = {
    success: false,
    userResults: [],
    totalUsers: 0,
    successfulSyncs: 0,
    errors: []
  };

  try {
    console.log(`🎯 Syncing appointment to specific user: ${targetUserId}`);

    // Get the specific user's connection
    const userConnection = await getUserCalendarConnection(targetUserId);

    if (!userConnection) {
      result.errors.push(`User ${targetUserId} has not connected their Google Calendar`);
      return result;
    }

    result.totalUsers = 1;

    const userResult = {
      userId: userConnection.userId,
      email: userConnection.email,
      success: false,
      error: undefined as string | undefined,
      eventId: undefined as string | undefined,
    };

    try {
      console.log(`🔄 Processing user: ${userConnection.email}`);

      // Initialize OAuth client with user's tokens
      googleCalendarOAuth.initializeWithTokens(userConnection.tokens);

      // Create the calendar event
      const calendarEvent = appointmentToCalendarEvent(appointment);

      const eventData = {
        ...calendarEvent,
        description: `${calendarEvent.description}\n\n${getPermissionText(userConnection.userId, creatorUserId)}`,
        guestsCanModify: userConnection.userId === creatorUserId,
        guestsCanInviteOthers: false,
        guestsCanSeeOtherGuests: true,
      };

      const event = await googleCalendarOAuth.createEvent(eventData);
      userResult.eventId = event.id;
      userResult.success = true;

      // Update last sync time
      await updateUserLastSync(userConnection.userId);

      console.log(`✅ Synced to ${userConnection.email}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      userResult.error = errorMessage;
      result.errors.push(`${userConnection.email}: ${errorMessage}`);
      console.error(`❌ Failed to sync to ${userConnection.email}:`, error);
    }

    result.userResults.push(userResult);
    if (userResult.success) {
      result.successfulSyncs++;
      result.success = true;
    }

    return result;

  } catch (error) {
    console.error('Error in specific user calendar sync:', error);
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return result;
  }
};

/**
 * Test connection for all connected users
 */
export const testAllUserConnections = async (): Promise<{
  totalUsers: number;
  workingConnections: number;
  failedConnections: string[];
}> => {
  const result = {
    totalUsers: 0,
    workingConnections: 0,
    failedConnections: [] as string[]
  };

  try {
    const connectedUsers = await getAllConnectedUsers();
    result.totalUsers = connectedUsers.length;

    for (const userConnection of connectedUsers) {
      try {
        googleCalendarOAuth.initializeWithTokens(userConnection.tokens);

        const isWorking = await googleCalendarOAuth.testConnection();
        if (isWorking) {
          result.workingConnections++;
        } else {
          result.failedConnections.push(userConnection.email);
        }
      } catch (error) {
        result.failedConnections.push(`${userConnection.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return result;
  } catch (error) {
    console.error('Error testing user connections:', error);
    return result;
  }
};
