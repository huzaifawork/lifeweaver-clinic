// src/lib/services/enhancedGoogleDocsService.ts
import { google } from 'googleapis';
import type { 
  Client, 
  SessionNote, 
  MedicalAssessment, 
  FuglMeyerAssessment, 
  FIMAssessment, 
  RangeOfMotionAssessment,
  ClientDemographics 
} from '@/lib/types';

// Enhanced Google Docs service for professional medical document generation
export class EnhancedGoogleDocsService {
  private docs: any;
  private currentIndex: number = 1;

  constructor(tokens: any) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials(tokens);
    this.docs = google.docs({ version: 'v1', auth });
  }

  /**
   * Create a professional medical document with exact MD structure
   */
  async createProfessionalMedicalDocument(
    client: Client,
    sessions: SessionNote[],
    assessments: MedicalAssessment[]
  ): Promise<{ documentId: string; documentUrl: string }> {
    try {
      // Create the document
      const documentTitle = `${client.name} - Medical Assessment - ${new Date().toLocaleDateString()}`;
      const createResponse = await this.docs.documents.create({
        requestBody: {
          title: documentTitle
        }
      });

      const documentId = createResponse.data.documentId;
      const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;

      // Get the document to find the proper insertion point
      const document = await this.docs.documents.get({
        documentId: documentId
      });

      // Set the current index to the end of the document content
      this.currentIndex = document.data.body.content[0].endIndex - 1;

      // Generate the complete document structure
      const requests = await this.generateCompleteDocumentStructure(client, sessions, assessments);

      // Apply all formatting and content
      if (requests.length > 0) {
        await this.docs.documents.batchUpdate({
          documentId: documentId,
          requestBody: {
            requests: requests
          }
        });
      }

      return { documentId, documentUrl };
    } catch (error) {
      console.error('Error creating professional medical document:', error);
      throw new Error('Failed to create professional medical document');
    }
  }

  /**
   * Generate the complete document structure matching the MD file EXACTLY
   * Every section, table, and field mapped 1:1 with Internal_Doc_Complete_Exact.md
   */
  private async generateCompleteDocumentStructure(
    client: Client,
    sessions: SessionNote[],
    assessments: MedicalAssessment[]
  ): Promise<any[]> {
    const requests: any[] = [];

    // EXACT STRUCTURE FROM MD FILE - LINE BY LINE MAPPING

    // 1. Document Title (Line 1 from MD)
    this.addHeading(requests, `${client.name} - Medical Assessment - Complete Exact Extraction`, 'TITLE');
    this.addParagraphBreak(requests);

    // 2. Session Template Table (Lines 3-8 from MD)
    this.addHeading(requests, 'Session Template Table', 'HEADING_2');
    this.addSessionTemplateTable(requests, sessions);
    this.addParagraphBreak(requests);

    // 3. SOAP Notes instruction (Lines 10-12 from MD)
    this.addText(requests, 'Complete documentation using SOAP notes format.');
    this.addParagraphBreak(requests);
    this.addText(requests, '- End of Report.');
    this.addParagraphBreak(requests, 2);

    // 4. Current Session Information (Lines 14-19 from MD)
    this.addHeading(requests, 'Current Session Information', 'HEADING_2');
    this.addCurrentSessionTable(requests, sessions);

    // 5. Subjective Section (Lines 21-42 from MD)
    this.addHeading(requests, 'Subjective', 'HEADING_2');
    this.addCompleteSubjectiveContent(requests, sessions, client);

    // 6. Method of Evaluation (Lines 44-80 from MD)
    this.addHeading(requests, 'Method of Evaluation', 'HEADING_2');
    this.addCompleteMethodOfEvaluation(requests, client, assessments);

    // 7. Dysphagia assessment (Lines 81-106 from MD)
    this.addHeading(requests, 'Dysphagia assessment:', 'HEADING_2');
    this.addCompleteDysphagiaAssessment(requests, assessments);

    // 8. Communication assessment (Lines 107-144 from MD)
    this.addHeading(requests, 'Communication assessment', 'HEADING_2');
    this.addCompleteCommunicationAssessment(requests, assessments);

    // 9. Activity trialled (Lines 145-157 from MD)
    this.addHeading(requests, 'Activity trialled:', 'HEADING_2');
    this.addCompleteActivityTrialled(requests, assessments);

    // 10. Diagnosis and recommendations (Lines 158-179 from MD)
    this.addHeading(requests, 'Diagnosis and recommendations', 'HEADING_2');
    this.addCompleteDiagnosisAndRecommendations(requests, assessments);

    // 11. Action Planning Table (Lines 181-191 from MD)
    this.addHeading(requests, 'Action Planning Table', 'HEADING_2');
    this.addExactActionPlanningTable(requests);

    // 12. Appendix (Lines 193-197 from MD)
    this.addHeading(requests, 'Appendix', 'HEADING_2');
    this.addText(requests, 'Copy of the test and results will be filed here');
    this.addParagraphBreak(requests);
    this.addText(requests, 'Guidance on completing scoring: https://www.thecopm.ca/learn/');
    this.addParagraphBreak(requests, 2);

    // 13. Administrative Information (Lines 199-203 from MD)
    this.addHeading(requests, 'Administrative Information', 'HEADING_2');
    this.addExactAdministrativeSection(requests, client);

    // 14. Patient Information Table (Lines 205-224 from MD)
    this.addHeading(requests, 'Patient Information', 'HEADING_2');
    this.addExactPatientInformationTable(requests, client);

    // 15. Assessment Templates (Lines 226-266 from MD)
    this.addHeading(requests, 'Assessment Templates', 'HEADING_2');
    this.addExactAssessmentTemplates(requests, assessments);

    return requests;
  }

  /**
   * Add session template table (dynamic) - EXACT format from MD file Lines 5-8
   */
  private addSessionTemplateTable(requests: any[], sessions: SessionNote[]): void {
    const latestSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;
    const nextSessionNumber = sessions.length + 1;

    const tableData = [
      [`Therapy Session ${nextSessionNumber.toString().padStart(2, '0')}`, `Date: YYYY-MM-DD`],
      [
        'Location: (type here)',
        'Duration: (type here)'
      ],
      [
        'Participants: (type here)',
        'Therapist/s attending: (type here)'
      ]
    ];

    this.addTable(requests, tableData);
  }

  /**
   * Add ALL sessions information chronologically
   */
  private addAllSessionsInformation(requests: any[], sessions: SessionNote[]): void {
    // Sort sessions chronologically
    const sortedSessions = sessions.sort((a, b) =>
      new Date(a.dateOfSession).getTime() - new Date(b.dateOfSession).getTime()
    );

    // Add each session as a separate section
    sortedSessions.forEach((session, index) => {
      const sessionNumber = (index + 1).toString().padStart(2, '0');

      this.addHeading(requests, `Current Session Information - Session ${sessionNumber}`, 'HEADING_2');

      const tableData = [
        [`Therapy Session ${sessionNumber} - INIAX`, `Date: ${new Date(session.dateOfSession).toLocaleDateString()}`],
        [
          session.location || '(pull from client profile)',
          `Duration: ${session.duration || 60} minutes`
        ],
        [
          session.content ? session.content.substring(0, 50) + '...' : '(free text)',
          `Therapist/s attending: ${session.attendingClinicianName}`
        ]
      ];

      this.addTable(requests, tableData);
      this.addParagraphBreak(requests);

      // Add session content if available
      if (session.content) {
        this.addHeading(requests, 'Session Notes', 'HEADING_3');
        this.addText(requests, session.content);
        this.addParagraphBreak(requests);
      }

      this.addParagraphBreak(requests);
    });
  }

  /**
   * Add current session information table (legacy method for compatibility)
   */
  private addCurrentSessionTable(requests: any[], sessions: SessionNote[]): void {
    const currentSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;

    if (currentSession) {
      const sessionNumber = sessions.length.toString().padStart(2, '0');
      const tableData = [
        [`Therapy Session ${sessionNumber} - INIAX`, `Date: ${new Date(currentSession.dateOfSession).toLocaleDateString()}`],
        [
          `Location: ${currentSession.location || '(pull from client profile)'}`,
          `Duration: ${currentSession.duration || 60} minutes`
        ],
        [
          'Participants: (free text)',
          `Therapist/s attending: ${currentSession.attendingClinicianName || 'ST Charlie Brown'} (pull from database)`
        ]
      ];

      this.addTable(requests, tableData);
    } else {
      // If no sessions, create a template table
      const tableData = [
        ['Therapy Session 01 - INIAX', 'Date: YYYY-MM-DD'],
        [
          'Location: (pull from client profile)',
          'Duration: 60 minutes'
        ],
        [
          'Participants: (free text)',
          'Therapist/s attending: ST Charlie Brown (pull from database)'
        ]
      ];

      this.addTable(requests, tableData);
    }
  }

  /**
   * Add COMPLETE subjective content exactly as in MD file (Lines 21-42)
   */
  private addCompleteSubjectiveContent(requests: any[], sessions: SessionNote[], client: Client): void {
    const latestSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;

    // Extract actual session content or use template content
    if (latestSession && latestSession.content) {
      // Use actual session content
      this.addText(requests, latestSession.content);
    } else {
      // Use template content from MD file with dynamic client name
      this.addText(requests, `${client.name} was seated out in a geriatric chair, NGT in situ.`);
      this.addParagraphBreak(requests);

      // Use next of kin information if available
      const nextOfKin = client.demographics?.nextOfKin;
      if (nextOfKin) {
        this.addText(requests, `Accompanied by ${nextOfKin.relationship.toLowerCase()} (${nextOfKin.name}). Patient mood and engagement noted during session.`);
      } else {
        this.addText(requests, 'Accompanied by family members. Patient mood and engagement noted during session.');
      }
    }
    this.addParagraphBreak(requests);

    // Reason For Referral (Line 27-29 from MD) - Use dynamic data if available
    this.addHeading(requests, 'Reason For Referral', 'HEADING_3');
    const reasonForRehab = client.demographics?.reasonForRehab;
    if (reasonForRehab) {
      this.addText(requests, reasonForRehab);
    } else {
      this.addText(requests, 'To improve communication abilities post stroke');
    }
    this.addParagraphBreak(requests);

    // Expectations For therapy And Clients Mindset (Lines 31-42 from MD)
    this.addHeading(requests, 'Expectations For therapy And Clients Mindset', 'HEADING_3');
    this.addText(requests, 'Reported difficulty in the following areas');
    this.addParagraphBreak(requests);
    this.addText(requests, 'For each reported difficulty score 1 - 10 ( 1=minor difficulty, 10= major difficulty)');
    this.addParagraphBreak(requests);

    // Communication difficulty (Lines 37-42 from MD) - Use dynamic impact data
    this.addText(requests, 'Communication: reported difficulty 10', true);
    this.addParagraphBreak(requests);

    // Dynamic bullet points based on client data
    const clientName = client.name.split(' ')[0]; // Use first name for more personal touch
    const nextOfKinName = client.demographics?.nextOfKin?.name || 'family';

    this.addText(requests, `- noted from ${nextOfKinName} that ${clientName} struggles to communicate needs and wants. Most of it is anticipated by caregiver and family`);
    this.addText(requests, `- ${clientName} was observed to have spontaneous utterances at phrase level but they are not always relevant or sufficient to express needs and wants.`);
    this.addText(requests, `- ${clientName} would often demonstrate frustrations due to communication difficulties and often say hurtful things to family.`);
    this.addText(requests, `- ${nextOfKinName} shares that family is hopeful for ${clientName} to make as much improvement to communication abilities to reduce frustrations where possible, however they are also understanding that a full recovery back to baseline communication abilities may not be possible`);
    this.addParagraphBreak(requests, 2);
  }

  /**
   * Add COMPLETE method of evaluation exactly as in MD file (Lines 44-80)
   */
  private addCompleteMethodOfEvaluation(requests: any[], client: Client, assessments: MedicalAssessment[]): void {
    // Initial assessment (Lines 46-48 from MD)
    this.addHeading(requests, 'Initial assessment', 'HEADING_3');
    this.addText(requests, '- Medical and social history');
    this.addParagraphBreak(requests);

    // CT Brain results (Lines 50-54 from MD)
    this.addText(requests, '(3/3/25) CT Brain:', true);
    this.addParagraphBreak(requests);

    if (client.medicalHistory) {
      this.addText(requests, `- ${client.medicalHistory}`);
    } else {
      this.addText(requests, '- Acute right MCA territory infarct with hypodense changes involving the right frontal operculum and insula. No haemorrhagic conversion or significant mass effect.');
      this.addText(requests, '- Occlusion of the right MCA distal M1 segment with moderate collateralization.');
      this.addText(requests, '- Major arteries in the neck are patent but tortuous.');
    }
    this.addParagraphBreak(requests);

    // Assessment tools used (Lines 56-80 from MD)
    this.addHeading(requests, 'Assessment tools used', 'HEADING_3');
    const contactName = client.demographics?.nextOfKin?.name || 'family';
    this.addText(requests, `Case history provided by ${contactName} (${new Date().toLocaleDateString()} via phone call, ${new Date().toLocaleDateString()} in session)`, true);
    this.addParagraphBreak(requests);

    // Eating and drinking section (Lines 60-66 from MD)
    this.addText(requests, 'Eating and drinking', true);
    this.addParagraphBreak(requests);
    this.addText(requests, '- since discharge home, family feels that patient is eating better, able to finish ½ to ¾ of what they were able to eat premorbidly');
    this.addText(requests, '- Patient was described to be a small eater, taking a sandwich for meals at times');
    this.addText(requests, '- Patient was also noted to have left sided chewing difficulties before the stroke, nil orthodontic treatment sought or rendered');
    this.addText(requests, '- able to take whole tablets 1 by 1 with nil noted difficulties');
    this.addText(requests, '- no dentures');
    this.addParagraphBreak(requests);

    // Communication section (Lines 68-72 from MD)
    this.addText(requests, 'Communication', true);
    this.addParagraphBreak(requests);

    // Use dynamic language data if available
    const languages = client.demographics?.languagesPreferred?.join(', ') || 'multiple languages';
    this.addText(requests, `- ${client.name} was an avid reader and was able to speak ${languages}`);
    this.addText(requests, `- ${client.name} was also very outgoing and enjoys going out to meet with friends.`);
    this.addText(requests, `- ${contactName} feels that ${client.name} is aware of current abilities and it makes them frustrated. However when friends visited recently, ${client.name} was able to ask about the friend's dog without hesitation and no difficulties recalling.`);
    this.addParagraphBreak(requests);

    // Previous ST and communication intervention (Lines 74-80 from MD)
    this.addText(requests, 'Previous ST and communication intervention', true);
    this.addParagraphBreak(requests);
    this.addText(requests, `- ${contactName} shared that throughout ${client.name}'s stay at the hospital, they had minimal interactions with the ST`);
    this.addText(requests, `- ${client.name} does not have any ST follow up for swallowing or communications either`);
    this.addText(requests, `- Family noticed that ${client.name} was able to sing well, does not miss lyrics or skip the beats, so they had requested for music therapy (MT)`);
    this.addText(requests, `- ${client.name} had about 4 sessions of MT at SGH`);
    this.addParagraphBreak(requests, 2);
  }

  /**
   * Add COMPLETE Dysphagia assessment exactly as in MD file (Lines 81-106)
   */
  private addCompleteDysphagiaAssessment(requests: any[], assessments: MedicalAssessment[]): void {
    this.addText(requests, 'oromotor assessment not done due to poor compliance at start of session when patient appeared guarded towards ST.');
    this.addParagraphBreak(requests);

    this.addText(requests, 'Trialled:', true);
    this.addParagraphBreak(requests);
    this.addText(requests, '- Level 7 soft, regular diet - x2 beignet with cream');
    this.addText(requests, '- Level 0 thin fluids (water) - x2 cup sips');
    this.addParagraphBreak(requests);
    this.addText(requests, 'fed by helper, self drinking via cup');
    this.addParagraphBreak(requests);

    this.addText(requests, 'Oral phase:', true);
    this.addParagraphBreak(requests);
    this.addText(requests, '- good oral reception');
    this.addText(requests, '- adequate lip seal, nil anterior spillage');
    this.addText(requests, '- fair orolingual control');
    this.addText(requests, '- slow but adequate mastication, aligned with overall general slowness of eating and drinking');
    this.addText(requests, '- nil significant residue post-swallow');
    this.addParagraphBreak(requests);

    this.addText(requests, 'Pharyngeal phase', true);
    this.addParagraphBreak(requests);
    this.addText(requests, '- mild delayed');
    this.addText(requests, '- mild reduced hyolaryngeal excursion');
    this.addText(requests, '- clear voice');
    this.addText(requests, '- nil signs of aspiration noted across trials');
    this.addParagraphBreak(requests, 2);
  }

  /**
   * Add COMPLETE Communication assessment exactly as in MD file (Lines 107-144)
   */
  private addCompleteCommunicationAssessment(requests: any[], assessments: MedicalAssessment[]): void {
    this.addText(requests, 'Attempted to use a communication screener, however patient was becoming increasingly upset at the end of orientation questions. Communication was thus informally assessed with aim to ascertain suitable strategies instead.');
    this.addParagraphBreak(requests);

    this.addText(requests, 'Spontaneous speech:', true);
    this.addParagraphBreak(requests);
    this.addText(requests, '- Patient was noted to have spontaneous utterances at worlds to phrases/short sentence level (e.g give me the toothbrush, toothbrush, plate, i am tired, can i go to sleep now?)');
    this.addText(requests, '- speech utterances were largely intelligible to 80-90% accuracy');
    this.addText(requests, '- noted to speak at keywords to however not always easily understood by family, leading to frequent communication breakdown');
    this.addText(requests, '- able to ask questions, relevant to the context most of the time (e.g "what do you mean?, "can i go to bed please?")');
    this.addText(requests, '- fair ability to repeat at short utterance level, however this may be impacted by attention.');
    this.addParagraphBreak(requests);

    this.addText(requests, 'Orientation questions:', true);
    this.addParagraphBreak(requests);
    this.addText(requests, '- provided name only when shown written prompts of their name');
    this.addText(requests, '- provided their date of birth when shown "195_" in fill in the blanks prompts');
    this.addText(requests, '- did not respond regarding place even with written binary choices - started saying "what is the point", raising their voice');
    this.addParagraphBreak(requests);

    this.addText(requests, 'Confrontational naming: 10/10', true);
    this.addParagraphBreak(requests);
    this.addText(requests, '- slow in response, but benefits from additional time given');
    this.addText(requests, '- benefitted from fill in the blank prompts verbal > written');
    this.addText(requests, '- noted perseverations (i.e repeating answer from previous picture while looking at the next stimuli)');
    this.addText(requests, '- initially very frustrated when asked to name pictures, would look away, but eventually encouraged when they were able to achieve success');
    this.addText(requests, '- semantic descriptors were also helpful (e.g it is a fruit, you sit on it)');
    this.addText(requests, '- errors were mostly semantic errors (e.g labrador > dog, mercedes > car, football > basketball)');
    this.addParagraphBreak(requests);

    this.addText(requests, 'Written word to picture matching: 0/2', true);
    this.addParagraphBreak(requests);
    this.addText(requests, '- poor engagement in task, likely further confounded by left sided inattention');
    this.addText(requests, '- reading mostly options on their right visual space, ignoring the ones of the left');
    this.addText(requests, '- frustrated ++, verbalising phrases e.g "what is the point", "i can\'t"');
    this.addParagraphBreak(requests);

    this.addText(requests, 'Others:', true);
    this.addParagraphBreak(requests);
    this.addText(requests, '- frequent frustration outburst noted during communication breakdown');
    this.addText(requests, '- Patient would also attempt to disengage at times by looking away at times, requiring redirection and frequent encouragement');
    this.addParagraphBreak(requests, 2);
  }

  /**
   * Add COMPLETE Activity trialled exactly as in MD file (Lines 145-157)
   */
  private addCompleteActivityTrialled(requests: any[], assessments: MedicalAssessment[]): void {
    this.addText(requests, 'Tactus therapy app (Lite)', true);
    this.addParagraphBreak(requests);
    this.addText(requests, '- Naming and flashcards sub categories');
    this.addText(requests, '- Patient demonstrated interest in tablet application more than pictures given in earlier trials');
    this.addText(requests, '- able to achieve 5/5 with prompts');
    this.addText(requests, '- benefits from repetition of trials to increase speed and confidence in responses (i.e respond faster with each set of repetition)');
    this.addText(requests, '- Patient demonstrates good motivation and engagement in tasks with encouragement and frequent micro breaks');
    this.addText(requests, '- increased frequency of perseverations towards end of session');
    this.addText(requests, '- eventually fatigued and was able to say "I want to sleep now".');
    this.addText(requests, '- nil frustration outburst during tasks when adequately paced and supported. Patient even asked for the next stimuli');
    this.addParagraphBreak(requests, 2);
  }

  /**
   * Add COMPLETE Diagnosis and recommendations exactly as in MD file (Lines 158-179)
   */
  private addCompleteDiagnosisAndRecommendations(requests: any[], assessments: MedicalAssessment[]): void {
    this.addText(requests, 'Functional swallows with nil signs of aspiration across trials.');
    this.addParagraphBreak(requests);
    this.addText(requests, 'Expressive more than receptive aphasia with cognitive overlay');
    this.addParagraphBreak(requests, 2);

    this.addHeading(requests, 'Recommendations', 'HEADING_2');
    this.addText(requests, 'For weekly speech therapy to work on establishing practice tasks with consistent strategies for family to support in conversation.');
    this.addParagraphBreak(requests);
    this.addText(requests, '- spoke to family on daily practice, 5 trials each time and repeat to increase frequency and familiarity with practice tasks and strategies');
    this.addText(requests, '- Family informed that ST is not available next week (2-9 June), but able to arrange for weekly sessions after');
    this.addText(requests, '- Family noted and will liaise when they have sorted their schedule as well. Not for back to back sessions with other therapy sessions for now due to fatigability.');
    this.addParagraphBreak(requests);
    this.addText(requests, 'To monitor left inattention, consider OT as needed when family is ready.');
    this.addParagraphBreak(requests, 2);

    this.addHeading(requests, 'ST Plan for next session:', 'HEADING_2');
    this.addText(requests, '- spelling and letter manipulation: anagrams for names');
    this.addText(requests, '- CGT to helper to cue during activity and communication breakdown');
    this.addText(requests, '- oromotor assessment if patient is better able to engage');
    this.addText(requests, '- Aphasia handout/explanation for family');
    this.addParagraphBreak(requests, 2);
  }

  /**
   * Add EXACT Action Planning Table as in MD file (Lines 181-191)
   */
  private addExactActionPlanningTable(requests: any[]): void {
    const tableData = [
      ['Area of focus', 'Recommendation', 'Action'],
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
      ['', '', '']
    ];

    this.addTable(requests, tableData);
    this.addParagraphBreak(requests, 2);
  }

  /**
   * Add administrative section
   */
  private addAdministrativeSection(requests: any[], client: Client): void {
    this.addHeading(requests, 'Appendix', 'HEADING_2');
    this.addText(requests, 'Copy of the test and results will be filed here');
    this.addParagraphBreak(requests);
    this.addText(requests, 'Guidance on completing scoring: https://www.thecopm.ca/learn/');
    this.addParagraphBreak(requests, 2);

    this.addHeading(requests, 'Administrative Information', 'HEADING_2');
    
    const adminData = [
      ['Commencement / Admin Notes', `Date: ${new Date().toLocaleDateString()}`],
      ['', `Prepared by: ${client.addedByUserName || 'System'}`]
    ];

    this.addTable(requests, adminData);
    this.addParagraphBreak(requests);
  }

  /**
   * Add patient information table with all dynamic data
   */
  private addPatientInformationTable(requests: any[], client: Client): void {
    this.addHeading(requests, 'Patient Information', 'HEADING_2');
    
    const demographics = client.demographics;
    const patientData = [
      ['Field', 'Information'],
      ['Name of Patient', client.name || ''],
      ['Date Of Birth', client.dateOfBirth || demographics?.nationality || ''],
      ['Local Address Of Residence', client.address || ''],
      ['Nationality', demographics?.nationality || ''],
      ['ID/Passport Number', demographics?.idPassportNumber || ''],
      ['Gender', demographics?.gender || ''],
      ['Ethnicity', demographics?.ethnicity || ''],
      ['Language/s Preferred', demographics?.languagesPreferred?.join(', ') || ''],
      ['Main Contact Email', demographics?.mainContactEmail || client.email || ''],
      ['Next Of Kin / Main Contact Person', demographics?.nextOfKin?.name || ''],
      ['Relationship Of Next Of Kin', demographics?.nextOfKin?.relationship || ''],
      ['Telephone Number Of Next Of Kin', demographics?.nextOfKin?.phoneNumber || ''],
      ['Reason/s Seeking Rehab Therapy In The Community', demographics?.reasonForRehab || ''],
      ['How Is Your Medical Condition Impacting You', this.formatMedicalImpact(demographics?.medicalConditionImpact)],
      ['Do You Have A Helper / Caregiver?', demographics?.hasHelper ? 'Yes' : 'No'],
      ['Anything else to share?', demographics?.additionalNotes || '']
    ];

    this.addTable(requests, patientData);
    this.addParagraphBreak(requests);
  }

  /**
   * Add assessment templates
   */
  private addAssessmentTemplates(requests: any[]): void {
    this.addHeading(requests, 'Assessment Templates', 'HEADING_2');
    
    // Functional Reassessment Templates
    this.addHeading(requests, 'Functional Reassessment Templates', 'HEADING_3');
    const functionalData = [
      ['Functional Reassessment Templates', 'Updated'],
      ['', 'For use in documentation, copy and paste into new entry as and when needed']
    ];
    this.addTable(requests, functionalData);
    this.addParagraphBreak(requests);

    // Physical Assessment Template
    this.addHeading(requests, 'Physical Assessment Template', 'HEADING_3');
    const physicalData = [
      ['DATE:', 'MAS (F/E)', 'MMT (F/E)', 'PROM F/E', 'AROM F/E'],
      ['Shoulder', '/', '/', 'º / º', 'º / º'],
      ['Elbow', '/', '/', 'º / º', 'º / º'],
      ['Wrist', '/', '/', 'º / º', 'º / º'],
      ['Digits', '/', '/', 'º / º', 'º / º'],
      ['Thumb', '/', '/', 'º / º', 'º / º']
    ];
    this.addTable(requests, physicalData);
    this.addParagraphBreak(requests);

    // Fugl Meyer Assessment Template
    this.addFuglMeyerTemplate(requests);
    
    // FIM Assessment Template
    this.addFIMTemplate(requests);
  }

  /**
   * Add Fugl Meyer assessment template
   */
  private addFuglMeyerTemplate(requests: any[]): void {
    this.addHeading(requests, 'Fugl Meyer Assessment (Upper Limb)', 'HEADING_3');
    
    const fuglData = [
      ['A - MOTOR DATE:', 'Assessment 1', 'Score 1', 'Assessment 2', 'Score 2', 'Assessment 3', 'Score 3'],
      ['Shoulder/Elbow/Forearm', '', '/36', '', '/36', '', '/36'],
      ['Wrist', '', '/10', '', '/10', '', '/10'],
      ['Hand', '', '/14', '', '/14', '', '/14'],
      ['Coordination/Speed', '', '/6', '', '/6', '', '/6'],
      ['TOTAL:', '', '/66', '', '/66', '', '/66']
    ];

    this.addTable(requests, fuglData);
    this.addParagraphBreak(requests);
  }

  /**
   * Add FIM assessment template
   */
  private addFIMTemplate(requests: any[]): void {
    this.addHeading(requests, 'Functional Independence Measure (FIM)', 'HEADING_3');
    
    const fimData = [
      ['FUNCTIONAL INDEPENDENCE MEASURE (FIM)', 'Assessment 1', 'Assessment 2', 'Assessment 3', 'Assessment 4', 'Assessment 5'],
      ['DATE:', '', '', '', '', ''],
      ['Eating', '', '', '', '', ''],
      ['Grooming', '', '', '', '', ''],
      ['Bathing', '', '', '', '', ''],
      ['Upper body dressing', '', '', '', '', ''],
      ['Lower body dressing', '', '', '', '', ''],
      ['Toileting', '', '', '', '', ''],
      ['Transfers', '', '', '', '', '']
    ];

    this.addTable(requests, fimData);
  }

  // Helper methods for formatting and content generation
  private addHeading(requests: any[], text: string, style: string): void {
    requests.push({
      insertText: {
        location: { index: this.currentIndex },
        text: text + '\n'
      }
    });

    requests.push({
      updateParagraphStyle: {
        range: {
          startIndex: this.currentIndex,
          endIndex: this.currentIndex + text.length
        },
        paragraphStyle: {
          namedStyleType: style
        },
        fields: 'namedStyleType'
      }
    });

    this.currentIndex += text.length + 1;
  }

  private addText(requests: any[], text: string, bold: boolean = false): void {
    requests.push({
      insertText: {
        location: { index: this.currentIndex },
        text: text + '\n'
      }
    });

    if (bold) {
      requests.push({
        updateTextStyle: {
          range: {
            startIndex: this.currentIndex,
            endIndex: this.currentIndex + text.length
          },
          textStyle: {
            bold: true
          },
          fields: 'bold'
        }
      });
    }

    this.currentIndex += text.length + 1;
  }

  private addParagraphBreak(requests: any[], count: number = 1): void {
    const breaks = '\n'.repeat(count);
    requests.push({
      insertText: {
        location: { index: this.currentIndex },
        text: breaks
      }
    });
    this.currentIndex += breaks.length;
  }

  private addTable(requests: any[], data: string[][]): void {
    if (data.length === 0) return;

    const rows = data.length;
    const columns = data[0].length;

    // Insert table
    requests.push({
      insertTable: {
        location: { index: this.currentIndex },
        rows: rows,
        columns: columns
      }
    });

    // Update index to account for table structure
    this.currentIndex += 2; // Table creates some initial structure

    // Add table content
    let cellIndex = this.currentIndex;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const cellText = data[row][col] || '';
        if (cellText) {
          requests.push({
            insertText: {
              location: { index: cellIndex },
              text: cellText
            }
          });
          cellIndex += cellText.length;
        }
        cellIndex += 2; // Account for cell structure
      }
    }

    this.currentIndex = cellIndex + 2; // Move past table
  }

  /**
   * Add EXACT Administrative Information Section as in MD file (Lines 199-203)
   */
  private addExactAdministrativeSection(requests: any[], client: Client): void {
    const adminData = [
      ['Commencement / Admin Notes', `Date: ${new Date().toLocaleDateString()}`],
      ['', `Prepared by: ${client.addedByUserName || 'System'}`]
    ];

    this.addTable(requests, adminData);
    this.addParagraphBreak(requests, 2);
  }

  /**
   * Add EXACT Patient Information Table as in MD file (Lines 206-225)
   */
  private addExactPatientInformationTable(requests: any[], client: Client): void {
    const demographics = client.demographics;

    const patientData = [
      ['Field', 'Information'],
      ['Name of Patient', client.name || ''],
      ['Date Of Birth', client.dateOfBirth || ''],
      ['Local Address Of Residence', client.address || ''],
      ['Nationality', demographics?.nationality || ''],
      ['ID/Passport Number', demographics?.idPassportNumber || ''],
      ['Gender', demographics?.gender || ''],
      ['Ethnicity', demographics?.ethnicity || ''],
      ['Language/s Preferred', demographics?.languagesPreferred?.join(', ') || ''],
      ['Main Contact Email', demographics?.mainContactEmail || client.email || ''],
      ['Next Of Kin / Main Contact Person', demographics?.nextOfKin?.name || ''],
      ['Relationship Of Next Of Kin', demographics?.nextOfKin?.relationship || ''],
      ['Telephone Number Of Next Of Kin', demographics?.nextOfKin?.phoneNumber || ''],
      ['Reason/s Seeking Rehab Therapy In The Community', demographics?.reasonForRehab || ''],
      ['How Is Your Medical Condition Impacting You', this.formatMedicalImpact(demographics?.medicalConditionImpact)],
      ['Do You Have A Helper / Caregiver?', demographics?.hasHelper ? 'Yes' : 'No'],
      ['Anything else to share?', demographics?.additionalNotes || '']
    ];

    this.addTable(requests, patientData);
    this.addParagraphBreak(requests, 2);
  }

  /**
   * Add EXACT Assessment Templates as in MD file (Lines 226-266)
   */
  private addExactAssessmentTemplates(requests: any[], assessments: MedicalAssessment[]): void {
    // Functional Reassessment Templates (Lines 228-233)
    this.addHeading(requests, 'Functional Reassessment Templates', 'HEADING_3');
    const functionalData = [
      ['Functional Reassessment Templates', 'Updated'],
      ['', 'For use in documentation, copy and paste into new entry as and when needed']
    ];
    this.addTable(requests, functionalData);
    this.addParagraphBreak(requests);

    // Physical Assessment Template (Lines 235-243)
    this.addHeading(requests, 'Physical Assessment Template', 'HEADING_3');
    const physicalData = [
      ['DATE:', 'MAS (F/E)', 'MMT (F/E)', 'PROM F/E', 'AROM F/E'],
      ['Shoulder', '/', '/', 'º / º', 'º / º'],
      ['Elbow', '/', '/', 'º / º', 'º / º'],
      ['Wrist', '/', '/', 'º / º', 'º / º'],
      ['Digits', '/', '/', 'º / º', 'º / º'],
      ['Thumb', '/', '/', 'º / º', 'º / º']
    ];
    this.addTable(requests, physicalData);
    this.addParagraphBreak(requests);

    // Fugl Meyer Assessment (Upper Limb) (Lines 244-253)
    this.addExactFuglMeyerTemplate(requests, assessments);

    // Functional Independence Measure (FIM) (Lines 254-266)
    this.addExactFIMTemplate(requests, assessments);
  }

  /**
   * Add EXACT Fugl Meyer Assessment Template with actual data
   */
  private addExactFuglMeyerTemplate(requests: any[], assessments: MedicalAssessment[]): void {
    this.addHeading(requests, 'Fugl Meyer Assessment (Upper Limb)', 'HEADING_3');

    // Get latest Fugl Meyer assessment
    const latestFuglMeyer = assessments
      .filter(a => a.fuglMeyer)
      .sort((a, b) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime())[0]?.fuglMeyer;

    const fuglData = [
      ['A - MOTOR DATE:', 'Assessment 1', 'Score 1', 'Assessment 2', 'Score 2', 'Assessment 3', 'Score 3'],
      ['Shoulder/Elbow/Forearm', latestFuglMeyer ? new Date(latestFuglMeyer.assessmentDate).toLocaleDateString() : '', latestFuglMeyer ? `${latestFuglMeyer.shoulderElbowForearm}/36` : '/36', '', '/36', '', '/36'],
      ['Wrist', '', latestFuglMeyer ? `${latestFuglMeyer.wrist}/10` : '/10', '', '/10', '', '/10'],
      ['Hand', '', latestFuglMeyer ? `${latestFuglMeyer.hand}/14` : '/14', '', '/14', '', '/14'],
      ['Coordination/Speed', '', latestFuglMeyer ? `${latestFuglMeyer.coordinationSpeed}/6` : '/6', '', '/6', '', '/6'],
      ['TOTAL:', '', latestFuglMeyer ? `${latestFuglMeyer.total}/66` : '/66', '', '/66', '', '/66']
    ];

    this.addTable(requests, fuglData);
    this.addParagraphBreak(requests);
  }

  /**
   * Add EXACT FIM Assessment Template with actual data
   */
  private addExactFIMTemplate(requests: any[], assessments: MedicalAssessment[]): void {
    this.addHeading(requests, 'Functional Independence Measure (FIM)', 'HEADING_3');

    // Get latest FIM assessment
    const latestFIM = assessments
      .filter(a => a.fim)
      .sort((a, b) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime())[0]?.fim;

    const fimData = [
      ['FUNCTIONAL INDEPENDENCE MEASURE (FIM)', 'Assessment 1', 'Assessment 2', 'Assessment 3', 'Assessment 4', 'Assessment 5'],
      ['DATE:', latestFIM ? new Date(latestFIM.assessmentDate).toLocaleDateString() : '', '', '', '', ''],
      ['Eating', latestFIM?.eating?.toString() || '', '', '', '', ''],
      ['Grooming', latestFIM?.grooming?.toString() || '', '', '', '', ''],
      ['Bathing', latestFIM?.bathing?.toString() || '', '', '', '', ''],
      ['Upper body dressing', latestFIM?.upperBodyDressing?.toString() || '', '', '', '', ''],
      ['Lower body dressing', latestFIM?.lowerBodyDressing?.toString() || '', '', '', '', ''],
      ['Toileting', latestFIM?.toileting?.toString() || '', '', '', '', ''],
      ['Transfers', latestFIM?.transfers?.toString() || '', '', '', '', '']
    ];

    this.addTable(requests, fimData);
    this.addParagraphBreak(requests);
  }

  private formatMedicalImpact(impact: any): string {
    if (!impact) return '';

    const impacts = [];
    if (impact.mobility) impacts.push('Mobility');
    if (impact.foodIntake) impacts.push('Food Intake');
    if (impact.cognition) impacts.push('Cognition');
    if (impact.selfCare) impacts.push('Self Care (Bathing, Dressing, etc)');
    if (impact.accessToHomeCommunity) impacts.push('Access To Home / Community');
    if (impact.homeSafety) impacts.push('Home Safety');
    if (impact.commuting) impacts.push('Commuting');

    return impacts.join(', ');
  }
}
