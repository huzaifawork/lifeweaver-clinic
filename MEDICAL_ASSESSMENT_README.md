# Medical Assessment System - Lifeweavers

## Overview

The Lifeweavers app has been enhanced with a comprehensive medical assessment system that allows healthcare professionals to:

1. **Collect detailed client demographics** including nationality, ID, gender, ethnicity, languages, next of kin information
2. **Perform standardized medical assessments** including Fugl Meyer Assessment, Functional Independence Measure (FIM), and Range of Motion assessments
3. **Generate professional Google Docs** with the exact format from the medical template
4. **Automatically append session data** to existing documents
5. **Manage document versions** and share with team members

## Features Implemented

### ✅ **Enhanced Type Definitions**
- Extended `Client` interface with medical demographics
- Added `FuglMeyerAssessment`, `FIMAssessment`, `RangeOfMotionAssessment` interfaces
- Created `MedicalAssessment` combined interface
- Added `GoogleDocumentInfo` for document tracking

### ✅ **Medical Assessment Components**
- **ClientDemographicsForm**: Complete demographics collection form
- **FuglMeyerAssessmentForm**: Upper limb motor assessment with automatic scoring
- **FIMAssessmentForm**: Functional independence measure with 1-7 scale
- **RangeOfMotionForm**: Comprehensive ROM assessment with tabbed interface
- **MedicalAssessmentTabs**: Main dashboard combining all assessment forms

### ✅ **Firebase Integration**
- New `medical_assessments` collection for storing assessment data
- New `google_documents` collection for tracking generated documents
- Complete CRUD operations for assessments
- Document metadata tracking and versioning

### ✅ **Google Docs Integration**
- **Google Docs API service** for document creation and manipulation
- **Document generation service** for business logic coordination
- **Automatic document formatting** matching the medical template exactly
- **Session append functionality** for updating existing documents

### ✅ **Enhanced Client Detail Page**
- **Tabbed interface** with Sessions, Medical Assessments, and Reports
- **Real-time document generation** with progress indicators
- **Assessment completion tracking** with visual progress
- **Document management** with direct links to Google Docs

### ✅ **Session Integration**
- **Append to Google Doc** functionality in session cards
- **Automatic document updates** when new sessions are added
- **Document status indicators** showing when documents exist

### ✅ **Document Management**
- **Document dashboard** showing all client documents
- **Document statistics** and version tracking
- **Share functionality** with clipboard integration
- **Direct access** to Google Docs with external links

## Document Template Structure

The generated Google Docs follow the exact structure from the medical template:

### **Header Section**
- Lifeweavers branding and confidentiality notice
- Client name, date of birth, and address

### **Demographics Section**
- Nationality, ID/Passport number, gender, ethnicity
- Language preferences and contact information
- Next of kin details with relationship and phone
- Reason for rehabilitation therapy
- Medical condition impact checklist
- Helper/caregiver status

### **Assessment Tables**
- **Fugl Meyer Assessment (Upper Limb)** with motor section scoring
- **Functional Independence Measure (FIM)** with daily living activities
- **Range of Motion Assessment** with MAS, MMT, PROM, AROM measurements

### **Session Updates**
- Chronological session notes with clinician information
- Assessment notes and treatment plans
- Progress tracking over time

## Setup Instructions

### 1. **Google Service Account Setup**
```bash
# Create a Google Cloud Project
# Enable Google Docs API and Google Drive API
# Create a service account with appropriate permissions
# Download the service account key JSON
```

### 2. **Environment Variables**
Add to your `.env.local`:
```env
# Google Docs API Configuration
GOOGLE_PROJECT_ID=your_google_project_id
GOOGLE_PRIVATE_KEY_ID=your_private_key_id
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CLIENT_EMAIL=your_service_account@your_project.iam.gserviceaccount.com
GOOGLE_CLIENT_ID=your_client_id
```

### 3. **Install Dependencies**
```bash
npm install googleapis
```

### 4. **Firebase Collections**
The following collections will be automatically created:
- `medical_assessments` - Stores all medical assessment data
- `google_documents` - Tracks generated Google Docs metadata

## Usage Guide

### **For Clinicians:**

1. **Navigate to Client Detail Page**
   - Select a client from the cases list
   - Click on the "Medical Assessments" tab

2. **Complete Demographics**
   - Fill out comprehensive client demographics
   - Include next of kin and contact information
   - Specify medical condition impacts

3. **Perform Assessments**
   - **Fugl Meyer**: Score upper limb motor function (/66 total)
   - **FIM**: Rate daily living activities (1-7 scale)
   - **Range of Motion**: Measure MAS, MMT, PROM, AROM for each body part

4. **Generate Documents**
   - Click "Generate Doc" to create initial Google Doc
   - Document automatically includes all completed assessments
   - Share document link with team members

5. **Update Documents**
   - Add new session notes in the "Sessions & Tasks" tab
   - Use "Add to Google Doc" button to append sessions
   - Documents maintain chronological session history

### **For Administrators:**

1. **Monitor Document Generation**
   - View document statistics in the Reports tab
   - Track completion rates across clients
   - Manage document sharing and permissions

2. **Team Coordination**
   - Assign team members to clients
   - Share assessment documents with relevant clinicians
   - Track assessment completion progress

## Technical Architecture

### **Frontend Components**
```
src/components/medical/
├── ClientDemographicsForm.tsx
├── FuglMeyerAssessmentForm.tsx
├── FIMAssessmentForm.tsx
├── RangeOfMotionForm.tsx
└── MedicalAssessmentTabs.tsx

src/components/documents/
└── DocumentManagement.tsx
```

### **Backend Services**
```
src/lib/services/
├── googleDocsService.ts
└── documentGenerationService.ts

src/lib/firebase/
├── assessments.ts
└── googleDocs.ts
```

### **API Routes**
```
src/app/api/documents/
└── generate/route.ts
```

### **Hooks**
```
src/hooks/
└── useDocumentGeneration.ts
```

## Data Flow

1. **Assessment Creation**: Clinician completes assessment forms → Data saved to Firebase
2. **Document Generation**: User clicks generate → Service creates Google Doc → Metadata saved to Firebase
3. **Session Updates**: New session added → Automatically appended to existing Google Doc
4. **Document Management**: Users can view, share, and access all generated documents

## Security & Privacy

- **Google Service Account**: Secure API access with proper scoping
- **Firebase Security Rules**: Restrict access based on user roles
- **Document Sharing**: Controlled sharing with team members only
- **Data Encryption**: All data encrypted in transit and at rest
- **Audit Trail**: Complete tracking of document creation and updates

## Future Enhancements

- **PDF Export**: Generate PDF versions of assessments
- **Template Customization**: Allow clinics to customize document templates
- **Bulk Operations**: Generate documents for multiple clients
- **Advanced Analytics**: Assessment trends and outcome tracking
- **Integration**: Connect with external EMR systems

## Support

For technical support or questions about the medical assessment system, please contact the development team or refer to the main application documentation.

---

**Note**: This system complies with healthcare documentation standards and maintains patient confidentiality through secure Google Workspace integration.
