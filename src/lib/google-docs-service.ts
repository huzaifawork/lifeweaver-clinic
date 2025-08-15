// src/lib/google-docs-service.ts
import { google } from 'googleapis';
import type { Appointment, SessionNote, Client } from '@/lib/types';

export interface GoogleDocsTokens {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expiry_date?: number;
}

export interface AppointmentDocument {
  documentId: string;
  documentUrl: string;
  title: string;
  appointmentId: string;
  clientId: string;
  createdAt: string;
  lastModified: string;
}

class GoogleDocsService {
  private oauth2Client: any;
  private docs: any;
  private drive: any;

  constructor() {
    // Initialize OAuth2 client - will be configured per user
    this.oauth2Client = new google.auth.OAuth2();
    this.docs = google.docs({ version: 'v1', auth: this.oauth2Client });
    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Initialize with user's tokens from Firebase Auth
   */
  initializeWithTokens(tokens: GoogleDocsTokens): void {
    console.log('🔑 Setting Google Docs OAuth credentials:', {
      hasAccessToken: !!tokens.access_token,
      tokenType: tokens.token_type,
      scope: tokens.scope,
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: tokens.expiry_date
    });

    this.oauth2Client.setCredentials(tokens);
  }

  /**
   * Create a new Google Doc for an appointment
   */
  async createAppointmentDocument(appointment: Appointment, client: Client | null): Promise<AppointmentDocument> {
    try {
      const title = `Appointment - ${appointment.clientName} - ${new Date(appointment.dateOfSession).toLocaleDateString()}`;

      // Create the document
      const createResponse = await this.docs.documents.create({
        resource: {
          title: title
        }
      });

      const documentId = createResponse.data.documentId;
      const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;

      // Populate the document with appointment data
      await this.populateAppointmentDocument(documentId, appointment, client);

      // Share document with all Super Admins and Admins
      await this.shareDocumentWithAdmins(documentId);

      return {
        documentId,
        documentUrl,
        title,
        appointmentId: appointment.id,
        clientId: appointment.clientId,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating appointment document:', error);
      throw new Error('Failed to create appointment document');
    }
  }

  /**
   * Populate a Google Doc with appointment data
   */
  async populateAppointmentDocument(documentId: string, appointment: Appointment, client: Client | null): Promise<void> {
    try {
      const requests = [];

      // Document header
      requests.push({
        insertText: {
          location: { index: 1 },
          text: `APPOINTMENT DOCUMENTATION\n\n`
        }
      });

      // Appointment Information Section
      requests.push({
        insertText: {
          location: { index: 1 },
          text: `APPOINTMENT INFORMATION\n`
        }
      });

      requests.push({
        insertText: {
          location: { index: 1 },
          text: `Date: ${new Date(appointment.dateOfSession).toLocaleDateString()}\n`
        }
      });

      requests.push({
        insertText: {
          location: { index: 1 },
          text: `Time: ${new Date(appointment.dateOfSession).toLocaleTimeString()}\n`
        }
      });

      requests.push({
        insertText: {
          location: { index: 1 },
          text: `Duration: ${appointment.duration} minutes\n`
        }
      });

      requests.push({
        insertText: {
          location: { index: 1 },
          text: `Type: ${appointment.type}\n`
        }
      });

      requests.push({
        insertText: {
          location: { index: 1 },
          text: `Status: ${appointment.status}\n`
        }
      });

      if (appointment.location) {
        requests.push({
          insertText: {
            location: { index: 1 },
            text: `Location: ${appointment.location}\n`
          }
        });
      }

      requests.push({
        insertText: {
          location: { index: 1 },
          text: `\n`
        }
      });

      // Client Information Section
      requests.push({
        insertText: {
          location: { index: 1 },
          text: `CLIENT INFORMATION\n`
        }
      });

      requests.push({
        insertText: {
          location: { index: 1 },
          text: `Name: ${appointment.clientName}\n`
        }
      });

      if (client) {
        if (client.email) {
          requests.push({
            insertText: {
              location: { index: 1 },
              text: `Email: ${client.email}\n`
            }
          });
        }

        if (client.phone) {
          requests.push({
            insertText: {
              location: { index: 1 },
              text: `Phone: ${client.phone}\n`
            }
          });
        }

        if (client.dateOfBirth) {
          requests.push({
            insertText: {
              location: { index: 1 },
              text: `Date of Birth: ${client.dateOfBirth}\n`
            }
          });
        }
      }

      requests.push({
        insertText: {
          location: { index: 1 },
          text: `\n`
        }
      });

      // Clinician Information Section
      requests.push({
        insertText: {
          location: { index: 1 },
          text: `CLINICIAN INFORMATION\n`
        }
      });

      requests.push({
        insertText: {
          location: { index: 1 },
          text: `Name: ${appointment.attendingClinicianName}\n`
        }
      });

      if (appointment.attendingClinicianVocation) {
        requests.push({
          insertText: {
            location: { index: 1 },
            text: `Vocation: ${appointment.attendingClinicianVocation}\n`
          }
        });
      }

      requests.push({
        insertText: {
          location: { index: 1 },
          text: `\n`
        }
      });

      // Session Notes Section
      requests.push({
        insertText: {
          location: { index: 1 },
          text: `SESSION NOTES\n`
        }
      });

      if (appointment.content) {
        requests.push({
          insertText: {
            location: { index: 1 },
            text: `${appointment.content}\n\n`
          }
        });
      } else {
        requests.push({
          insertText: {
            location: { index: 1 },
            text: `[Session notes will be added here]\n\n`
          }
        });
      }

      // Removed hardcoded treatment plan and follow-up sections as requested

      // Execute all requests in reverse order (since we're inserting at index 1)
      await this.docs.documents.batchUpdate({
        documentId,
        resource: {
          requests: requests.reverse()
        }
      });

      console.log('✅ Document populated successfully');
    } catch (error) {
      console.error('Error populating document:', error);
      throw new Error('Failed to populate appointment document');
    }
  }

  /**
   * Get document content
   */
  async getDocumentContent(documentId: string): Promise<any> {
    try {
      const response = await this.docs.documents.get({
        documentId
      });

      return response.data;
    } catch (error) {
      console.error('Error getting document content:', error);
      throw new Error('Failed to get document content');
    }
  }

  /**
   * Update document with session notes
   */
  async updateDocumentWithSessionNotes(documentId: string, sessionNote: SessionNote): Promise<void> {
    try {
      // Get current document to find where to insert
      const doc = await this.getDocumentContent(documentId);
      
      // Find the session notes section and update it
      const requests = [{
        insertText: {
          location: { index: doc.body.content.length - 1 },
          text: `\n\nSESSION UPDATE - ${new Date(sessionNote.dateOfSession).toLocaleDateString()}\n`
        }
      }, {
        insertText: {
          location: { index: doc.body.content.length - 1 },
          text: `${sessionNote.content}\n`
        }
      }];

      await this.docs.documents.batchUpdate({
        documentId,
        resource: { requests }
      });

      console.log('✅ Document updated with session notes');
    } catch (error) {
      console.error('Error updating document:', error);
      throw new Error('Failed to update document with session notes');
    }
  }

  /**
   * Append new content to an existing document
   */
  async appendToDocument(documentId: string, title: string, content: string): Promise<void> {
    try {
      // Get the current document to find the end
      const doc = await this.docs.documents.get({ documentId });
      const body = doc.data.body;

      // Find the end index of the document
      let endIndex = 1;
      if (body && body.content) {
        for (const element of body.content) {
          if (element.endIndex && element.endIndex > endIndex) {
            endIndex = element.endIndex;
          }
        }
      }

      const requests = [];

      // Add a separator and new content
      requests.push({
        insertText: {
          location: { index: endIndex - 1 },
          text: `\n\n--- ${title} ---\n`
        }
      });

      requests.push({
        insertText: {
          location: { index: endIndex - 1 },
          text: `Date: ${new Date().toLocaleDateString()}\n\n`
        }
      });

      requests.push({
        insertText: {
          location: { index: endIndex - 1 },
          text: content
        }
      });

      // Apply the updates
      await this.docs.documents.batchUpdate({
        documentId: documentId,
        resource: {
          requests: requests
        }
      });

      console.log(`✅ Content appended to document: ${documentId}`);
    } catch (error) {
      console.error('Error appending to document:', error);
      throw new Error('Failed to append to document');
    }
  }

  /**
   * Share document with all Super Admins and Admins
   */
  async shareDocumentWithAdmins(documentId: string): Promise<void> {
    try {
      console.log('🔗 Sharing document with all Super Admins and Admins...');

      // Import getUsersByRole function
      const { getUsersByRole } = await import('@/lib/firebase/users');

      // Get all Super Admins and Admins
      const [superAdmins, admins] = await Promise.all([
        getUsersByRole('Super Admin'),
        getUsersByRole('Admin')
      ]);

      const adminUsers = [...superAdmins, ...admins];
      console.log(`📧 Found ${adminUsers.length} admin users to share with:`, adminUsers.map(u => u.email));

      // Share document with each admin user
      const sharePromises = adminUsers.map(async (user) => {
        try {
          await this.drive.permissions.create({
            fileId: documentId,
            resource: {
              role: 'writer', // Give write access to admins
              type: 'user',
              emailAddress: user.email
            },
            sendNotificationEmail: false // Don't spam with emails
          });
          console.log(`✅ Shared document with ${user.email} (${user.role})`);
        } catch (error) {
          console.warn(`⚠️ Failed to share with ${user.email}:`, error);
          // Don't throw error for individual failures
        }
      });

      await Promise.allSettled(sharePromises);
      console.log('🎉 Document sharing completed!');

    } catch (error) {
      console.error('❌ Error sharing document with admins:', error);
      // Don't throw error - document creation should still succeed
    }
  }

  /**
   * List all appointment documents
   */
  async listAppointmentDocuments(): Promise<any[]> {
    try {
      const response = await this.drive.files.list({
        q: "mimeType='application/vnd.google-apps.document' and name contains 'Appointment -'",
        fields: 'files(id, name, createdTime, modifiedTime, webViewLink)',
        orderBy: 'modifiedTime desc'
      });

      return response.data.files || [];
    } catch (error) {
      console.error('Error listing documents:', error);
      throw new Error('Failed to list appointment documents');
    }
  }

  /**
   * Test connection to Google Docs
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.drive.files.list({ pageSize: 1 });
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default GoogleDocsService;
