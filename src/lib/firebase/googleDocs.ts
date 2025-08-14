// src/lib/firebase/googleDocs.ts
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { GoogleDocumentInfo, DocumentGenerationRequest } from '@/lib/types';

// Collection references
const GOOGLE_DOCS_COLLECTION = 'google_documents';

// Helper function to convert Firestore data
const convertTimestamps = (data: any): any => {
  const converted = { ...data };
  
  // Convert Firestore Timestamps to ISO strings
  if (converted.createdAt && typeof converted.createdAt.toDate === 'function') {
    converted.createdAt = converted.createdAt.toDate().toISOString();
  }
  if (converted.lastUpdated && typeof converted.lastUpdated.toDate === 'function') {
    converted.lastUpdated = converted.lastUpdated.toDate().toISOString();
  }
  
  return converted;
};

// Helper function to prepare data for Firestore
const prepareForFirestore = (data: any): any => {
  const prepared = { ...data };
  
  // Convert ISO strings to Firestore Timestamps
  if (prepared.createdAt && typeof prepared.createdAt === 'string') {
    prepared.createdAt = Timestamp.fromDate(new Date(prepared.createdAt));
  }
  if (prepared.lastUpdated && typeof prepared.lastUpdated === 'string') {
    prepared.lastUpdated = Timestamp.fromDate(new Date(prepared.lastUpdated));
  }
  
  return prepared;
};

/**
 * Create a new Google Document record
 */
export const createGoogleDocumentRecord = async (
  docInfo: Omit<GoogleDocumentInfo, 'id'>
): Promise<GoogleDocumentInfo> => {
  try {
    const preparedData = prepareForFirestore(docInfo);
    const docRef = await addDoc(collection(db, GOOGLE_DOCS_COLLECTION), preparedData);
    
    return {
      id: docRef.id,
      ...docInfo
    };
  } catch (error) {
    console.error('Error creating Google Document record:', error);
    throw new Error('Failed to create Google Document record');
  }
};

/**
 * Get all Google Documents for a client
 */
export const getGoogleDocumentsByClient = async (clientId: string): Promise<GoogleDocumentInfo[]> => {
  try {
    // Simplified query to avoid index requirement - just filter by clientId
    const q = query(
      collection(db, GOOGLE_DOCS_COLLECTION),
      where('clientId', '==', clientId)
    );

    const querySnapshot = await getDocs(q);
    const documents: GoogleDocumentInfo[] = [];

    querySnapshot.forEach((doc) => {
      const data = convertTimestamps(doc.data());
      documents.push({
        id: doc.id,
        ...data
      } as GoogleDocumentInfo);
    });

    // Sort in memory to avoid index requirement
    documents.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());

    return documents;
  } catch (error) {
    console.error('Error fetching Google Documents by client:', error);
    throw new Error('Failed to fetch client Google Documents');
  }
};

/**
 * Get a specific Google Document record by ID
 */
export const getGoogleDocumentRecord = async (recordId: string): Promise<GoogleDocumentInfo | null> => {
  try {
    const docRef = doc(db, GOOGLE_DOCS_COLLECTION, recordId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = convertTimestamps(docSnap.data());
      return {
        id: docSnap.id,
        ...data
      } as GoogleDocumentInfo;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching Google Document record:', error);
    throw new Error('Failed to fetch Google Document record');
  }
};

/**
 * Update a Google Document record
 */
export const updateGoogleDocumentRecord = async (
  recordId: string,
  updates: Partial<Omit<GoogleDocumentInfo, 'id'>>
): Promise<void> => {
  try {
    const preparedUpdates = prepareForFirestore(updates);
    const docRef = doc(db, GOOGLE_DOCS_COLLECTION, recordId);
    await updateDoc(docRef, preparedUpdates);
  } catch (error) {
    console.error('Error updating Google Document record:', error);
    throw new Error('Failed to update Google Document record');
  }
};

/**
 * Get the main assessment document for a client
 */
export const getClientAssessmentDocument = async (clientId: string): Promise<GoogleDocumentInfo | null> => {
  try {
    // First check the appointmentDocuments collection (where sessions create docs)
    const appointmentQuery = query(
      collection(db, 'appointmentDocuments'),
      where('clientId', '==', clientId)
    );

    const appointmentSnapshot = await getDocs(appointmentQuery);

    if (!appointmentSnapshot.empty) {
      // Get the most recent appointment document
      const docs = appointmentSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...convertTimestamps(doc.data())
        } as GoogleDocumentInfo))
        .sort((a, b) => new Date(b.createdAt || b.lastUpdated).getTime() - new Date(a.createdAt || a.lastUpdated).getTime());

      if (docs.length > 0) {
        console.log(`Found appointment document for client ${clientId}:`, docs[0].documentId);
        return docs[0];
      }
    }

    // Fallback: check the google_documents collection
    const googleDocsQuery = query(
      collection(db, GOOGLE_DOCS_COLLECTION),
      where('clientId', '==', clientId)
    );

    const googleDocsSnapshot = await getDocs(googleDocsQuery);

    if (!googleDocsSnapshot.empty) {
      const docs = googleDocsSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...convertTimestamps(doc.data())
        } as GoogleDocumentInfo))
        .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());

      if (docs.length > 0) {
        console.log(`Found google document for client ${clientId}:`, docs[0].documentId);
        return docs[0];
      }
    }

    console.log(`No documents found for client ${clientId}`);
    return null;
  } catch (error) {
    console.error('Error fetching client assessment document:', error);
    throw new Error('Failed to fetch client assessment document');
  }
};

/**
 * Check if a client has an existing assessment document
 */
export const hasClientAssessmentDocument = async (clientId: string): Promise<boolean> => {
  try {
    const document = await getClientAssessmentDocument(clientId);
    return document !== null;
  } catch (error) {
    console.error('Error checking for client assessment document:', error);
    return false;
  }
};

/**
 * Get all Google Documents (for admin purposes)
 */
export const getAllGoogleDocuments = async (): Promise<GoogleDocumentInfo[]> => {
  try {
    const q = query(
      collection(db, GOOGLE_DOCS_COLLECTION),
      orderBy('lastUpdated', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const documents: GoogleDocumentInfo[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = convertTimestamps(doc.data());
      documents.push({
        id: doc.id,
        ...data
      } as GoogleDocumentInfo);
    });
    
    return documents;
  } catch (error) {
    console.error('Error fetching all Google Documents:', error);
    throw new Error('Failed to fetch all Google Documents');
  }
};

/**
 * Get documents by type
 */
export const getDocumentsByType = async (
  documentType: GoogleDocumentInfo['documentType']
): Promise<GoogleDocumentInfo[]> => {
  try {
    const q = query(
      collection(db, GOOGLE_DOCS_COLLECTION),
      where('documentType', '==', documentType),
      orderBy('lastUpdated', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const documents: GoogleDocumentInfo[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = convertTimestamps(doc.data());
      documents.push({
        id: doc.id,
        ...data
      } as GoogleDocumentInfo);
    });
    
    return documents;
  } catch (error) {
    console.error('Error fetching documents by type:', error);
    throw new Error('Failed to fetch documents by type');
  }
};

/**
 * Get document statistics
 */
export const getDocumentStats = async (): Promise<{
  totalDocuments: number;
  clientAssessments: number;
  sessionNotes: number;
  progressReports: number;
  documentsThisMonth: number;
}> => {
  try {
    const allDocs = await getAllGoogleDocuments();
    
    const clientAssessments = allDocs.filter(doc => doc.documentType === 'client_assessment').length;
    const sessionNotes = allDocs.filter(doc => doc.documentType === 'session_notes').length;
    const progressReports = allDocs.filter(doc => doc.documentType === 'progress_report').length;
    
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const documentsThisMonth = allDocs.filter(doc => 
      new Date(doc.createdAt) >= thisMonth
    ).length;
    
    return {
      totalDocuments: allDocs.length,
      clientAssessments,
      sessionNotes,
      progressReports,
      documentsThisMonth
    };
  } catch (error) {
    console.error('Error fetching document stats:', error);
    throw new Error('Failed to fetch document statistics');
  }
};
