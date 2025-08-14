// src/lib/firebase/tasks.ts
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
import type { ToDoTask } from '@/lib/types';

const COLLECTION_NAME = 'tasks';

export const createTask = async (taskData: Omit<ToDoTask, 'id' | 'createdAt'>): Promise<ToDoTask> => {
  try {
    // Clean the data to remove undefined values that Firebase doesn't support
    const cleanTaskData: any = {
      clientId: taskData.clientId,
      description: taskData.description,
      isDone: false,
      addedByUserId: taskData.addedByUserId,
      addedByUserName: taskData.addedByUserName,
      assignedToUserIds: taskData.assignedToUserIds || [],
      assignedToUserNames: taskData.assignedToUserNames || [],
      isSystemGenerated: taskData.isSystemGenerated || false,
      createdAt: serverTimestamp(),
    };

    // Only add dueDate if it's not undefined
    if (taskData.dueDate !== undefined && taskData.dueDate !== null && taskData.dueDate !== '') {
      cleanTaskData.dueDate = taskData.dueDate;
    }

    const docRef = await addDoc(collection(db, COLLECTION_NAME), cleanTaskData);

    const newDoc = await getDoc(docRef);
    const data = newDoc.data();
    return {
      id: newDoc.id,
      ...data,
      createdAt: data?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      dueDate: data?.dueDate || undefined, // Ensure dueDate is properly handled
    } as ToDoTask;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
};

export const updateTask = async (taskId: string, updates: Partial<ToDoTask>): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, taskId);

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
    console.error('Error updating task:', error);
    throw error;
  }
};

export const deleteTask = async (taskId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, taskId));
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
};

export const getTask = async (taskId: string): Promise<ToDoTask | null> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, taskId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;
    
    const data = docSnap.data();
    return { 
      id: docSnap.id, 
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    } as ToDoTask;
  } catch (error) {
    console.error('Error getting task:', error);
    throw error;
  }
};

export const getTasksByClient = async (clientId: string): Promise<ToDoTask[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('clientId', '==', clientId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      } as ToDoTask;
    });
  } catch (error) {
    console.error('Error getting tasks by client:', error);
    throw error;
  }
};

export const getTasksByUser = async (userId: string): Promise<ToDoTask[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('assignedToUserIds', 'array-contains', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      } as ToDoTask;
    });
  } catch (error) {
    console.error('Error getting tasks by user:', error);
    throw error;
  }
};

export const getPendingTasksByUser = async (userId: string): Promise<ToDoTask[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('assignedToUserIds', 'array-contains', userId),
      where('isDone', '==', false),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      } as ToDoTask;
    });
  } catch (error) {
    console.error('Error getting pending tasks by user:', error);
    throw error;
  }
};

export const markTaskComplete = async (taskId: string, completedByUserId: string, completedByUserName: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, taskId);
    await updateDoc(docRef, {
      isDone: true,
      completedAt: serverTimestamp(),
      completedByUserId,
      completedByUserName,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error marking task complete:', error);
    throw error;
  }
};

export const markTaskIncomplete = async (taskId: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, taskId);
    await updateDoc(docRef, {
      isDone: false,
      completedAt: null,
      completedByUserId: null,
      completedByUserName: null,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error marking task incomplete:', error);
    throw error;
  }
};
