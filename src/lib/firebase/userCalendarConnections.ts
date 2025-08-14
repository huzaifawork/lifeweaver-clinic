// src/lib/firebase/userCalendarConnections.ts
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import type { UserCalendarConnection, GoogleCalendarTokens } from '@/lib/google-calendar-oauth';

const COLLECTION_NAME = 'userCalendarConnections';

/**
 * Save user's Google Calendar connection
 */
export const saveUserCalendarConnection = async (
  userId: string,
  email: string,
  tokens: GoogleCalendarTokens
): Promise<void> => {
  try {
    const connectionData: Omit<UserCalendarConnection, 'userId'> = {
      email,
      tokens,
      connectedAt: new Date().toISOString(),
      lastSyncAt: new Date().toISOString(),
    };

    await setDoc(doc(db, COLLECTION_NAME, userId), {
      ...connectionData,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log('✅ User calendar connection saved:', userId);
  } catch (error) {
    console.error('Error saving user calendar connection:', error);
    throw error;
  }
};

/**
 * Get user's Google Calendar connection
 */
export const getUserCalendarConnection = async (
  userId: string
): Promise<UserCalendarConnection | null> => {
  try {
    const docSnap = await getDoc(doc(db, COLLECTION_NAME, userId));
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        userId: data.userId,
        email: data.email,
        tokens: data.tokens,
        connectedAt: data.connectedAt,
        lastSyncAt: data.lastSyncAt,
      } as UserCalendarConnection;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user calendar connection:', error);
    throw error;
  }
};

/**
 * Update user's calendar tokens (for token refresh)
 */
export const updateUserCalendarTokens = async (
  userId: string,
  tokens: GoogleCalendarTokens
): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, userId);
    await setDoc(docRef, {
      tokens,
      lastSyncAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    console.log('✅ User calendar tokens updated:', userId);
  } catch (error) {
    console.error('Error updating user calendar tokens:', error);
    throw error;
  }
};

/**
 * Get all connected users for multi-calendar sync
 */
export const getAllConnectedUsers = async (): Promise<UserCalendarConnection[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    const connections: UserCalendarConnection[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      connections.push({
        userId: data.userId,
        email: data.email,
        tokens: data.tokens,
        connectedAt: data.connectedAt,
        lastSyncAt: data.lastSyncAt,
      });
    });

    return connections;
  } catch (error) {
    console.error('Error getting all connected users:', error);
    throw error;
  }
};

/**
 * Remove user's calendar connection
 */
export const removeUserCalendarConnection = async (userId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, userId));
    console.log('✅ User calendar connection removed:', userId);
  } catch (error) {
    console.error('Error removing user calendar connection:', error);
    throw error;
  }
};

/**
 * Check if user has connected their calendar
 */
export const isUserCalendarConnected = async (userId: string): Promise<boolean> => {
  try {
    const connection = await getUserCalendarConnection(userId);
    return connection !== null;
  } catch (error) {
    console.error('Error checking user calendar connection:', error);
    return false;
  }
};

/**
 * Update last sync time for user
 */
export const updateUserLastSync = async (userId: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, userId);
    await setDoc(docRef, {
      lastSyncAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error('Error updating user last sync:', error);
    throw error;
  }
};

/**
 * Get users by email (for finding specific users)
 */
export const getUserConnectionByEmail = async (
  email: string
): Promise<UserCalendarConnection | null> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        userId: data.userId,
        email: data.email,
        tokens: data.tokens,
        connectedAt: data.connectedAt,
        lastSyncAt: data.lastSyncAt,
      } as UserCalendarConnection;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user connection by email:', error);
    throw error;
  }
};
