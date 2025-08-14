// src/lib/services/googleDocsService.ts
import { google } from 'googleapis';
import type {
  Client,
  MedicalAssessment,
  SessionNote,
  GoogleDocumentInfo,
  DocumentGenerationRequest,
  ClientDemographics
} from '@/lib/types';

// Google Docs API configuration
const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive.file'
];

// Initialize Google Auth
const getGoogleAuth = () => {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      type: 'service_account',
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.GOOGLE_CLIENT_EMAIL}`
    },
    scopes: SCOPES,
  });

  return auth;
};

// Initialize Google Docs and Drive APIs
const getDocs = async () => {
  const auth = getGoogleAuth();
  return google.docs({ version: 'v1', auth });
};

/**
 * Get Google Docs API instance with user OAuth tokens
 */
const getDocsWithUserTokens = async (tokens: any) => {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials(tokens);
  return google.docs({ version: 'v1', auth: oauth2Client });
};

const getDrive = async () => {
  const auth = getGoogleAuth();
  return google.drive({ version: 'v3', auth });
};

/**
 * Create a new Google Document
 */
export const createGoogleDocument = async (title: string): Promise<{ documentId: string; documentUrl: string }> => {
  try {
    const docs = await getDocs();
    
    const response = await docs.documents.create({
      requestBody: {
        title: title
      }
    });

    const documentId = response.data.documentId!;
    const documentUrl = `https://docs.google.com/document/d/${documentId}`;

    return { documentId, documentUrl };
  } catch (error) {
    console.error('Error creating Google Document:', error);
    throw new Error('Failed to create Google Document');
  }
};

/**
 * Generate document content based on client data and assessments
 */
const generateDocumentContent = (
  client: Client,
  assessments: MedicalAssessment[],
  sessions?: SessionNote[]
): any[] => {
  const requests: any[] = [];
  let currentIndex = 1;

  // Helper function to add text with formatting
  const addText = (text: string, bold = false, fontSize = 11) => {
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: text
      }
    });

    if (bold || fontSize !== 11) {
      requests.push({
        updateTextStyle: {
          range: {
            startIndex: currentIndex,
            endIndex: currentIndex + text.length
          },
          textStyle: {
            bold: bold,
            fontSize: { magnitude: fontSize, unit: 'PT' }
          },
          fields: bold ? 'bold,fontSize' : 'fontSize'
        }
      });
    }

    currentIndex += text.length;
  };

  // Helper function to add a table
  const addTable = (rows: string[][], headers?: string[]) => {
    const tableData = headers ? [headers, ...rows] : rows;
    
    requests.push({
      insertTable: {
        location: { index: currentIndex },
        rows: tableData.length,
        columns: tableData[0].length
      }
    });

    // Add table content
    let tableIndex = currentIndex + 1;
    tableData.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        requests.push({
          insertText: {
            location: { index: tableIndex },
            text: cell
          }
        });
        tableIndex += cell.length + 2; // Account for cell separators
      });
    });

    currentIndex = tableIndex;
  };

  // Document Header
  addText('Lifeweavers\n', true, 16);
  addText('documentation\n\n', false, 12);
  addText('All info are private and confidential. Do not share outside of therapy team without company\'s permission.\n\n', false, 10);

  // Client Information
  addText('Name of Patient\n\n', true, 12);
  addText(`${client.name}\n\n`);

  if (client.dateOfBirth?.trim()) {
    addText('Date Of Birth\n\n', true, 12);
    addText(`${client.dateOfBirth}\n\n`);
  }

  if (client.address?.trim()) {
    addText('Local Address Of Residence\n\n', true, 12);
    addText(`${client.address}\n\n`);
  }

  // Demographics - only show sections with actual data
  if (client.demographics) {
    const demo = client.demographics;
    
    if (demo.nationality?.trim()) {
      addText('Nationality\n\n', true, 12);
      addText(`${demo.nationality}\n\n`);
    }

    if (demo.idPassportNumber?.trim()) {
      addText('ID/Passport Number\n\n', true, 12);
      addText(`${demo.idPassportNumber}\n\n`);
    }

    if (demo.gender?.trim()) {
      addText('Gender\n\n', true, 12);
      addText(`${demo.gender}\n\n`);
    }

    if (demo.ethnicity?.trim()) {
      addText('Ethnicity\n\n', true, 12);
      addText(`${demo.ethnicity}\n\n`);
    }

    if (demo.languagesPreferred && demo.languagesPreferred.length > 0) {
      addText('Language/s Preferred\n\n', true, 12);
      addText(`${demo.languagesPreferred.join(', ')}\n\n`);
    }

    if (demo.mainContactEmail?.trim()) {
      addText('Main Contact Email\n\n', true, 12);
      addText(`${demo.mainContactEmail}\n\n`);
    }

    if (demo.nextOfKin?.name?.trim()) {
      addText('Next Of Kin / Main Contact Person\n\n', true, 12);
      addText(`${demo.nextOfKin.name}\n\n`);
    }

    if (demo.nextOfKin?.relationship?.trim()) {
      addText('Relationship Of Next Of Kin\n\n', true, 12);
      addText(`${demo.nextOfKin.relationship}\n\n`);
    }

    if (demo.nextOfKin?.phoneNumber?.trim()) {
      addText('Telephone Number Of Next Of Kin\n\n', true, 12);
      addText(`${demo.nextOfKin.phoneNumber}\n\n`);
    }

    if (demo.reasonForRehab?.trim()) {
      addText('Reason/s Seeking Rehab Therapy In The Community\n\n', true, 12);
      addText(`${demo.reasonForRehab}\n\n`);
    }

    if (demo.medicalConditionImpact) {
      const impacts = [];
      if (demo.medicalConditionImpact.mobility) impacts.push('Mobility');
      if (demo.medicalConditionImpact.foodIntake) impacts.push('Food Intake');
      if (demo.medicalConditionImpact.cognition) impacts.push('Cognition');
      if (demo.medicalConditionImpact.selfCare) impacts.push('Self Care (Bathing, Dressing, etc)');
      if (demo.medicalConditionImpact.accessToHomeCommunity) impacts.push('Access To Home / Community');
      if (demo.medicalConditionImpact.homeSafety) impacts.push('Home Safety');
      if (demo.medicalConditionImpact.commuting) impacts.push('Commuting');
      
      if (impacts.length > 0) {
        addText('How Is Your Medical Condition Impacting You\n\n', true, 12);
        addText(`${impacts.join(', ')}\n\n`);
      }
    }

    if (demo.hasHelper !== undefined) {
      addText('Do You Have A Helper / Caregiver?\n\n', true, 12);
      addText(`${demo.hasHelper ? 'Yes' : 'No'}\n\n`);
      
      if (demo.hasHelper && demo.helperStatus?.trim()) {
        addText(`Status: ${demo.helperStatus}\n\n`);
      }
    }
  }

  // Assessment Tables
  const latestAssessments = assessments.sort((a, b) => 
    new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime()
  );

  // Fugl Meyer Assessment
  const latestFuglMeyer = latestAssessments.find(a => a.fuglMeyer)?.fuglMeyer;
  if (latestFuglMeyer) {
    addText('\nFugl Meyer Assessment (Upper Limb)\n', true, 14);
    addText(`Assessment Date: ${new Date(latestFuglMeyer.assessmentDate).toLocaleDateString()}\n\n`);
    
    const fuglMeyerRows = [
      ['A - MOTOR', 'DATE:', '', '', ''],
      ['Shoulder/Elbow/Forearm', `/${latestFuglMeyer.shoulderElbowForearm}`, '/36', '/36', '/36'],
      ['Wrist', `/${latestFuglMeyer.wrist}`, '/10', '/10', '/10'],
      ['Hand', `/${latestFuglMeyer.hand}`, '/14', '/14', '/14'],
      ['Coordination/Speed', `/${latestFuglMeyer.coordinationSpeed}`, '/6', '/6', '/6'],
      ['TOTAL', `/${latestFuglMeyer.total}`, '/66', '/66', '/66']
    ];
    
    addTable(fuglMeyerRows);
    addText('\n\n');
  }

  // FIM Assessment
  const latestFIM = latestAssessments.find(a => a.fim)?.fim;
  if (latestFIM) {
    addText('FUNCTIONAL INDEPENDENCE MEASURE (FIM)\n', true, 14);
    addText(`Assessment Date: ${new Date(latestFIM.assessmentDate).toLocaleDateString()}\n\n`);
    
    const fimRows = [
      ['DATE:', '', '', '', '', ''],
      ['Eating', latestFIM.eating?.toString() || '', '', '', '', ''],
      ['Grooming', latestFIM.grooming?.toString() || '', '', '', '', ''],
      ['Bathing', latestFIM.bathing?.toString() || '', '', '', '', ''],
      ['Upper body dressing', latestFIM.upperBodyDressing?.toString() || '', '', '', '', ''],
      ['Lower body dressing', latestFIM.lowerBodyDressing?.toString() || '', '', '', '', ''],
      ['Toileting', latestFIM.toileting?.toString() || '', '', '', '', ''],
      ['Transfers', latestFIM.transfers?.toString() || '', '', '', '', '']
    ];
    
    addTable(fimRows);
    addText('\n\n');
  }

  // Range of Motion Assessment
  const latestROM = latestAssessments.find(a => a.rangeOfMotion)?.rangeOfMotion;
  if (latestROM) {
    addText('Functional Reassessment Templates\n', true, 14);
    addText(`Assessment Date: ${new Date(latestROM.assessmentDate).toLocaleDateString()}\n\n`);
    
    const romHeaders = ['DATE:', 'MAS (F/E)', 'MMT (F/E)', 'PROM F/E', 'AROM F/E'];
    const romRows = [
      ['Shoulder', 
       `${latestROM.shoulder?.masFlexion || ''}/${latestROM.shoulder?.masExtension || ''}`,
       `${latestROM.shoulder?.mmtFlexion || ''}/${latestROM.shoulder?.mmtExtension || ''}`,
       `${latestROM.shoulder?.promFlexion || ''}/${latestROM.shoulder?.promExtension || ''}`,
       `${latestROM.shoulder?.aromFlexion || ''}/${latestROM.shoulder?.aromExtension || ''}`],
      ['Elbow',
       `${latestROM.elbow?.masFlexion || ''}/${latestROM.elbow?.masExtension || ''}`,
       `${latestROM.elbow?.mmtFlexion || ''}/${latestROM.elbow?.mmtExtension || ''}`,
       `${latestROM.elbow?.promFlexion || ''}/${latestROM.elbow?.promExtension || ''}`,
       `${latestROM.elbow?.aromFlexion || ''}/${latestROM.elbow?.aromExtension || ''}`],
      ['Wrist',
       `${latestROM.wrist?.masFlexion || ''}/${latestROM.wrist?.masExtension || ''}`,
       `${latestROM.wrist?.mmtFlexion || ''}/${latestROM.wrist?.mmtExtension || ''}`,
       `${latestROM.wrist?.promFlexion || ''}/${latestROM.wrist?.promExtension || ''}`,
       `${latestROM.wrist?.aromFlexion || ''}/${latestROM.wrist?.aromExtension || ''}`],
      ['Digits',
       `${latestROM.digits?.masFlexion || ''}/${latestROM.digits?.masExtension || ''}`,
       `${latestROM.digits?.mmtFlexion || ''}/${latestROM.digits?.mmtExtension || ''}`,
       `${latestROM.digits?.promFlexion || ''}/${latestROM.digits?.promExtension || ''}`,
       `${latestROM.digits?.aromFlexion || ''}/${latestROM.digits?.aromExtension || ''}`]
    ];
    
    addTable(romRows, romHeaders);
    addText('\n\n');
  }

  // Additional Notes
  if (client.demographics?.additionalNotes) {
    addText('Anything else to share?\n\n', true, 12);
    addText(`${client.demographics.additionalNotes}\n\n`);
  }

  return requests;
};

/**
 * Generate a complete medical assessment document
 */
export const generateMedicalAssessmentDocument = async (
  client: Client,
  assessments: MedicalAssessment[],
  sessions?: SessionNote[]
): Promise<{ documentId: string; documentUrl: string }> => {
  try {
    // Create the document
    const documentTitle = `${client.name} - Medical Assessment - ${new Date().toLocaleDateString()}`;
    const { documentId, documentUrl } = await createGoogleDocument(documentTitle);

    // Generate content
    const requests = generateDocumentContent(client, assessments, sessions);

    // Apply content to document
    if (requests.length > 0) {
      const docs = await getDocs();
      await docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: {
          requests: requests
        }
      });
    }

    return { documentId, documentUrl };
  } catch (error) {
    console.error('Error generating medical assessment document:', error);
    throw new Error('Failed to generate medical assessment document');
  }
};

/**
 * Update an existing document with new session data
 */
export const appendSessionToDocument = async (
  documentId: string,
  sessionData: SessionNote,
  assessment?: MedicalAssessment
): Promise<void> => {
  try {
    const docs = await getDocs();

    // Get current document to find where to append
    const doc = await docs.documents.get({ documentId });
    const content = doc.data.body?.content || [];

    // Find the end of the document
    let endIndex = 1;
    content.forEach(element => {
      if (element.endIndex && element.endIndex > endIndex) {
        endIndex = element.endIndex;
      }
    });

    // Get all sessions for this client to determine session number
    const { getSessionsByClient } = await import('@/lib/firebase/sessions');
    const allSessions = await getSessionsByClient(sessionData.clientId);

    // Sort sessions by date to get proper numbering
    const sortedSessions = allSessions.sort((a, b) =>
      new Date(a.dateOfSession).getTime() - new Date(b.dateOfSession).getTime()
    );

    // Find the session number (position in chronological order)
    const sessionIndex = sortedSessions.findIndex(s => s.id === sessionData.id);
    const sessionNumber = sessionIndex + 1;

    const requests: any[] = [];

    // Add session information with proper numbering
    requests.push({
      insertText: {
        location: { index: endIndex - 1 },
        text: `\n\n--- SESSION ${sessionNumber}: ${new Date(sessionData.dateOfSession).toLocaleDateString()} ---\n`
      }
    });

    requests.push({
      insertText: {
        location: { index: endIndex - 1 },
        text: `Clinician: ${sessionData.attendingClinicianName}\n`
      }
    });

    requests.push({
      insertText: {
        location: { index: endIndex - 1 },
        text: `Session Content:\n${sessionData.content}\n`
      }
    });

    if (assessment) {
      requests.push({
        insertText: {
          location: { index: endIndex - 1 },
          text: `\nAssessment Notes: ${assessment.generalNotes || 'No additional notes'}\n`
        }
      });
    }

    // Apply the updates
    if (requests.length > 0) {
      await docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: {
          requests: requests
        }
      });
    }
  } catch (error) {
    console.error('Error appending session to document:', error);
    throw new Error('Failed to append session to document');
  }
};

/**
 * Append medical assessment data to an existing document
 */
export const appendMedicalAssessmentToDocument = async (
  documentId: string,
  assessment: MedicalAssessment,
  client: Client
): Promise<void> => {
  try {
    const docs = await getDocs();

    // Get current document to find where to append
    const doc = await docs.documents.get({ documentId });
    const content = doc.data.body?.content || [];

    // Find the end of the document
    let endIndex = 1;
    content.forEach(element => {
      if (element.endIndex && element.endIndex > endIndex) {
        endIndex = element.endIndex;
      }
    });

    const requests: any[] = [];

    // Add assessment header
    requests.push({
      insertText: {
        location: { index: endIndex - 1 },
        text: `\n\n=== MEDICAL ASSESSMENT UPDATE ===\n`
      }
    });

    requests.push({
      insertText: {
        location: { index: endIndex - 1 },
        text: `Date: ${new Date(assessment.assessmentDate).toLocaleDateString()}\n`
      }
    });

    requests.push({
      insertText: {
        location: { index: endIndex - 1 },
        text: `Assessor: ${assessment.assessorName}\n\n`
      }
    });

    // Add Fugl Meyer Assessment if present
    if (assessment.fuglMeyer) {
      const fm = assessment.fuglMeyer;
      requests.push({
        insertText: {
          location: { index: endIndex - 1 },
          text: `FUGL MEYER ASSESSMENT (Upper Limb)\n`
        }
      });
      requests.push({
        insertText: {
          location: { index: endIndex - 1 },
          text: `- Shoulder/Elbow/Forearm: ${fm.shoulderElbowForearm}/36\n`
        }
      });
      requests.push({
        insertText: {
          location: { index: endIndex - 1 },
          text: `- Wrist: ${fm.wrist}/10\n`
        }
      });
      requests.push({
        insertText: {
          location: { index: endIndex - 1 },
          text: `- Hand: ${fm.hand}/14\n`
        }
      });
      requests.push({
        insertText: {
          location: { index: endIndex - 1 },
          text: `- Coordination/Speed: ${fm.coordinationSpeed}/6\n`
        }
      });
      requests.push({
        insertText: {
          location: { index: endIndex - 1 },
          text: `- TOTAL SCORE: ${fm.total}/66\n`
        }
      });
      if (fm.notes) {
        requests.push({
          insertText: {
            location: { index: endIndex - 1 },
            text: `- Notes: ${fm.notes}\n`
          }
        });
      }
      requests.push({
        insertText: {
          location: { index: endIndex - 1 },
          text: `\n`
        }
      });
    }

    // Add FIM Assessment if present
    if (assessment.fim) {
      const fim = assessment.fim;
      requests.push({
        insertText: {
          location: { index: endIndex - 1 },
          text: `FUNCTIONAL INDEPENDENCE MEASURE (FIM)\n`
        }
      });
      if (fim.eating) requests.push({
        insertText: {
          location: { index: endIndex - 1 },
          text: `- Eating: ${fim.eating}/7\n`
        }
      });
      if (fim.grooming) requests.push({
        insertText: {
          location: { index: endIndex - 1 },
          text: `- Grooming: ${fim.grooming}/7\n`
        }
      });
      if (fim.bathing) requests.push({
        insertText: {
          location: { index: endIndex - 1 },
          text: `- Bathing: ${fim.bathing}/7\n`
        }
      });
      if (fim.upperBodyDressing) requests.push({
        insertText: {
          location: { index: endIndex - 1 },
          text: `- Upper Body Dressing: ${fim.upperBodyDressing}/7\n`
        }
      });
      if (fim.lowerBodyDressing) requests.push({
        insertText: {
          location: { index: endIndex - 1 },
          text: `- Lower Body Dressing: ${fim.lowerBodyDressing}/7\n`
        }
      });
      if (fim.toileting) requests.push({
        insertText: {
          location: { index: endIndex - 1 },
          text: `- Toileting: ${fim.toileting}/7\n`
        }
      });
      if (fim.transfers) requests.push({
        insertText: {
          location: { index: endIndex - 1 },
          text: `- Transfers: ${fim.transfers}/7\n`
        }
      });
      if (fim.notes) {
        requests.push({
          insertText: {
            location: { index: endIndex - 1 },
            text: `- Notes: ${fim.notes}\n`
          }
        });
      }
      requests.push({
        insertText: {
          location: { index: endIndex - 1 },
          text: `\n`
        }
      });
    }

    // Add Range of Motion Assessment if present
    if (assessment.rangeOfMotion) {
      const rom = assessment.rangeOfMotion;
      requests.push({
        insertText: {
          location: { index: endIndex - 1 },
          text: `RANGE OF MOTION ASSESSMENT\n`
        }
      });

      const bodyParts = [
        { name: 'Shoulder', data: rom.shoulder },
        { name: 'Elbow', data: rom.elbow },
        { name: 'Wrist', data: rom.wrist },
        { name: 'Digits', data: rom.digits },
        { name: 'Thumb', data: rom.thumb }
      ];

      bodyParts.forEach(part => {
        if (part.data) {
          requests.push({
            insertText: {
              location: { index: endIndex - 1 },
              text: `${part.name}:\n`
            }
          });
          if (part.data.masFlexion !== undefined) requests.push({
            insertText: {
              location: { index: endIndex - 1 },
              text: `  - MAS Flexion: ${part.data.masFlexion}\n`
            }
          });
          if (part.data.masExtension !== undefined) requests.push({
            insertText: {
              location: { index: endIndex - 1 },
              text: `  - MAS Extension: ${part.data.masExtension}\n`
            }
          });
          if (part.data.mmtFlexion !== undefined) requests.push({
            insertText: {
              location: { index: endIndex - 1 },
              text: `  - MMT Flexion: ${part.data.mmtFlexion}\n`
            }
          });
          if (part.data.mmtExtension !== undefined) requests.push({
            insertText: {
              location: { index: endIndex - 1 },
              text: `  - MMT Extension: ${part.data.mmtExtension}\n`
            }
          });
          if (part.data.promFlexion !== undefined) requests.push({
            insertText: {
              location: { index: endIndex - 1 },
              text: `  - PROM Flexion: ${part.data.promFlexion}°\n`
            }
          });
          if (part.data.promExtension !== undefined) requests.push({
            insertText: {
              location: { index: endIndex - 1 },
              text: `  - PROM Extension: ${part.data.promExtension}°\n`
            }
          });
          if (part.data.aromFlexion !== undefined) requests.push({
            insertText: {
              location: { index: endIndex - 1 },
              text: `  - AROM Flexion: ${part.data.aromFlexion}°\n`
            }
          });
          if (part.data.aromExtension !== undefined) requests.push({
            insertText: {
              location: { index: endIndex - 1 },
              text: `  - AROM Extension: ${part.data.aromExtension}°\n`
            }
          });
        }
      });

      if (rom.notes) {
        requests.push({
          insertText: {
            location: { index: endIndex - 1 },
            text: `Notes: ${rom.notes}\n`
          }
        });
      }
      requests.push({
        insertText: {
          location: { index: endIndex - 1 },
          text: `\n`
        }
      });
    }

    // Add general notes if present
    if (assessment.generalNotes) {
      requests.push({
        insertText: {
          location: { index: endIndex - 1 },
          text: `GENERAL NOTES:\n${assessment.generalNotes}\n\n`
        }
      });
    }

    // Apply the updates
    if (requests.length > 0) {
      await docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: {
          requests: requests
        }
      });
    }
  } catch (error) {
    console.error('Error appending medical assessment to document:', error);
    throw new Error('Failed to append medical assessment to document');
  }
};

/**
 * Update client demographics in an existing document by finding and replacing existing demographics sections
 */
export const appendDemographicsToDocument = async (
  documentId: string,
  demographics: ClientDemographics,
  client: Client,
  userTokens?: any
): Promise<void> => {
  try {
    const docs = userTokens ? await getDocsWithUserTokens(userTokens) : await getDocs();

    // Get current document content
    const doc = await docs.documents.get({ documentId });
    const content = doc.data.body?.content || [];

    // Extract all text from the document to search for existing demographics sections
    let documentText = '';
    content.forEach(element => {
      if (element.paragraph?.elements) {
        element.paragraph.elements.forEach(elem => {
          if (elem.textRun?.content) {
            documentText += elem.textRun.content;
          }
        });
      }
    });

    const requests: any[] = [];
    
    // Helper function to find and replace text in document
    const findAndReplaceText = (searchText: string, replaceText: string) => {
      if (documentText.includes(searchText) && replaceText.trim()) {
        requests.push({
          replaceAllText: {
            containsText: {
              text: searchText,
              matchCase: false
            },
            replaceText: replaceText
          }
        });
      }
    };

    // Update existing demographics fields only if they have values
    if (demographics.nationality?.trim()) {
      // Find and replace existing nationality value
      const nationalityRegex = /Nationality\s*\n\n([^\n]+)/;
      const nationalityMatch = documentText.match(nationalityRegex);
      if (nationalityMatch && nationalityMatch[1] !== demographics.nationality) {
        findAndReplaceText(nationalityMatch[1], demographics.nationality);
      }
    }

    if (demographics.gender?.trim()) {
      // Find and replace gender section
      const genderRegex = /Gender\s*\n\n([^\n]+)/;
      const genderMatch = documentText.match(genderRegex);
      if (genderMatch && genderMatch[1] !== demographics.gender) {
        findAndReplaceText(genderMatch[1], demographics.gender);
      }
    }

    if (demographics.ethnicity?.trim()) {
      // Find and replace ethnicity section
      const ethnicityRegex = /Ethnicity\s*\n\n([^\n]+)/;
      const ethnicityMatch = documentText.match(ethnicityRegex);
      if (ethnicityMatch && ethnicityMatch[1] !== demographics.ethnicity) {
        findAndReplaceText(ethnicityMatch[1], demographics.ethnicity);
      }
    }

    if (demographics.languagesPreferred && demographics.languagesPreferred.length > 0) {
      const languages = demographics.languagesPreferred.join(', ');
      const languageRegex = /Language\/s Preferred\s*\n\n([^\n]+)/;
      const languageMatch = documentText.match(languageRegex);
      if (languageMatch && languageMatch[1] !== languages) {
        findAndReplaceText(languageMatch[1], languages);
      }
    }

    if (demographics.mainContactEmail?.trim()) {
      const emailRegex = /Main Contact Email\s*\n\n([^\n]+)/;
      const emailMatch = documentText.match(emailRegex);
      if (emailMatch && emailMatch[1] !== demographics.mainContactEmail) {
        findAndReplaceText(emailMatch[1], demographics.mainContactEmail);
      }
    }

    if (demographics.nextOfKin?.name?.trim()) {
      const kinRegex = /Next Of Kin \/ Main Contact Person\s*\n\n([^\n]+)/;
      const kinMatch = documentText.match(kinRegex);
      if (kinMatch && kinMatch[1] !== demographics.nextOfKin.name) {
        findAndReplaceText(kinMatch[1], demographics.nextOfKin.name);
      }
    }

    if (demographics.nextOfKin?.relationship?.trim()) {
      const relationshipRegex = /Relationship Of Next Of Kin\s*\n\n([^\n]+)/;
      const relationshipMatch = documentText.match(relationshipRegex);
      if (relationshipMatch && relationshipMatch[1] !== demographics.nextOfKin.relationship) {
        findAndReplaceText(relationshipMatch[1], demographics.nextOfKin.relationship);
      }
    }

    if (demographics.nextOfKin?.phoneNumber?.trim()) {
      const phoneRegex = /Telephone Number Of Next Of Kin\s*\n\n([^\n]+)/;
      const phoneMatch = documentText.match(phoneRegex);
      if (phoneMatch && phoneMatch[1] !== demographics.nextOfKin.phoneNumber) {
        findAndReplaceText(phoneMatch[1], demographics.nextOfKin.phoneNumber);
      }
    }

    if (demographics.reasonForRehab?.trim()) {
      const reasonRegex = /Reason\/s Seeking Rehab Therapy In The Community\s*\n\n([^\n]+)/;
      const reasonMatch = documentText.match(reasonRegex);
      if (reasonMatch && reasonMatch[1] !== demographics.reasonForRehab) {
        findAndReplaceText(reasonMatch[1], demographics.reasonForRehab);
      }
    }

    if (demographics.idPassportNumber?.trim()) {
      const idRegex = /ID\/Passport Number\s*\n\n([^\n]+)/;
      const idMatch = documentText.match(idRegex);
      if (idMatch && idMatch[1] !== demographics.idPassportNumber) {
        findAndReplaceText(idMatch[1], demographics.idPassportNumber);
      }
    }

    if (demographics.additionalNotes?.trim()) {
      const notesRegex = /Anything else to share\?\s*\n\n([^\n]+)/;
      const notesMatch = documentText.match(notesRegex);
      if (notesMatch && notesMatch[1] !== demographics.additionalNotes) {
        findAndReplaceText(notesMatch[1], demographics.additionalNotes);
      }
    }

    // Apply the updates only if there are changes to make
    if (requests.length > 0) {
      await docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: {
          requests: requests
        }
      });
      console.log(`✅ Updated ${requests.length} demographics fields in document`);
    } else {
      console.log('ℹ️ No demographics updates needed - all fields are current');
    }
  } catch (error) {
    console.error('Error updating demographics in document:', error);
    throw new Error('Failed to update demographics in document');
  }
};

/**
 * Share document with specific email addresses
 */
export const shareDocument = async (
  documentId: string,
  emailAddresses: string[],
  role: 'reader' | 'writer' | 'commenter' = 'reader'
): Promise<void> => {
  try {
    const drive = await getDrive();
    
    for (const email of emailAddresses) {
      await drive.permissions.create({
        fileId: documentId,
        requestBody: {
          role: role,
          type: 'user',
          emailAddress: email
        }
      });
    }
  } catch (error) {
    console.error('Error sharing document:', error);
    throw new Error('Failed to share document');
  }
};

/**
 * Get document metadata
 */
export const getDocumentMetadata = async (documentId: string): Promise<any> => {
  try {
    const drive = await getDrive();
    const response = await drive.files.get({
      fileId: documentId,
      fields: 'id,name,createdTime,modifiedTime,owners,permissions'
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting document metadata:', error);
    throw new Error('Failed to get document metadata');
  }
};
