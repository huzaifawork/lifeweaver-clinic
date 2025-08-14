export type UserRole = "Super Admin" | "Admin" | "Clinician" | "New User";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  vocation?: string; // e.g., Physiotherapist, Occupational Therapist
  password?: string; // Optional for display purposes, required for creation
  profileImage?: string; // Base64 encoded image or URL
}

// Extended Client Demographics for Medical Assessment
export interface ClientDemographics {
  nationality?: string;
  idPassportNumber?: string;
  gender?: 'Male' | 'Female' | 'Other';
  ethnicity?: string;
  languagesPreferred?: string[];
  mainContactEmail?: string;
  nextOfKin?: {
    name: string;
    relationship: string;
    phoneNumber: string;
  };
  reasonForRehab?: string;
  medicalConditionImpact?: {
    mobility?: boolean;
    foodIntake?: boolean;
    cognition?: boolean;
    selfCare?: boolean;
    accessToHomeCommunity?: boolean;
    homeSafety?: boolean;
    commuting?: boolean;
  };
  hasHelper?: boolean;
  helperStatus?: string;
  additionalNotes?: string;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  location?: string;
  emergencyContact?: string;
  medicalHistory?: string;
  currentMedications?: string;
  allergies?: string;
  notes?: string;
  isActive?: boolean;
  dateAdded: string; // ISO string
  teamMemberIds?: string[]; // Array of clinician User IDs
  addedByUserId?: string;
  addedByUserName?: string;

  // Extended medical assessment data
  demographics?: ClientDemographics;
  googleDocId?: string; // ID of the generated Google Doc
  lastDocumentUpdate?: string; // ISO string
}

export interface Attachment {
  id: string; // Unique ID for the attachment, e.g., a UUID or driveFileId
  name: string; // Filename, e.g., "progress_report.pdf"
  mimeType: string; // MIME type, e.g., "application/pdf", "image/jpeg"
  url: string; // URL to the file, e.g., a Google Drive link or a placeholder
  previewUrl?: string; // Optional URL for a direct preview (e.g., for images)
  fileType:
    | "pdf"
    | "image"
    | "video"
    | "document"
    | "spreadsheet"
    | "presentation"
    | "other";
}

// Medical Assessment Interfaces

// Fugl Meyer Assessment (Upper Limb) - Motor Section
export interface FuglMeyerAssessment {
  id: string;
  clientId: string;
  assessmentDate: string; // ISO string
  assessorId: string;
  assessorName: string;

  // Motor section scores (out of maximum points)
  shoulderElbowForearm: number; // /36
  wrist: number; // /10
  hand: number; // /14
  coordinationSpeed: number; // /6
  total: number; // /66

  notes?: string;
}

// Functional Independence Measure (FIM)
export interface FIMAssessment {
  id: string;
  clientId: string;
  assessmentDate: string; // ISO string
  assessorId: string;
  assessorName: string;

  // FIM scores (1-7 scale typically)
  eating?: number;
  grooming?: number;
  bathing?: number;
  upperBodyDressing?: number;
  lowerBodyDressing?: number;
  toileting?: number;
  transfers?: number;

  notes?: string;
}

// Range of Motion Assessment
export interface RangeOfMotionAssessment {
  id: string;
  clientId: string;
  assessmentDate: string; // ISO string
  assessorId: string;
  assessorName: string;

  // Assessment data for different body parts
  shoulder?: BodyPartAssessment;
  elbow?: BodyPartAssessment;
  wrist?: BodyPartAssessment;
  digits?: BodyPartAssessment;
  thumb?: BodyPartAssessment;

  notes?: string;
}

export interface BodyPartAssessment {
  // Modified Ashworth Scale (Flexion/Extension)
  masFlexion?: number;
  masExtension?: number;

  // Manual Muscle Testing (Flexion/Extension)
  mmtFlexion?: number;
  mmtExtension?: number;

  // Passive Range of Motion (degrees)
  promFlexion?: number;
  promExtension?: number;

  // Active Range of Motion (degrees)
  aromFlexion?: number;
  aromExtension?: number;
}

// Combined Medical Assessment for a session
export interface MedicalAssessment {
  id: string;
  clientId: string;
  sessionId?: string;
  assessmentDate: string; // ISO string
  assessorId: string;
  assessorName: string;

  fuglMeyer?: FuglMeyerAssessment;
  fim?: FIMAssessment;
  rangeOfMotion?: RangeOfMotionAssessment;

  // General assessment notes
  generalNotes?: string;
  treatmentPlan?: string;
  nextSteps?: string;
}

export interface SessionNote {
  id: string;
  clientId: string;
  clientName?: string; // Added for convenience
  sessionNumber?: number; // Made optional since it might be auto-generated
  dateOfSession: string; // ISO string
  attendingClinicianId: string;
  attendingClinicianName: string;
  attendingClinicianVocation?: string;
  content: string; // Rich text content / HTML
  sessionType?: string; // Added for session type
  duration?: number; // Added for session duration in minutes
  location?: string; // Added for session location
  attachments?: Attachment[]; // Array of attached files
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  createdByUserId?: string; // Added for tracking who created the session
  createdByUserName?: string; // Added for tracking who created the session
  googleDocumentId?: string; // Google Docs document ID for auto-created docs
  googleDocumentUrl?: string; // Google Docs document URL for direct access

  // Medical Assessment data for this session
  medicalAssessment?: MedicalAssessment;

  // For version history, more fields would be needed
}

// Appointment Management Types
export type AppointmentType = "appointment" | "consultation" | "follow-up" | "assessment" | "meeting";
export type AppointmentStatus = "confirmed" | "tentative" | "cancelled" | "completed";

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  attendingClinicianId: string;
  attendingClinicianName: string;
  attendingClinicianVocation?: string;
  type: AppointmentType;
  status: AppointmentStatus;
  dateOfSession: string; // ISO string
  duration: number; // Duration in minutes
  location?: string;
  content?: string; // Notes or description
  isRecurring?: boolean;
  recurringPattern?: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  createdByUserId: string;
  createdByUserName: string;
  googleCalendarEventId?: string; // Google Calendar event ID for sync
  googleDocumentId?: string; // Google Docs document ID for auto-created docs
  googleDocumentUrl?: string; // Google Docs document URL for direct access
}

// Notifications and Messages Types

export type NotificationType =
  | "admin_broadcast"
  | "system_update"
  | "team_alert";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  timestamp: string; // ISO string
  read: boolean;
  recipientUserIds?: string[]; // Undefined or empty for broadcast to all, specific IDs for targeted
  relatedLink?: string; // Optional link, e.g., to a client page or session
  senderName?: string; // Name of the user who created the notification
  senderRole?: string; // Role of the user who created the notification
}

export type MessageThreadType = "dm" | "team_chat";

export interface MessageThread {
  id: string;
  type: MessageThreadType;
  name?: string; // e.g., "Team John Doe Chat" or "DM with Casey Clinician"
  participantIds: string[]; // User IDs
  clientTeamId?: string; // clientId if it's a team_chat
  lastMessageTimestamp: string; // ISO string
  lastMessageSnippet?: string;
  unreadCount: number; // Unread messages for the current user in this thread
  unreadCounts?: { [userId: string]: number }; // Unread counts per user
  avatarUrl?: string; // For DM or team avatar
  avatarFallback?: string;
  hasUnreadMessages?: boolean; // Helper for UI to show badges
  deletedForUsers?: string[]; // Array of user IDs who have deleted this thread for themselves
  deletedAtTimestamps?: { [userId: string]: string }; // Timestamp when each user deleted the thread
}

export interface MessageReaction {
  emoji: string;
  userIds: string[]; // Array of user IDs who reacted with this emoji
  userNames: string[]; // Array of user names for display
}

export interface MessageReply {
  messageId: string; // ID of the message being replied to
  content: string; // Content of the original message
  senderName: string; // Name of the original sender
  senderId: string; // ID of the original sender
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string;
  senderAvatarFallback?: string;
  content: string;
  timestamp: string; // ISO string
  type?: 'user' | 'system'; // Message type to distinguish between user and system messages
  isOwnMessage?: boolean; // Helper for UI rendering
  reactions?: MessageReaction[]; // Array of reactions to this message
  replyTo?: MessageReply; // If this message is a reply to another message
  isDeleted?: boolean; // If message is deleted
  deletedFor?: 'me' | 'everyone'; // Delete type
  deletedAt?: string; // When message was deleted
  editedAt?: string; // When message was last edited
}

// Special Notification for Banners
export interface SpecialNotification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "critical" | "promo";
  link?: string;
  // isActive is managed by the component displaying the banner list
}

// Things To Do Feature
export interface ToDoTask {
  id: string;
  clientId: string;
  description: string;
  isDone: boolean;
  createdAt: string; // ISO string
  addedByUserId: string;
  addedByUserName: string;
  assignedToUserIds: string[]; // Array of user IDs task is assigned to
  assignedToUserNames?: string[]; // Array of names of users task is assigned to
  completedAt?: string; // ISO string
  completedByUserId?: string;
  completedByUserName?: string;
  dueDate?: string; // ISO string (just date part: YYYY-MM-DD)
  isSystemGenerated?: boolean;
  notes?: string; // Optional field for additional notes on the task
}

// Progress Review Report
export interface ProgressReviewReport {
  id: string;
  clientId: string;
  clientName: string; // Added for convenience in the report
  generatedAt: string; // ISO string
  generatedByUserId: string;
  generatedByUserName: string;
  reportHtmlContent: string; // AI-generated report text in HTML format
  googleDocumentId?: string; // Google Docs document ID for the report
  googleDocumentUrl?: string; // Google Docs document URL for direct access
}

// Google Docs Integration Types
export interface GoogleDocumentInfo {
  id: string;
  clientId: string;
  documentId: string; // Google Docs document ID
  documentUrl: string; // Google Docs document URL
  documentName: string; // Document title
  documentType: 'client_assessment' | 'session_notes' | 'progress_report';
  createdAt: string; // ISO string
  lastUpdated: string; // ISO string
  createdByUserId: string;
  createdByUserName: string;
}

// Document Generation Request
export interface DocumentGenerationRequest {
  clientId: string;
  templateType: 'full_assessment' | 'session_update' | 'progress_report';
  includeAssessments?: boolean;
  includeSessions?: boolean;
  sessionIds?: string[]; // Specific sessions to include
  assessmentIds?: string[]; // Specific assessments to include
}

// Knowledge Base Article
export interface KnowledgeBaseArticle {
  id: string;
  slug: string; // URL-friendly identifier
  title: string;
  content: string; // HTML content
  excerpt?: string; // Short summary
  authorId: string;
  authorName: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  publishedAt?: string; // ISO string, if published
  isPublished: boolean;
  tags?: string[];
  coverImageUrl?: string;
  attachments?: Attachment[];
  viewCount?: number;
}

// Resource Item
export interface Resource {
  id: string;
  slug: string; // URL-friendly identifier
  title: string;
  content: string; // HTML content for description or notes
  excerpt?: string; // Short summary
  authorId: string; // User ID of who added/manages it
  authorName: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  publishedAt?: string; // ISO string, if published
  isPublished: boolean;
  tags?: string[];
  coverImageUrl?: string;
  attachments?: Attachment[]; // Key part for resources
  externalLink?: string; // If the resource is primarily an external link
  resourceType:
    | "document"
    | "video"
    | "website"
    | "tool"
    | "guide"
    | "image"
    | "other"; // To categorize resources
  viewCount?: number;
}

// Auth Context
export interface AuthContextType {
  user: User | null; // This will be the original logged-in user
  currentUser: User | null; // This will be the impersonated user, or original if not impersonating
  loading: boolean;
  isImpersonating: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (useRedirect?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  startImpersonation: (targetUser: User) => Promise<void>;
  stopImpersonation: () => Promise<void>;
  refreshUser: () => Promise<void>;
}
