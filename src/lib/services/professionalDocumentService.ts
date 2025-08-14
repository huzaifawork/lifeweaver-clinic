// src/lib/services/professionalDocumentService.ts
import { EnhancedGoogleDocsService } from './enhancedGoogleDocsService';
import { getClient } from '@/lib/firebase/clients';
import { getSessionsByClient } from '@/lib/firebase/sessions';
import { getAssessmentsByClient } from '@/lib/firebase/assessments';
import { createGoogleDocumentRecord, updateGoogleDocumentRecord, getClientAssessmentDocument } from '@/lib/firebase/googleDocs';
import { updateClient } from '@/lib/firebase/clients';
import type { Client, SessionNote, MedicalAssessment } from '@/lib/types';

/**
 * Professional Document Service
 * Handles creation and management of professional medical documents with exact MD structure
 */
export class ProfessionalDocumentService {
  
  /**
   * Generate or update a professional medical document for a client
   */
  static async generateProfessionalDocument(
    clientId: string,
    userId: string,
    userName: string,
    tokens: any
  ): Promise<{ documentId: string; documentUrl: string; isNew: boolean }> {
    try {
      console.log('🏥 Starting professional document generation for client:', clientId);

      // Get client data
      const client = await getClient(clientId);
      if (!client) {
        throw new Error('Client not found');
      }

      // Get all sessions for this client (sorted chronologically)
      const sessions = await getSessionsByClient(clientId);
      const sortedSessions = sessions.sort((a, b) => 
        new Date(a.dateOfSession).getTime() - new Date(b.dateOfSession).getTime()
      );

      // Get all assessments for this client
      const assessments = await getAssessmentsByClient(clientId);

      // Check if document already exists
      const existingDoc = await getClientAssessmentDocument(clientId);
      
      if (existingDoc) {
        console.log('📄 Updating existing professional document:', existingDoc.documentId);
        
        // Update existing document
        const enhancedService = new EnhancedGoogleDocsService(tokens);
        
        // For now, we'll recreate the document to ensure latest structure
        // In future, we could implement incremental updates
        const { documentId, documentUrl } = await enhancedService.createProfessionalMedicalDocument(
          client,
          sortedSessions,
          assessments
        );

        // Update the record
        await updateGoogleDocumentRecord(existingDoc.id, {
          documentId,
          documentUrl,
          lastUpdated: new Date().toISOString(),
          updatedBy: userName
        });

        // Update client record with new document ID
        await updateClient(clientId, {
          googleDocId: documentId,
          lastDocumentUpdate: new Date().toISOString()
        });

        return { documentId, documentUrl, isNew: false };
      } else {
        console.log('📄 Creating new professional document for client:', client.name);
        
        // Create new document
        const enhancedService = new EnhancedGoogleDocsService(tokens);
        const { documentId, documentUrl } = await enhancedService.createProfessionalMedicalDocument(
          client,
          sortedSessions,
          assessments
        );

        // Create document record
        await createGoogleDocumentRecord({
          clientId,
          documentId,
          documentUrl,
          documentType: 'medical_assessment',
          title: `${client.name} - Medical Assessment`,
          createdBy: userName,
          lastUpdated: new Date().toISOString(),
          updatedBy: userName
        });

        // Update client record
        await updateClient(clientId, {
          googleDocId: documentId,
          lastDocumentUpdate: new Date().toISOString()
        });

        console.log('✅ Professional document created successfully:', documentId);
        return { documentId, documentUrl, isNew: true };
      }
    } catch (error) {
      console.error('❌ Error generating professional document:', error);
      throw new Error(`Failed to generate professional document: ${error}`);
    }
  }

  /**
   * Append a new session to existing professional document
   */
  static async appendSessionToProfessionalDocument(
    clientId: string,
    sessionId: string,
    userId: string,
    userName: string,
    tokens: any
  ): Promise<void> {
    try {
      console.log('📄 Appending session to professional document:', { clientId, sessionId });

      // Get the existing document
      const existingDoc = await getClientAssessmentDocument(clientId);
      if (!existingDoc) {
        console.log('No existing document found, creating new professional document...');
        await this.generateProfessionalDocument(clientId, userId, userName, tokens);
        return;
      }

      // Get session data
      const sessions = await getSessionsByClient(clientId);
      const session = sessions.find(s => s.id === sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Get client data
      const client = await getClient(clientId);
      if (!client) {
        throw new Error('Client not found');
      }

      // For now, regenerate the entire document to maintain structure
      // This ensures all sessions are properly numbered and formatted
      await this.generateProfessionalDocument(clientId, userId, userName, tokens);

      console.log('✅ Session appended to professional document successfully');
    } catch (error) {
      console.error('❌ Error appending session to professional document:', error);
      throw new Error(`Failed to append session: ${error}`);
    }
  }

  /**
   * Append medical assessment data to professional document
   */
  static async appendAssessmentToProfessionalDocument(
    clientId: string,
    assessmentId: string,
    userId: string,
    userName: string,
    tokens: any
  ): Promise<void> {
    try {
      console.log('📄 Appending assessment to professional document:', { clientId, assessmentId });

      // Get the existing document
      const existingDoc = await getClientAssessmentDocument(clientId);
      if (!existingDoc) {
        console.log('No existing document found, creating new professional document...');
        await this.generateProfessionalDocument(clientId, userId, userName, tokens);
        return;
      }

      // For assessment updates, regenerate the document to ensure all data is current
      await this.generateProfessionalDocument(clientId, userId, userName, tokens);

      console.log('✅ Assessment appended to professional document successfully');
    } catch (error) {
      console.error('❌ Error appending assessment to professional document:', error);
      throw new Error(`Failed to append assessment: ${error}`);
    }
  }

  /**
   * Append demographics data to professional document
   */
  static async appendDemographicsToProfessionalDocument(
    clientId: string,
    userId: string,
    userName: string,
    tokens: any
  ): Promise<void> {
    try {
      console.log('📄 Appending demographics to professional document:', clientId);

      // Get the existing document
      const existingDoc = await getClientAssessmentDocument(clientId);
      if (!existingDoc) {
        console.log('No existing document found, creating new professional document...');
        await this.generateProfessionalDocument(clientId, userId, userName, tokens);
        return;
      }

      // For demographics updates, regenerate the document to ensure all data is current
      await this.generateProfessionalDocument(clientId, userId, userName, tokens);

      console.log('✅ Demographics appended to professional document successfully');
    } catch (error) {
      console.error('❌ Error appending demographics to professional document:', error);
      throw new Error(`Failed to append demographics: ${error}`);
    }
  }

  /**
   * Get document status for a client
   */
  static async getDocumentStatus(clientId: string): Promise<{
    hasDocument: boolean;
    documentId?: string;
    documentUrl?: string;
    lastUpdated?: string;
  }> {
    try {
      const existingDoc = await getClientAssessmentDocument(clientId);
      
      if (existingDoc) {
        return {
          hasDocument: true,
          documentId: existingDoc.documentId,
          documentUrl: existingDoc.documentUrl,
          lastUpdated: existingDoc.lastUpdated
        };
      } else {
        return {
          hasDocument: false
        };
      }
    } catch (error) {
      console.error('Error getting document status:', error);
      return {
        hasDocument: false
      };
    }
  }

  /**
   * Share document with team members
   */
  static async shareDocumentWithTeam(
    documentId: string,
    teamMemberEmails: string[],
    tokens: any
  ): Promise<void> {
    try {
      const enhancedService = new EnhancedGoogleDocsService(tokens);
      
      // Note: This would require implementing sharing functionality in EnhancedGoogleDocsService
      // For now, we'll log the intent
      console.log('📤 Sharing document with team members:', {
        documentId,
        teamMemberEmails
      });
      
      // TODO: Implement actual sharing logic
      // await enhancedService.shareDocument(documentId, teamMemberEmails);
      
    } catch (error) {
      console.error('Error sharing document with team:', error);
      throw new Error(`Failed to share document: ${error}`);
    }
  }

  /**
   * Validate document structure and content
   */
  static async validateDocumentStructure(
    client: Client,
    sessions: SessionNote[],
    assessments: MedicalAssessment[]
  ): Promise<{
    isValid: boolean;
    missingData: string[];
    warnings: string[];
  }> {
    const missingData: string[] = [];
    const warnings: string[] = [];

    // Check required client data
    if (!client.name) missingData.push('Client name');
    if (!client.demographics?.nationality) warnings.push('Nationality not provided');
    if (!client.demographics?.nextOfKin?.name) warnings.push('Next of kin information incomplete');

    // Check session data
    if (sessions.length === 0) {
      warnings.push('No sessions recorded yet');
    } else {
      const latestSession = sessions[sessions.length - 1];
      if (!latestSession.content) warnings.push('Latest session has no content');
      if (!latestSession.attendingClinicianName) warnings.push('Clinician name missing in latest session');
    }

    // Check assessment data
    if (assessments.length === 0) {
      warnings.push('No medical assessments completed yet');
    }

    return {
      isValid: missingData.length === 0,
      missingData,
      warnings
    };
  }
}
