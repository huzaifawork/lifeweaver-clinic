// src/app/api/documents/append/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Helper function to format demographics data
function formatDemographicsContent(demographics: any): string {
  let content = "**DEMOGRAPHICS UPDATE**\n\n";

  if (demographics.nationality) content += `**Nationality:** ${demographics.nationality}\n`;
  if (demographics.gender) content += `**Gender:** ${demographics.gender}\n`;
  if (demographics.ethnicity) content += `**Ethnicity:** ${demographics.ethnicity}\n`;
  if (demographics.languagesPreferred?.length) content += `**Languages:** ${demographics.languagesPreferred.join(', ')}\n`;
  if (demographics.nextOfKin) {
    content += `**Next of Kin:** ${demographics.nextOfKin.name} (${demographics.nextOfKin.relationship}) - ${demographics.nextOfKin.phoneNumber}\n`;
  }
  if (demographics.reasonForRehab) content += `**Reason for Rehabilitation:** ${demographics.reasonForRehab}\n`;
  if (demographics.hasHelper !== undefined) content += `**Has Helper:** ${demographics.hasHelper ? 'Yes' : 'No'}\n`;
  if (demographics.helperStatus) content += `**Helper Status:** ${demographics.helperStatus}\n`;
  if (demographics.additionalNotes) content += `**Additional Notes:** ${demographics.additionalNotes}\n`;

  return content;
}

// Helper function to format medical assessment data
function formatMedicalAssessmentContent(assessment: any): string {
  let content = `**Assessment Date:** ${new Date(assessment.assessmentDate).toLocaleDateString()}\n`;
  content += `**Assessor:** ${assessment.assessorName}\n\n`;

  if (assessment.fuglMeyer) {
    const fm = assessment.fuglMeyer;
    content += "**FUGL MEYER ASSESSMENT (Upper Limb)**\n";
    content += `- Shoulder/Elbow/Forearm: ${fm.shoulderElbowForearm}/36\n`;
    content += `- Wrist: ${fm.wrist}/10\n`;
    content += `- Hand: ${fm.hand}/14\n`;
    content += `- Coordination/Speed: ${fm.coordinationSpeed}/6\n`;
    content += `- **TOTAL SCORE: ${fm.total}/66**\n`;
    if (fm.notes) content += `- Notes: ${fm.notes}\n`;
    content += "\n";
  }

  if (assessment.fim) {
    const fim = assessment.fim;
    content += "**FUNCTIONAL INDEPENDENCE MEASURE (FIM)**\n";
    if (fim.eating) content += `- Eating: ${fim.eating}/7\n`;
    if (fim.grooming) content += `- Grooming: ${fim.grooming}/7\n`;
    if (fim.bathing) content += `- Bathing: ${fim.bathing}/7\n`;
    if (fim.upperBodyDressing) content += `- Upper Body Dressing: ${fim.upperBodyDressing}/7\n`;
    if (fim.lowerBodyDressing) content += `- Lower Body Dressing: ${fim.lowerBodyDressing}/7\n`;
    if (fim.toileting) content += `- Toileting: ${fim.toileting}/7\n`;
    if (fim.transfers) content += `- Transfers: ${fim.transfers}/7\n`;
    if (fim.notes) content += `- Notes: ${fim.notes}\n`;
    content += "\n";
  }

  if (assessment.rangeOfMotion) {
    const rom = assessment.rangeOfMotion;
    content += "**RANGE OF MOTION ASSESSMENT**\n";

    const bodyParts = [
      { name: 'Shoulder', data: rom.shoulder },
      { name: 'Elbow', data: rom.elbow },
      { name: 'Wrist', data: rom.wrist },
      { name: 'Digits', data: rom.digits },
      { name: 'Thumb', data: rom.thumb }
    ];

    bodyParts.forEach(part => {
      if (part.data) {
        content += `**${part.name}:**\n`;
        if (part.data.masFlexion !== undefined) content += `  - MAS Flexion: ${part.data.masFlexion}\n`;
        if (part.data.masExtension !== undefined) content += `  - MAS Extension: ${part.data.masExtension}\n`;
        if (part.data.mmtFlexion !== undefined) content += `  - MMT Flexion: ${part.data.mmtFlexion}\n`;
        if (part.data.mmtExtension !== undefined) content += `  - MMT Extension: ${part.data.mmtExtension}\n`;
        if (part.data.promFlexion !== undefined) content += `  - PROM Flexion: ${part.data.promFlexion}°\n`;
        if (part.data.promExtension !== undefined) content += `  - PROM Extension: ${part.data.promExtension}°\n`;
        if (part.data.aromFlexion !== undefined) content += `  - AROM Flexion: ${part.data.aromFlexion}°\n`;
        if (part.data.aromExtension !== undefined) content += `  - AROM Extension: ${part.data.aromExtension}°\n`;
      }
    });

    if (rom.notes) content += `**Notes:** ${rom.notes}\n`;
    content += "\n";
  }

  if (assessment.generalNotes) {
    content += `**GENERAL NOTES:**\n${assessment.generalNotes}\n\n`;
  }

  return content;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, userId, userName, type, data } = body;

    if (!clientId || !userId || !userName || !type || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, userId, userName, type, data' },
        { status: 400 }
      );
    }

    // Get user's Google tokens for authentication
    const { getUserCalendarConnection } = await import('@/lib/firebase/userCalendarConnections');
    const connection = await getUserCalendarConnection(userId);

    if (!connection || !connection.tokens) {
      console.log('⚠️ No Google tokens found for user:', userId);
      return NextResponse.json(
        { error: 'User not connected to Google services' },
        { status: 400 }
      );
    }

    const tokens = connection.tokens;
    let result;

    // Dynamic import to avoid client-side bundling issues
    const {
      addSessionToClientDocument,
      addMedicalAssessmentToClientDocument,
      addDemographicsToClientDocument
    } = await import('@/lib/services/documentGenerationService');

    switch (type) {
      case 'session':
        if (!data.sessionId) {
          return NextResponse.json(
            { error: 'sessionId is required for session append' },
            { status: 400 }
          );
        }

        // Get the existing document ID
        const { getClientAssessmentDocument: getSessionDoc } = await import('@/lib/firebase/googleDocs');
        let existingSessionDoc = await getSessionDoc(clientId);

        if (!existingSessionDoc) {
          console.log('📄 No existing document found for client, creating new simple document...');
          
          // Create a new simple document for the client
          const { generateClientDocument } = await import('@/lib/services/documentGenerationService');
          
          // Get user tokens for Google Docs API
          const { getUserCalendarConnection } = await import('@/lib/firebase/userCalendarConnections');
          const connection = await getUserCalendarConnection(userId);
          
          if (!connection || !connection.tokens) {
            return NextResponse.json(
              { error: 'User not connected to Google services' },
              { status: 400 }
            );
          }

          // Create new simple document
          try {
            const { documentId, documentUrl } = await generateClientDocument(
              clientId,
              userId,
              userName,
              connection.tokens,
              { useProfessionalTemplate: false }
            );

            // Get the newly created document
            existingSessionDoc = await getSessionDoc(clientId);
            
            if (!existingSessionDoc) {
              return NextResponse.json(
                { error: 'Failed to create new document for client' },
                { status: 500 }
              );
            }
          } catch (documentError) {
            console.warn('⚠️ Document creation failed, falling back to simple document:', documentError);
            
            // Fallback to simple document creation
            const GoogleDocsServiceClass = (await import('@/lib/google-docs-service')).default;
            const docsService = new GoogleDocsServiceClass();
            
            const fallbackTokens = {
              access_token: connection.tokens.access_token,
              refresh_token: connection.tokens.refresh_token,
              scope: connection.tokens.scope,
              token_type: connection.tokens.token_type || 'Bearer',
              expiry_date: connection.tokens.expiry_date
            };
            
            docsService.initializeWithTokens(fallbackTokens);

            // Refresh tokens if needed
            const refreshedFallbackTokens = await docsService.refreshTokenIfNeeded(fallbackTokens);
            if (refreshedFallbackTokens !== fallbackTokens) {
              const { updateUserCalendarTokens } = await import('@/lib/firebase/userCalendarConnections');
              await updateUserCalendarTokens(userId, refreshedFallbackTokens);
              console.log('✅ Updated stored tokens after refresh for fallback document');
            }

            // Get client data for dynamic values
            const { getClient } = await import('@/lib/firebase/clients');
            const client = await getClient(clientId);
            // Force recompilation

            // Create a simple appointment document as fallback
            const appointmentData = {
              id: `fallback-${Date.now()}`,
              clientId: clientId,
              clientName: client?.name || 'Unknown Client',
              attendingClinicianId: userId,
              attendingClinicianName: userName,
              attendingClinicianVocation: 'Therapist',
              type: 'appointment' as const,
              status: 'confirmed' as const,
              dateOfSession: new Date().toISOString(),
              duration: 60,
              location: client?.location || 'TBD',
              content: 'Initial appointment for client',
              createdByUserId: userId,
              createdByUserName: userName,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            
            const appointmentDoc = await docsService.createAppointmentDocument(appointmentData, client);
            
            // Save document reference to Firebase
            const { addDoc, collection } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase');
            await addDoc(collection(db, 'appointmentDocuments'), {
              ...appointmentDoc,
              createdByUserId: userId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });

            // Get the newly created document
            existingSessionDoc = await getSessionDoc(clientId);
            
            if (!existingSessionDoc) {
              return NextResponse.json(
                { error: 'Failed to create fallback document for client' },
                { status: 500 }
              );
            }
          }
        }

        // Get session data
        const { getSessionsByClient } = await import('@/lib/firebase/sessions');
        const sessions = await getSessionsByClient(clientId);
        const session = sessions.find(s => s.id === data.sessionId);

        if (!session) {
          return NextResponse.json(
            { error: 'Session not found' },
            { status: 404 }
          );
        }

        // Use original simple document service
        console.log('📄 Using original document service for session append');

        try {
          await addSessionToClientDocument(clientId, data.sessionId, userId, userName, tokens, false);
          result = { success: true, message: 'Session appended to document successfully' };
        } catch (originalError) {
          console.warn('⚠️ Original service failed, trying fallback method:', originalError);

          // Fallback to original method
          const GoogleDocsServiceClass3 = (await import('@/lib/google-docs-service')).default;
          const sessionDocsService = new GoogleDocsServiceClass3();
          sessionDocsService.initializeWithTokens({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            scope: tokens.scope,
            token_type: tokens.token_type || 'Bearer',
            expiry_date: tokens.expiry_date
          });

          // Get all sessions for proper numbering
          const sortedSessions = sessions.sort((a, b) =>
            new Date(a.dateOfSession).getTime() - new Date(b.dateOfSession).getTime()
          );
          const sessionIndex = sortedSessions.findIndex(s => s.id === data.sessionId);
          const sessionNumber = sessionIndex + 1;

          // Format session content
          const sessionContent = `**Date:** ${new Date(session.dateOfSession).toLocaleDateString()}\n**Clinician:** ${session.attendingClinicianName}\n**Duration:** ${session.duration || 60} minutes\n**Location:** ${session.location || 'TBD'}\n\n**Session Content:**\n${session.content}\n\n`;

          // Append session to the existing document
          await sessionDocsService.appendToDocument(
            existingSessionDoc.documentId,
            `SESSION ${sessionNumber}`,
            sessionContent
          );

          result = { success: true, message: 'Session appended to document successfully (fallback method)' };
        }
        break;

      case 'medical_assessment':
        if (!data.assessment) {
          return NextResponse.json(
            { error: 'assessment data is required for medical assessment append' },
            { status: 400 }
          );
        }

        // Get the existing document ID
        const { getClientAssessmentDocument: getClientDoc } = await import('@/lib/firebase/googleDocs');
        let existingAssessmentDoc = await getClientDoc(clientId);

        if (!existingAssessmentDoc) {
          console.log('📄 No existing document found for client, creating new simple document...');
          
          // Create a new simple document for the client
          const { generateClientDocument } = await import('@/lib/services/documentGenerationService');
          
          // Get user tokens for Google Docs API
          const { getUserCalendarConnection } = await import('@/lib/firebase/userCalendarConnections');
          const connection = await getUserCalendarConnection(userId);
          
          if (!connection || !connection.tokens) {
            return NextResponse.json(
              { error: 'User not connected to Google services' },
              { status: 400 }
            );
          }

          // Create new simple document
          try {
            const { documentId, documentUrl } = await generateClientDocument(
              clientId,
              userId,
              userName,
              connection.tokens,
              { useProfessionalTemplate: false }
            );

            // Get the newly created document
            existingAssessmentDoc = await getClientDoc(clientId);
            
            if (!existingAssessmentDoc) {
              return NextResponse.json(
                { error: 'Failed to create new document for client' },
                { status: 500 }
              );
            }
          } catch (professionalError) {
            console.warn('⚠️ Professional document creation failed, falling back to simple document:', professionalError);
            
            // Fallback to simple document creation
            const GoogleDocsServiceClass = (await import('@/lib/google-docs-service')).default;
            const docsService = new GoogleDocsServiceClass();
            
            const assessmentFallbackTokens = {
              access_token: connection.tokens.access_token,
              refresh_token: connection.tokens.refresh_token,
              scope: connection.tokens.scope,
              token_type: connection.tokens.token_type || 'Bearer',
              expiry_date: connection.tokens.expiry_date
            };
            
            docsService.initializeWithTokens(assessmentFallbackTokens);

            // Refresh tokens if needed
            const refreshedAssessmentTokens = await docsService.refreshTokenIfNeeded(assessmentFallbackTokens);
            if (refreshedAssessmentTokens !== assessmentFallbackTokens) {
              const { updateUserCalendarTokens } = await import('@/lib/firebase/userCalendarConnections');
              await updateUserCalendarTokens(userId, refreshedAssessmentTokens);
              console.log('✅ Updated stored tokens after refresh for assessment fallback');
            }

            // Get client data first
            const { getClient } = await import('@/lib/firebase/clients');
            const client = await getClient(clientId);

            // Create a simple appointment document as fallback
            const appointmentData = {
              id: `fallback-${Date.now()}`,
              clientId: clientId,
              clientName: client?.name || 'Unknown Client',
              attendingClinicianId: userId,
              attendingClinicianName: userName,
              attendingClinicianVocation: 'Therapist',
              type: 'appointment' as const,
              status: 'confirmed' as const,
              dateOfSession: new Date().toISOString(),
              duration: 60,
              location: client?.location || 'TBD',
              content: 'Initial appointment for client',
              createdByUserId: userId,
              createdByUserName: userName,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            
            const appointmentDoc = await docsService.createAppointmentDocument(appointmentData, client);
            
            // Save document reference to Firebase
            const { addDoc, collection } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase');
            await addDoc(collection(db, 'appointmentDocuments'), {
              ...appointmentDoc,
              createdByUserId: userId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });

            // Get the newly created document
            existingAssessmentDoc = await getClientDoc(clientId);
            
            if (!existingAssessmentDoc) {
              return NextResponse.json(
                { error: 'Failed to create fallback document for client' },
                { status: 500 }
              );
            }
          }
        }

        // Use the working GoogleDocsService with user tokens
        const GoogleDocsServiceClass = (await import('@/lib/google-docs-service')).default;
        const assessmentDocsService = new GoogleDocsServiceClass();
        
        const initialTokens = {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          scope: tokens.scope,
          token_type: tokens.token_type || 'Bearer',
          expiry_date: tokens.expiry_date
        };
        
        assessmentDocsService.initializeWithTokens(initialTokens);

        // Refresh tokens if needed and update stored tokens
        const refreshedTokens = await assessmentDocsService.refreshTokenIfNeeded(initialTokens);
        if (refreshedTokens !== initialTokens) {
          // Update stored tokens in Firebase
          const { updateUserCalendarTokens } = await import('@/lib/firebase/userCalendarConnections');
          await updateUserCalendarTokens(userId, refreshedTokens);
          console.log('✅ Updated stored tokens after refresh');
        }

        // Append medical assessment to the existing document
        await assessmentDocsService.appendToDocument(
          existingAssessmentDoc.documentId,
          'MEDICAL ASSESSMENT UPDATE',
          formatMedicalAssessmentContent(data.assessment)
        );

        result = { success: true, message: 'Medical assessment appended to document successfully' };
        break;

      case 'demographics':
        if (!data.demographics) {
          return NextResponse.json(
            { error: 'demographics data is required for demographics append' },
            { status: 400 }
          );
        }

        // Use the same approach as sessions - create a pseudo-appointment for demographics
        const { getClient } = await import('@/lib/firebase/clients');
        const client = await getClient(clientId);
        if (!client) {
          return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }

        // Create a demographics "appointment" to use the working session approach
        const demographicsAppointment = {
          id: `demographics-${Date.now()}`,
          clientId: clientId,
          clientName: client.name,
          attendingClinicianId: userId,
          attendingClinicianName: userName,
          attendingClinicianVocation: 'Demographics Update',
          type: 'demographics' as const,
          status: 'confirmed' as const,
          dateOfSession: new Date().toISOString(),
          duration: 0,
          location: 'System Update',
          content: formatDemographicsContent(data.demographics),
          createdByUserId: userId,
          createdByUserName: userName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Get the existing document ID
        const { getClientAssessmentDocument } = await import('@/lib/firebase/googleDocs');
        let existingDoc = await getClientAssessmentDocument(clientId);

        if (!existingDoc) {
          console.log('📄 No existing document found for client, creating new simple document...');
          
          // Create a new simple document for the client
          const { generateClientDocument } = await import('@/lib/services/documentGenerationService');
          
          // Get user tokens for Google Docs API
          const { getUserCalendarConnection } = await import('@/lib/firebase/userCalendarConnections');
          const connection = await getUserCalendarConnection(userId);
          
          if (!connection || !connection.tokens) {
            return NextResponse.json(
              { error: 'User not connected to Google services' },
              { status: 400 }
            );
          }

          // Create new simple document
          const { documentId, documentUrl } = await generateClientDocument(
            clientId,
            userId,
            userName,
            connection.tokens,
            { useProfessionalTemplate: false }
          );

          // Get the newly created document
          existingDoc = await getClientAssessmentDocument(clientId);
          
          if (!existingDoc) {
            return NextResponse.json(
              { error: 'Failed to create new document for client' },
              { status: 500 }
            );
          }
        }

        // Use the working GoogleDocsService with user tokens
        const GoogleDocsServiceClass2 = (await import('@/lib/google-docs-service')).default;
        const docsService = new GoogleDocsServiceClass2();
        
        const demographicsTokens = {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          scope: tokens.scope,
          token_type: tokens.token_type || 'Bearer',
          expiry_date: tokens.expiry_date
        };
        
        docsService.initializeWithTokens(demographicsTokens);

        // Refresh tokens if needed and update stored tokens
        const refreshedDemographicsTokens = await docsService.refreshTokenIfNeeded(demographicsTokens);
        if (refreshedDemographicsTokens !== demographicsTokens) {
          // Update stored tokens in Firebase
          const { updateUserCalendarTokens } = await import('@/lib/firebase/userCalendarConnections');
          await updateUserCalendarTokens(userId, refreshedDemographicsTokens);
          console.log('✅ Updated stored tokens after refresh for demographics');
        }

        // Append demographics to the existing document
        await docsService.appendToDocument(
          existingDoc.documentId,
          'DEMOGRAPHICS UPDATE',
          formatDemographicsContent(data.demographics)
        );

        result = { success: true, message: 'Demographics appended to document successfully' };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid type. Use "session", "medical_assessment", or "demographics"' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error appending to document:', error);
    return NextResponse.json(
      { error: 'Failed to append to document', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');

  if (!clientId) {
    return NextResponse.json(
      { error: 'clientId parameter is required' },
      { status: 400 }
    );
  }

  try {
    // Dynamic import to avoid client-side bundling issues
    const { getClientAssessmentDocument } = await import('@/lib/firebase/googleDocs');
    
    const document = await getClientAssessmentDocument(clientId);
    
    return NextResponse.json({ 
      hasDocument: !!document,
      document: document || null
    });
  } catch (error) {
    console.error('Error getting document status:', error);
    return NextResponse.json(
      { error: 'Failed to get document status' },
      { status: 500 }
    );
  }
}
