// src/lib/firebase/sessions.ts
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
} from 'firebase/firestore';
import type { SessionNote } from '@/lib/types';
import { getApiUrl } from '@/lib/utils/api-url';

const COLLECTION_NAME = 'sessions';

// Helper function to clean undefined values from session data
const cleanSessionData = (data: any) => {
  const cleaned: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

export const createSession = async (sessionData: Omit<SessionNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<SessionNote> => {
  try {
    // Get the next session number for this client
    const clientSessionsQuery = query(
      collection(db, COLLECTION_NAME),
      where('clientId', '==', sessionData.clientId)
    );
    const clientSessionsSnapshot = await getDocs(clientSessionsQuery);
    const sessionNumber = clientSessionsSnapshot.size + 1;

    // Clean the session data to remove undefined values
    const cleanedData = cleanSessionData({
      ...sessionData,
      sessionNumber,
      attachments: sessionData.attachments || [],
      // Ensure required fields have default values
      attendingClinicianVocation: sessionData.attendingClinicianVocation || 'Therapist',
      sessionType: sessionData.sessionType || 'therapy',
      duration: sessionData.duration || 60,
      location: sessionData.location || 'TBD'
    });

    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...cleanedData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const newDoc = await getDoc(docRef);
    const data = newDoc.data();
    const session = {
      id: newDoc.id,
      ...data,
      createdAt: data?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    } as SessionNote;

    // Sync with Google Calendar - Multi-user sync
    console.log('🔄 STARTING Google Calendar sync for session...', {
      sessionId: session.id,
      createdBy: session.createdByUserId,
      clientName: session.clientName,
      dateOfSession: session.dateOfSession
    });

    try {
      console.log('📡 Making API call to sync-appointment endpoint...');

      // Convert session to appointment format for calendar sync
      const appointmentData = {
        id: session.id,
        clientId: session.clientId,
        clientName: session.clientName,
        attendingClinicianId: session.attendingClinicianId,
        attendingClinicianName: session.attendingClinicianName,
        attendingClinicianVocation: session.attendingClinicianVocation,
        type: session.sessionType || 'therapy',
        status: 'confirmed',
        dateOfSession: session.dateOfSession,
        duration: session.duration || 60,
        location: session.location || 'TBD',
        content: session.content,
        createdByUserId: session.createdByUserId,
        createdByUserName: session.createdByUserName,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      };

      // Try to sync via API call (works both client and server side)
      const response = await fetch(getApiUrl('/api/calendar/sync-appointment'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointment: appointmentData,
          operation: 'create',
          creatorUserId: session.createdByUserId
        }),
      });

      console.log('📡 API Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('📡 API Response data:', result);

        if (result.success && result.eventId) {
          // Update the session with Google Calendar event ID
          await updateDoc(docRef, {
            googleCalendarEventId: result.eventId,
            updatedAt: serverTimestamp(),
          });
          console.log(`✅ SUCCESS! Session synced to ${result.successfulSyncs || 0}/${result.totalUsers || 0} users' calendars`);
          console.log(`📅 Google Calendar Event ID: ${result.eventId}`);
        } else {
          console.warn('⚠️ API returned success=false:', result.errors || result.message);
        }
      } else {
        const errorText = await response.text();
        console.warn('⚠️ Sync API call failed:', response.status, errorText);
      }
    } catch (calendarError) {
      console.error('❌ Google Calendar sync error:', calendarError);
      console.error('❌ Error details:', {
        message: calendarError instanceof Error ? calendarError.message : 'Unknown error',
        stack: calendarError instanceof Error ? calendarError.stack : undefined
      });
      // Don't throw error - session was created successfully in Firestore
    }

    console.log('🏁 Google Calendar sync attempt completed for session');

    // 🆕 AUTO-APPEND SESSION TO CLIENT'S GOOGLE DOC (via API route)
    console.log('📄 STARTING Google Docs append for session...');
    try {
      const response = await fetch(getApiUrl('/api/documents/append'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: session.clientId,
          userId: session.createdByUserId || session.attendingClinicianId,
          userName: session.createdByUserName || session.attendingClinicianName,
          type: 'session',
          data: { sessionId: session.id }
        }),
      });

      if (response.ok) {
        console.log('✅ Session appended to Google Doc successfully');
      } else {
        console.warn('⚠️ Google Docs append failed:', await response.text());
      }
    } catch (docsError) {
      console.error('❌ Google Docs append error for session:', docsError);
      // Don't throw error - session should still be saved even if Google Docs fails
    }

    return session;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
};

export const updateSession = async (sessionId: string, updates: Partial<SessionNote>): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, sessionId);

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

    await updateDoc(docRef, cleanUpdates);
  } catch (error) {
    console.error('Error updating session:', error);
    throw error;
  }
};

export const deleteSession = async (sessionId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, sessionId));
  } catch (error) {
    console.error('Error deleting session:', error);
    throw error;
  }
};

export const getSession = async (sessionId: string): Promise<SessionNote | null> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, sessionId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;
    
    const data = docSnap.data();
    return { 
      id: docSnap.id, 
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    } as SessionNote;
  } catch (error) {
    console.error('Error getting session:', error);
    throw error;
  }
};

export const getSessionsByClient = async (clientId: string): Promise<SessionNote[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('clientId', '==', clientId),
      orderBy('dateOfSession', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      } as SessionNote;
    });
  } catch (error) {
    console.error('Error getting sessions by client:', error);
    throw error;
  }
};

export const getSessionsByClinician = async (clinicianId: string): Promise<SessionNote[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('attendingClinicianId', '==', clinicianId),
      orderBy('dateOfSession', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      } as SessionNote;
    });
  } catch (error) {
    console.error('Error getting sessions by clinician:', error);
    throw error;
  }
};

export const getSessionById = async (sessionId: string): Promise<SessionNote | null> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, sessionId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        dateOfSession: data.dateOfSession || new Date().toISOString(),
        attachments: data.attachments || []
      } as SessionNote;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting session by ID:', error);
    throw error;
  }
};

export const getAllSessions = async (): Promise<SessionNote[]> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('dateOfSession', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      } as SessionNote;
    });
  } catch (error) {
    console.error('Error getting all sessions:', error);
    throw error;
  }
};

export const getRecentSessions = async (limit: number = 10): Promise<SessionNote[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('dateOfSession', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.slice(0, limit).map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      } as SessionNote;
    });
  } catch (error) {
    console.error('Error getting recent sessions:', error);
    throw error;
  }
};
