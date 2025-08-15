// src/lib/services/documentGenerationService.ts
import {
  generateMedicalAssessmentDocument,
  appendSessionToDocument,
  appendMedicalAssessmentToDocument,
  appendDemographicsToDocument,
  shareDocument
} from './googleDocsService';
// Removed ProfessionalDocumentService import - reverting to original simple implementation
import {
  createGoogleDocumentRecord,
  getClientAssessmentDocument,
  updateGoogleDocumentRecord
} from '@/lib/firebase/googleDocs';
import { getAssessmentsByClient } from '@/lib/firebase/assessments';
import { getSessionsByClient } from '@/lib/firebase/sessions';
import { getClient, updateClient } from '@/lib/firebase/clients';
import type {
  Client,
  MedicalAssessment,
  SessionNote,
  GoogleDocumentInfo,
  DocumentGenerationRequest,
  ClientDemographics
} from '@/lib/types';
import { getApiUrl } from '@/lib/utils/api-url';

/**
 * Generate or update a client's medical assessment document using professional template
 */
export const generateClientDocument = async (
  clientId: string,
  userId: string,
  userName: string,
  tokens: any,
  options: {
    includeAllSessions?: boolean;
    sessionIds?: string[];
    forceNew?: boolean;
    useProfessionalTemplate?: boolean;
  } = {}
): Promise<{ documentId: string; documentUrl: string; isNew: boolean }> => {
  try {
    // Always use original simple implementation
    console.log('📄 Using original document template');

    // Get client data
    const client = await getClient(clientId);
    if (!client) {
      throw new Error('Client not found');
    }

    // Get assessments
    const assessments = await getAssessmentsByClient(clientId);
    
    // Get sessions if requested
    let sessions: SessionNote[] = [];
    if (options.includeAllSessions) {
      sessions = await getSessionsByClient(clientId);
    } else if (options.sessionIds && options.sessionIds.length > 0) {
      const allSessions = await getSessionsByClient(clientId);
      sessions = allSessions.filter(session => options.sessionIds!.includes(session.id));
    }

    // Check if document already exists
    const existingDoc = await getClientAssessmentDocument(clientId);
    
    if (existingDoc && !options.forceNew) {
      // Update existing document
      await updateExistingDocument(existingDoc.documentId, client, assessments, sessions);
      
      // Update the record
      await updateGoogleDocumentRecord(existingDoc.id, {
        lastUpdated: new Date().toISOString()
      });

      // Update client record
      await updateClient(clientId, {
        googleDocId: existingDoc.documentId,
        lastDocumentUpdate: new Date().toISOString()
      });

      return {
        documentId: existingDoc.documentId,
        documentUrl: existingDoc.documentUrl,
        isNew: false
      };
    } else {
      // Create new document
      const { documentId, documentUrl } = await generateMedicalAssessmentDocument(
        client, 
        assessments, 
        sessions
      );

      // Create document record
      const docRecord: Omit<GoogleDocumentInfo, 'id'> = {
        clientId: clientId,
        documentId: documentId,
        documentUrl: documentUrl,
        documentName: `${client.name} - Medical Assessment`,
        documentType: 'client_assessment',
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        createdByUserId: userId,
        createdByUserName: userName
      };

      await createGoogleDocumentRecord(docRecord);

      // Update client record
      await updateClient(clientId, {
        googleDocId: documentId,
        lastDocumentUpdate: new Date().toISOString()
      });

      // Share with client's team members if they have email addresses
      if (client.teamMemberIds && client.teamMemberIds.length > 0) {
        // Note: You would need to get team member emails from user records
        // This is a placeholder for that functionality
        console.log('TODO: Share document with team members');
      }

      return {
        documentId: documentId,
        documentUrl: documentUrl,
        isNew: true
      };
    }
  } catch (error) {
    console.error('Error generating client document:', error);
    throw new Error('Failed to generate client document');
  }
};

/**
 * Update an existing document with new data
 */
const updateExistingDocument = async (
  documentId: string,
  client: Client,
  assessments: MedicalAssessment[],
  sessions: SessionNote[]
): Promise<void> => {
  try {
    // For now, we'll append new sessions to the existing document
    // In a more sophisticated implementation, you might want to replace
    // specific sections or regenerate the entire document
    
    // Get the latest session that hasn't been added yet
    const latestSession = sessions
      .sort((a, b) => new Date(b.dateOfSession).getTime() - new Date(a.dateOfSession).getTime())[0];
    
    if (latestSession) {
      // Get the latest assessment for this session
      const sessionAssessment = assessments.find(a => 
        a.sessionId === latestSession.id || 
        new Date(a.assessmentDate).toDateString() === new Date(latestSession.dateOfSession).toDateString()
      );
      
      await appendSessionToDocument(documentId, latestSession, sessionAssessment);
    }
  } catch (error) {
    console.error('Error updating existing document:', error);
    throw new Error('Failed to update existing document');
  }
};

/**
 * Add a new session to an existing client document using original simple implementation
 */
export const addSessionToClientDocument = async (
  clientId: string,
  sessionId: string,
  userId: string,
  userName: string,
  tokens?: any,
  useProfessionalTemplate: boolean = false
): Promise<void> => {
  try {
    // Always use original simple implementation
    console.log('📄 Adding session to original document format');

    // Get the client's document
    const existingDoc = await getClientAssessmentDocument(clientId);
    if (!existingDoc) {
      console.log('No existing Google Doc found for client, creating new one with session...');

      // Get client data
      const client = await getClient(clientId);
      if (!client) {
        throw new Error('Client not found');
      }

      // Get the session data
      const sessions = await getSessionsByClient(clientId);
      const session = sessions.find(s => s.id === sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Convert session to appointment format for document generation
      const appointmentData = {
        id: session.id,
        clientId: session.clientId,
        clientName: session.clientName || client.name,
        attendingClinicianId: session.attendingClinicianId,
        attendingClinicianName: session.attendingClinicianName,
        attendingClinicianVocation: session.attendingClinicianVocation,
        type: session.sessionType || 'session',
        status: 'confirmed',
        dateOfSession: session.dateOfSession,
        duration: session.duration || 60,
        location: session.location,
        content: session.content,
        createdByUserId: userId,
        createdByUserName: userName,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      };

      // For now, let's just create a simple document and append the session
      // We'll use the original API route approach that was working
      console.log('Creating new document via original API route...');

      const response = await fetch(getApiUrl('/api/docs/create-appointment-doc'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointment: appointmentData,
          creatorUserId: userId
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ New document created with session: ${result.document?.documentId}`);
      } else {
        console.warn('⚠️ Document creation failed:', await response.text());
      }
      return;
    }

    // Get the session data
    const sessions = await getSessionsByClient(clientId);
    const session = sessions.find(s => s.id === sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Get any assessment for this session
    const assessments = await getAssessmentsByClient(clientId);
    const sessionAssessment = assessments.find(a => 
      a.sessionId === sessionId || 
      new Date(a.assessmentDate).toDateString() === new Date(session.dateOfSession).toDateString()
    );

    // Append to document
    await appendSessionToDocument(existingDoc.documentId, session, sessionAssessment);

    // Update the record
    await updateGoogleDocumentRecord(existingDoc.id, {
      lastUpdated: new Date().toISOString()
    });

    // Update client record
    await updateClient(clientId, {
      lastDocumentUpdate: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error adding session to client document:', error);
    throw new Error('Failed to add session to client document');
  }
};

/**
 * Add medical assessment to client's existing Google Doc
 */
export const addMedicalAssessmentToClientDocument = async (
  clientId: string,
  assessment: MedicalAssessment,
  userId: string,
  userName: string
): Promise<void> => {
  try {
    // Get client data
    const client = await getClient(clientId);
    if (!client) {
      throw new Error('Client not found');
    }

    // Get existing document record
    const existingDoc = await getClientAssessmentDocument(clientId);
    if (!existingDoc) {
      console.log('No existing Google Doc found for client, skipping medical assessment append...');
      console.log('ℹ️ Medical assessments can only be appended to existing documents created by sessions');
      return;
    }

    // Append assessment to document
    await appendMedicalAssessmentToDocument(existingDoc.documentId, assessment, client);

    // Update the record
    await updateGoogleDocumentRecord(existingDoc.id, {
      lastUpdated: new Date().toISOString()
    });

    // Update client record
    await updateClient(clientId, {
      lastDocumentUpdate: new Date().toISOString()
    });

    console.log(`✅ Medical assessment appended to client document: ${existingDoc.documentId}`);
  } catch (error) {
    console.error('Error adding medical assessment to client document:', error);
    throw new Error('Failed to add medical assessment to client document');
  }
};

/**
 * Add demographics update to client's existing Google Doc
 */
export const addDemographicsToClientDocument = async (
  clientId: string,
  demographics: ClientDemographics,
  userId: string,
  userName: string,
  userTokens?: any
): Promise<void> => {
  try {
    // Get client data
    const client = await getClient(clientId);
    if (!client) {
      throw new Error('Client not found');
    }

    // Get existing document record
    const existingDoc = await getClientAssessmentDocument(clientId);
    if (!existingDoc) {
      console.log('No existing Google Doc found for client, skipping demographics append...');
      console.log('ℹ️ Demographics can only be appended to existing documents created by sessions');
      return;
    }

    // Append demographics to document
    await appendDemographicsToDocument(existingDoc.documentId, demographics, client, userTokens);

    // Update the record
    await updateGoogleDocumentRecord(existingDoc.id, {
      lastUpdated: new Date().toISOString()
    });

    // Update client record
    await updateClient(clientId, {
      lastDocumentUpdate: new Date().toISOString()
    });

    console.log(`✅ Demographics appended to client document: ${existingDoc.documentId}`);
  } catch (error) {
    console.error('Error adding demographics to client document:', error);
    throw new Error('Failed to add demographics to client document');
  }
};





/**
 * Generate a progress report document
 */
export const generateProgressReport = async (
  clientId: string,
  startDate: string,
  endDate: string,
  userId: string,
  userName: string
): Promise<{ documentId: string; documentUrl: string }> => {
  try {
    // Get client data
    const client = await getClient(clientId);
    if (!client) {
      throw new Error('Client not found');
    }

    // Get assessments in date range
    const assessments = await getAssessmentsByClient(clientId);
    const filteredAssessments = assessments.filter(a => {
      const assessmentDate = new Date(a.assessmentDate);
      return assessmentDate >= new Date(startDate) && assessmentDate <= new Date(endDate);
    });

    // Get sessions in date range
    const sessions = await getSessionsByClient(clientId);
    const filteredSessions = sessions.filter(s => {
      const sessionDate = new Date(s.dateOfSession);
      return sessionDate >= new Date(startDate) && sessionDate <= new Date(endDate);
    });

    // Generate document
    const { documentId, documentUrl } = await generateMedicalAssessmentDocument(
      client, 
      filteredAssessments, 
      filteredSessions
    );

    // Create document record
    const docRecord: Omit<GoogleDocumentInfo, 'id'> = {
      clientId: clientId,
      documentId: documentId,
      documentUrl: documentUrl,
      documentName: `${client.name} - Progress Report - ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`,
      documentType: 'progress_report',
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      createdByUserId: userId,
      createdByUserName: userName
    };

    await createGoogleDocumentRecord(docRecord);

    return { documentId, documentUrl };
  } catch (error) {
    console.error('Error generating progress report:', error);
    throw new Error('Failed to generate progress report');
  }
};

/**
 * Share a client document with additional users
 */
export const shareClientDocument = async (
  clientId: string,
  emailAddresses: string[],
  role: 'reader' | 'writer' | 'commenter' = 'reader'
): Promise<void> => {
  try {
    const existingDoc = await getClientAssessmentDocument(clientId);
    if (!existingDoc) {
      throw new Error('No document found for client');
    }

    await shareDocument(existingDoc.documentId, emailAddresses, role);
  } catch (error) {
    console.error('Error sharing client document:', error);
    throw new Error('Failed to share client document');
  }
};

/**
 * Get document generation status for a client
 */
export const getClientDocumentStatus = async (clientId: string): Promise<{
  hasDocument: boolean;
  documentInfo?: GoogleDocumentInfo;
  lastUpdated?: string;
  assessmentCount: number;
  sessionCount: number;
}> => {
  try {
    const existingDoc = await getClientAssessmentDocument(clientId);
    const assessments = await getAssessmentsByClient(clientId);
    const sessions = await getSessionsByClient(clientId);

    return {
      hasDocument: !!existingDoc,
      documentInfo: existingDoc || undefined,
      lastUpdated: existingDoc?.lastUpdated,
      assessmentCount: assessments.length,
      sessionCount: sessions.length
    };
  } catch (error) {
    console.error('Error getting client document status:', error);
    throw new Error('Failed to get client document status');
  }
};

/**
 * Regenerate a client document from scratch
 */
export const regenerateClientDocument = async (
  clientId: string,
  userId: string,
  userName: string
): Promise<{ documentId: string; documentUrl: string }> => {
  return generateClientDocument(clientId, userId, userName, { 
    includeAllSessions: true, 
    forceNew: true 
  });
};

/**
 * Batch process document generation for multiple clients
 */
export const batchGenerateDocuments = async (
  clientIds: string[],
  userId: string,
  userName: string,
  options: {
    includeAllSessions?: boolean;
    forceNew?: boolean;
  } = {}
): Promise<Array<{
  clientId: string;
  success: boolean;
  documentId?: string;
  documentUrl?: string;
  error?: string;
}>> => {
  const results = [];

  for (const clientId of clientIds) {
    try {
      const result = await generateClientDocument(clientId, userId, userName, options);
      results.push({
        clientId,
        success: true,
        documentId: result.documentId,
        documentUrl: result.documentUrl
      });
    } catch (error) {
      results.push({
        clientId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return results;
};
