// src/lib/google-calendar-oauth.ts
import { google } from 'googleapis';

export interface GoogleCalendarTokens {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expiry_date?: number;
}

export interface UserCalendarConnection {
  userId: string;
  email: string;
  tokens: GoogleCalendarTokens;
  connectedAt: string;
  lastSyncAt?: string;
}

class GoogleCalendarOAuth {
  private oauth2Client: any;
  private calendar: any;

  constructor() {
    // Initialize OAuth2 client - will be configured per user
    this.oauth2Client = new google.auth.OAuth2();
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Initialize with user's tokens from Firebase Auth
   */
  initializeWithTokens(tokens: GoogleCalendarTokens): void {
    console.log('🔑 Setting OAuth credentials:', {
      hasAccessToken: !!tokens.access_token,
      tokenType: tokens.token_type,
      scope: tokens.scope,
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: tokens.expiry_date
    });

    this.oauth2Client.setCredentials(tokens);
  }

  /**
   * Set credentials for API calls
   */
  setCredentials(tokens: GoogleCalendarTokens) {
    this.oauth2Client.setCredentials(tokens);
  }

  /**
   * Refresh access token if needed
   */
  async refreshTokenIfNeeded(tokens: GoogleCalendarTokens): Promise<GoogleCalendarTokens> {
    try {
      this.oauth2Client.setCredentials(tokens);
      
      // Check if token is expired or will expire soon (within 5 minutes)
      const now = Date.now();
      const expiryTime = tokens.expiry_date || 0;
      const fiveMinutes = 5 * 60 * 1000;

      if (expiryTime - now < fiveMinutes) {
        console.log('Refreshing Google Calendar token...');
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        return credentials as GoogleCalendarTokens;
      }

      return tokens;
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw new Error('Failed to refresh Google Calendar token');
    }
  }

  /**
   * Get user's calendar info
   */
  async getUserCalendarInfo(): Promise<any> {
    try {
      const response = await this.calendar.calendars.get({
        calendarId: 'primary'
      });
      return response.data;
    } catch (error) {
      console.error('Error getting calendar info:', error);
      throw new Error('Failed to get calendar information');
    }
  }

  /**
   * Create event in user's calendar
   */
  async createEvent(eventData: any, calendarId: string = 'primary'): Promise<any> {
    try {
      console.log('📅 Creating Google Calendar event with data:', {
        calendarId,
        summary: eventData.summary,
        start: eventData.start,
        end: eventData.end,
        description: eventData.description?.substring(0, 100) + '...'
      });

      const response = await this.calendar.events.insert({
        calendarId,
        resource: eventData,
      });

      console.log('✅ Google Calendar API response:', {
        eventId: response.data.id,
        status: response.status,
        summary: response.data.summary
      });

      return response.data;
    } catch (error) {
      console.error('❌ Google Calendar API error details:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        status: (error as any)?.status,
        details: (error as any)?.details,
        fullError: error
      });

      throw new Error(`Failed to create calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update event in user's calendar
   */
  async updateEvent(eventId: string, eventData: any, calendarId: string = 'primary'): Promise<any> {
    try {
      const response = await this.calendar.events.update({
        calendarId,
        eventId,
        resource: eventData,
      });
      return response.data;
    } catch (error) {
      console.error('Error updating event:', error);
      throw new Error('Failed to update calendar event');
    }
  }

  /**
   * Delete event from user's calendar
   */
  async deleteEvent(eventId: string, calendarId: string = 'primary'): Promise<void> {
    try {
      await this.calendar.events.delete({
        calendarId,
        eventId,
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      throw new Error('Failed to delete calendar event');
    }
  }

  /**
   * Get events from user's calendar
   */
  async getEvents(
    timeMin?: string,
    timeMax?: string,
    maxResults: number = 100,
    calendarId: string = 'primary'
  ): Promise<any[]> {
    try {
      const response = await this.calendar.events.list({
        calendarId,
        timeMin: timeMin || new Date().toISOString(),
        timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Error getting events:', error);
      throw new Error('Failed to get calendar events');
    }
  }

  /**
   * Test connection to user's calendar
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getUserCalendarInfo();
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const googleCalendarOAuth = new GoogleCalendarOAuth();
export default googleCalendarOAuth;
