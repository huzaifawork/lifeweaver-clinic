// src/lib/firebase/appointments.ts
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import type { Appointment } from '@/lib/types';
import { getApiUrl } from '@/lib/utils/api-url';
import { appointmentToCalendarEvent, extractAppointmentIdFromEvent, isLWVClinicEvent, syncAppointmentWithCalendarEvent } from '@/lib/utils/appointmentCalendarSync';

const COLLECTION_NAME = 'appointments';

export const createAppointment = async (appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Appointment> => {
  try {
    // First create the appointment in Firestore
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...appointmentData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const newDoc = await getDoc(docRef);
    const appointment = {
      id: newDoc.id,
      ...newDoc.data(),
      createdAt: newDoc.data()?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: newDoc.data()?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
    } as Appointment;

    // Sync with Google Calendar - Multi-user sync
    console.log('🔄 STARTING Google Calendar sync...', {
      isServer: typeof window === 'undefined',
      appointmentId: appointment.id,
      createdBy: appointment.createdByUserId,
      clientName: appointment.clientName,
      dateOfSession: appointment.dateOfSession
    });

    try {
      console.log('📡 Making API call to sync-appointment endpoint...');

      // Try to sync via API call (works both client and server side)
      const response = await fetch(getApiUrl('/api/calendar/sync-appointment'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointment,
          operation: 'create',
          creatorUserId: appointment.createdByUserId
        }),
      });

      console.log('📡 API Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('📡 API Response data:', result);

        if (result.success && result.eventId) {
          await updateDoc(docRef, {
            googleCalendarEventId: result.eventId,
            updatedAt: serverTimestamp(),
          });
          appointment.googleCalendarEventId = result.eventId;
          console.log(`✅ SUCCESS! Appointment synced to ${result.successfulSyncs || 0}/${result.totalUsers || 0} users' calendars`);
          console.log(`📅 Google Calendar Event ID: ${result.eventId}`);
        } else {
          console.warn('⚠️ API returned success=false:', result.errors || result.message);
        }
      } else {
        const errorText = await response.text();
        console.warn('⚠️ Sync API call failed:', response.status, errorText);
      }

      // 🆕 AUTO-CREATE GOOGLE DOC FOR APPOINTMENT
      console.log('📄 STARTING Google Docs creation...');
      try {
        const docsResponse = await fetch(getApiUrl('/api/docs/create-appointment-doc'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            appointment,
            creatorUserId: appointment.createdByUserId
          }),
        });

        if (docsResponse.ok) {
          const docsResult = await docsResponse.json();
          console.log('📄 Google Doc created successfully:', docsResult);

          // Update appointment with Google Doc ID
          if (docsResult.success && docsResult.document) {
            await updateDoc(docRef, {
              googleDocumentId: docsResult.document.documentId,
              googleDocumentUrl: docsResult.document.documentUrl,
              updatedAt: serverTimestamp(),
            });
            console.log(`✅ Appointment linked to Google Doc: ${docsResult.document.documentId}`);
          }
        } else {
          const docsErrorText = await docsResponse.text();
          console.warn('⚠️ Google Docs creation failed:', docsResponse.status, docsErrorText);
        }
      } catch (docsError) {
        console.error('❌ Google Docs creation error:', docsError);
      }
    } catch (calendarError) {
      console.error('❌ Google Calendar sync error:', calendarError);
      console.error('❌ Error details:', {
        message: calendarError instanceof Error ? calendarError.message : 'Unknown error',
        stack: calendarError instanceof Error ? calendarError.stack : undefined
      });
      // Don't throw error - appointment was created successfully in Firestore
    }

    console.log('🏁 Google Calendar sync attempt completed');

    return appointment;
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }
};

export const updateAppointment = async (id: string, updates: Partial<Omit<Appointment, 'id' | 'createdAt'>>): Promise<void> => {
  try {
    // Get the current appointment to check for Google Calendar event ID
    const appointmentDoc = await getDoc(doc(db, COLLECTION_NAME, id));
    if (!appointmentDoc.exists()) {
      throw new Error('Appointment not found');
    }

    const currentAppointment = { id: appointmentDoc.id, ...appointmentDoc.data() } as Appointment;

    // Clean the updates to remove undefined values
    const cleanUpdates: any = {
      updatedAt: serverTimestamp(),
    };

    // Only add fields that are not undefined
    Object.keys(updates).forEach(key => {
      const value = (updates as any)[key];
      if (value !== undefined && value !== null) {
        cleanUpdates[key] = value;
      }
    });

    // Update in Firestore
    await updateDoc(doc(db, COLLECTION_NAME, id), cleanUpdates);

    // Sync with Google Calendar if event exists - Multi-user sync
    if (currentAppointment.googleCalendarEventId) {
      try {
        const updatedAppointment = { ...currentAppointment, ...updates };

        const response = await fetch(getApiUrl('/api/calendar/sync-appointment'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            appointment: updatedAppointment,
            operation: 'update',
            creatorUserId: currentAppointment.createdByUserId
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Appointment updated in ${result.successfulSyncs || 0} users' calendars`);
        } else {
          console.warn('⚠️ Failed to update appointment in calendars');
        }
      } catch (calendarError) {
        console.error('❌ Google Calendar update error:', calendarError);
        // Don't throw error - appointment was updated successfully in Firestore
      }
    }
  } catch (error) {
    console.error('Error updating appointment:', error);
    throw error;
  }
};

export const deleteAppointment = async (id: string): Promise<void> => {
  try {
    // Get the appointment to check for Google Calendar event ID
    const appointmentDoc = await getDoc(doc(db, COLLECTION_NAME, id));
    if (!appointmentDoc.exists()) {
      throw new Error('Appointment not found');
    }

    const appointment = { id: appointmentDoc.id, ...appointmentDoc.data() } as Appointment;

    // Delete from Google Calendar first if event exists - Multi-user sync
    if (appointment.googleCalendarEventId) {
      try {
        const response = await fetch(getApiUrl('/api/calendar/sync-appointment'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            appointment,
            operation: 'delete',
            creatorUserId: appointment.createdByUserId
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Appointment deleted from ${result.successfulSyncs || 0} users' calendars`);
        } else {
          console.warn('⚠️ Failed to delete appointment from calendars');
        }
      } catch (calendarError) {
        console.error('❌ Google Calendar delete error:', calendarError);
        // Continue with Firestore deletion even if Google Calendar fails
      }
    }

    // Delete from Firestore
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    console.error('Error deleting appointment:', error);
    throw error;
  }
};

export const getAppointment = async (id: string): Promise<Appointment | null> => {
  try {
    const docSnap = await getDoc(doc(db, COLLECTION_NAME, id));
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      } as Appointment;
    }
    return null;
  } catch (error) {
    console.error('Error getting appointment:', error);
    throw error;
  }
};

export const getAllAppointments = async (): Promise<Appointment[]> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('dateOfSession', 'asc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      } as Appointment;
    });
  } catch (error) {
    console.error('Error getting appointments:', error);
    throw error;
  }
};

export const getAppointmentsByClient = async (clientId: string): Promise<Appointment[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME), 
      where('clientId', '==', clientId),
      orderBy('dateOfSession', 'asc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      } as Appointment;
    });
  } catch (error) {
    console.error('Error getting appointments by client:', error);
    throw error;
  }
};

export const getAppointmentsByClinician = async (clinicianId: string): Promise<Appointment[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME), 
      where('attendingClinicianId', '==', clinicianId),
      orderBy('dateOfSession', 'asc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      } as Appointment;
    });
  } catch (error) {
    console.error('Error getting appointments by clinician:', error);
    throw error;
  }
};

export const getAppointmentsByDateRange = async (startDate: string, endDate: string): Promise<Appointment[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('dateOfSession', '>=', startDate),
      where('dateOfSession', '<=', endDate),
      orderBy('dateOfSession', 'asc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      } as Appointment;
    });
  } catch (error) {
    console.error('Error getting appointments by date range:', error);
    throw error;
  }
};

/**
 * Sync appointments with Google Calendar
 * This function fetches events from Google Calendar and updates local appointments
 */
export const syncWithGoogleCalendar = async (): Promise<{
  synced: number;
  updated: number;
  errors: string[];
}> => {
  const results = {
    synced: 0,
    updated: 0,
    errors: [] as string[]
  };

  try {
    // Fetch events from Google Calendar via API (server-side only)
    const response = await fetch(getApiUrl('/api/calendar/events'));
    if (!response.ok) {
      throw new Error('Failed to fetch Google Calendar events');
    }

    const { events } = await response.json();

    // Get all local appointments
    const localAppointments = await getAllAppointments();
    const appointmentMap = new Map(localAppointments.map(apt => [apt.googleCalendarEventId, apt]));

    for (const event of events) {
      try {
        // Only process events created by our system
        if (!isLWVClinicEvent(event.description)) {
          continue;
        }

        const appointmentId = extractAppointmentIdFromEvent(event.description);
        if (!appointmentId) {
          continue;
        }

        // Find the corresponding local appointment
        const localAppointment = appointmentMap.get(event.id);

        if (localAppointment) {
          // Check if the event was updated in Google Calendar
          const updates = syncAppointmentWithCalendarEvent(localAppointment, event);

          if (Object.keys(updates).length > 0) {
            await updateDoc(doc(db, COLLECTION_NAME, localAppointment.id), {
              ...updates,
              updatedAt: serverTimestamp(),
            });
            results.updated++;
            console.log(`✅ Updated appointment ${localAppointment.id} from Google Calendar`);
          }
        }

        results.synced++;
      } catch (eventError) {
        const errorMsg = `Error processing event ${event.id}: ${eventError}`;
        console.error(errorMsg);
        results.errors.push(errorMsg);
      }
    }

    console.log(`📅 Google Calendar sync complete: ${results.synced} synced, ${results.updated} updated`);
    return results;
  } catch (error) {
    const errorMsg = `Google Calendar sync failed: ${error}`;
    console.error(errorMsg);
    results.errors.push(errorMsg);
    return results;
  }
};
