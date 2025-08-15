// src/lib/firebase/assessments.ts
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
  limit,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getApiUrl } from '@/lib/utils/api-url';
import type { 
  MedicalAssessment, 
  FuglMeyerAssessment, 
  FIMAssessment, 
  RangeOfMotionAssessment 
} from '@/lib/types';

// Collection references
const ASSESSMENTS_COLLECTION = 'medical_assessments';

// Helper function to convert Firestore data
const convertTimestamps = (data: any): any => {
  const converted = { ...data };
  
  // Convert Firestore Timestamps to ISO strings
  if (converted.assessmentDate && typeof converted.assessmentDate.toDate === 'function') {
    converted.assessmentDate = converted.assessmentDate.toDate().toISOString();
  }
  
  return converted;
};

// Helper function to prepare data for Firestore
const prepareForFirestore = (data: any): any => {
  const prepared = { ...data };
  
  // Convert ISO strings to Firestore Timestamps
  if (prepared.assessmentDate && typeof prepared.assessmentDate === 'string') {
    prepared.assessmentDate = Timestamp.fromDate(new Date(prepared.assessmentDate));
  }
  
  return prepared;
};

/**
 * Create a new medical assessment
 */
export const createMedicalAssessment = async (
  assessmentData: Omit<MedicalAssessment, 'id'>
): Promise<MedicalAssessment> => {
  try {
    const preparedData = prepareForFirestore(assessmentData);
    const docRef = await addDoc(collection(db, ASSESSMENTS_COLLECTION), preparedData);

    const newAssessment = {
      id: docRef.id,
      ...assessmentData
    };

    // 🆕 AUTO-APPEND TO GOOGLE DOC (Same as demographics)
    console.log('📄 STARTING Google Docs append for medical assessment...');
    try {
      const response = await fetch(getApiUrl('/api/documents/append'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: assessmentData.clientId,
          userId: assessmentData.assessorId,
          userName: assessmentData.assessorName,
          type: 'medical_assessment',
          data: { assessment: newAssessment }
        }),
      });

      if (response.ok) {
        console.log('✅ Medical assessment appended to Google Doc successfully');
      } else {
        console.warn('⚠️ Google Docs append failed:', await response.text());
      }
    } catch (docsError) {
      console.error('❌ Google Docs append error for medical assessment:', docsError);
      // Don't throw error - assessment should still be saved even if Google Docs fails
    }

    return newAssessment;
  } catch (error) {
    console.error('Error creating medical assessment:', error);
    throw new Error('Failed to create medical assessment');
  }
};

/**
 * Get all medical assessments for a client
 */
export const getAssessmentsByClient = async (clientId: string): Promise<MedicalAssessment[]> => {
  try {
    const q = query(
      collection(db, ASSESSMENTS_COLLECTION),
      where('clientId', '==', clientId),
      orderBy('assessmentDate', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const assessments: MedicalAssessment[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = convertTimestamps(doc.data());
      assessments.push({
        id: doc.id,
        ...data
      } as MedicalAssessment);
    });
    
    return assessments;
  } catch (error) {
    console.error('Error fetching assessments by client:', error);
    throw new Error('Failed to fetch client assessments');
  }
};

/**
 * Get a specific medical assessment by ID
 */
export const getMedicalAssessment = async (assessmentId: string): Promise<MedicalAssessment | null> => {
  try {
    const docRef = doc(db, ASSESSMENTS_COLLECTION, assessmentId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = convertTimestamps(docSnap.data());
      return {
        id: docSnap.id,
        ...data
      } as MedicalAssessment;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching medical assessment:', error);
    throw new Error('Failed to fetch medical assessment');
  }
};

/**
 * Update a medical assessment
 */
export const updateMedicalAssessment = async (
  assessmentId: string,
  updates: Partial<Omit<MedicalAssessment, 'id'>>
): Promise<void> => {
  try {
    const preparedUpdates = prepareForFirestore(updates);
    const docRef = doc(db, ASSESSMENTS_COLLECTION, assessmentId);
    await updateDoc(docRef, preparedUpdates);
  } catch (error) {
    console.error('Error updating medical assessment:', error);
    throw new Error('Failed to update medical assessment');
  }
};

/**
 * Delete a medical assessment
 */
export const deleteMedicalAssessment = async (assessmentId: string): Promise<void> => {
  try {
    const docRef = doc(db, ASSESSMENTS_COLLECTION, assessmentId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting medical assessment:', error);
    throw new Error('Failed to delete medical assessment');
  }
};

/**
 * Get latest assessment of each type for a client
 */
export const getLatestAssessmentsByClient = async (clientId: string): Promise<{
  fuglMeyer?: FuglMeyerAssessment;
  fim?: FIMAssessment;
  rangeOfMotion?: RangeOfMotionAssessment;
}> => {
  try {
    const assessments = await getAssessmentsByClient(clientId);
    
    const latestFuglMeyer = assessments
      .filter(a => a.fuglMeyer)
      .sort((a, b) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime())[0]?.fuglMeyer;
      
    const latestFIM = assessments
      .filter(a => a.fim)
      .sort((a, b) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime())[0]?.fim;
      
    const latestROM = assessments
      .filter(a => a.rangeOfMotion)
      .sort((a, b) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime())[0]?.rangeOfMotion;
    
    return {
      fuglMeyer: latestFuglMeyer,
      fim: latestFIM,
      rangeOfMotion: latestROM
    };
  } catch (error) {
    console.error('Error fetching latest assessments:', error);
    throw new Error('Failed to fetch latest assessments');
  }
};

/**
 * Get assessments by date range
 */
export const getAssessmentsByDateRange = async (
  clientId: string,
  startDate: string,
  endDate: string
): Promise<MedicalAssessment[]> => {
  try {
    const q = query(
      collection(db, ASSESSMENTS_COLLECTION),
      where('clientId', '==', clientId),
      where('assessmentDate', '>=', Timestamp.fromDate(new Date(startDate))),
      where('assessmentDate', '<=', Timestamp.fromDate(new Date(endDate))),
      orderBy('assessmentDate', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const assessments: MedicalAssessment[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = convertTimestamps(doc.data());
      assessments.push({
        id: doc.id,
        ...data
      } as MedicalAssessment);
    });
    
    return assessments;
  } catch (error) {
    console.error('Error fetching assessments by date range:', error);
    throw new Error('Failed to fetch assessments by date range');
  }
};

/**
 * Get all assessments (for admin purposes)
 */
export const getAllMedicalAssessments = async (): Promise<MedicalAssessment[]> => {
  try {
    const q = query(
      collection(db, ASSESSMENTS_COLLECTION),
      orderBy('assessmentDate', 'desc'),
      limit(100) // Limit to prevent large data loads
    );
    
    const querySnapshot = await getDocs(q);
    const assessments: MedicalAssessment[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = convertTimestamps(doc.data());
      assessments.push({
        id: doc.id,
        ...data
      } as MedicalAssessment);
    });
    
    return assessments;
  } catch (error) {
    console.error('Error fetching all medical assessments:', error);
    throw new Error('Failed to fetch all medical assessments');
  }
};

/**
 * Get assessment statistics for a client
 */
export const getAssessmentStats = async (clientId: string): Promise<{
  totalAssessments: number;
  fuglMeyerCount: number;
  fimCount: number;
  romCount: number;
  latestAssessmentDate?: string;
  firstAssessmentDate?: string;
}> => {
  try {
    const assessments = await getAssessmentsByClient(clientId);
    
    const fuglMeyerCount = assessments.filter(a => a.fuglMeyer).length;
    const fimCount = assessments.filter(a => a.fim).length;
    const romCount = assessments.filter(a => a.rangeOfMotion).length;
    
    const dates = assessments.map(a => new Date(a.assessmentDate).getTime()).sort();
    
    return {
      totalAssessments: assessments.length,
      fuglMeyerCount,
      fimCount,
      romCount,
      latestAssessmentDate: dates.length > 0 ? new Date(dates[dates.length - 1]).toISOString() : undefined,
      firstAssessmentDate: dates.length > 0 ? new Date(dates[0]).toISOString() : undefined
    };
  } catch (error) {
    console.error('Error fetching assessment stats:', error);
    throw new Error('Failed to fetch assessment statistics');
  }
};
