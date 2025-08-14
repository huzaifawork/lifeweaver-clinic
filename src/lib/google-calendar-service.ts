// src/lib/google-calendar-service.ts
import { google } from 'googleapis';

// Types for our calendar events
export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  location?: string;
  colorId?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
}

export interface CalendarEventResponse extends CalendarEvent {
  id: string;
  created: string;
  updated: string;
  creator: {
    email: string;
    displayName?: string;
  };
  organizer: {
    email: string;
    displayName?: string;
  };
  htmlLink: string;
}

class GoogleCalendarService {
  private calendar: any;
  private calendarId: string;

  constructor() {
    // Initialize with service account credentials
    const credentials = {
      type: process.env.GOOGLE_SERVICE_ACCOUNT_TYPE || 'service_account',
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
      auth_uri: process.env.GOOGLE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
      token_uri: process.env.GOOGLE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.GOOGLE_CLIENT_CERT_URL,
    };

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    this.calendar = google.calendar({ version: 'v3', auth });
    this.calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
  }

  // Get all events within a date range
  async getEvents(
    timeMin?: string,
    timeMax?: string,
    maxResults: number = 100
  ): Promise<CalendarEventResponse[]> {
    try {
      const response = await this.calendar.events.list({
        calendarId: this.calendarId,
        timeMin: timeMin || new Date().toISOString(),
        timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw new Error('Failed to fetch calendar events');
    }
  }

  // Create a new event
  async createEvent(event: CalendarEvent): Promise<CalendarEventResponse> {
    try {
      const response = await this.calendar.events.insert({
        calendarId: this.calendarId,
        resource: {
          ...event,
          start: {
            ...event.start,
            timeZone: event.start.timeZone || 'America/New_York',
          },
          end: {
            ...event.end,
            timeZone: event.end.timeZone || 'America/New_York',
          },
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw new Error('Failed to create calendar event');
    }
  }

  // Update an existing event
  async updateEvent(eventId: string, event: Partial<CalendarEvent>): Promise<CalendarEventResponse> {
    try {
      const response = await this.calendar.events.update({
        calendarId: this.calendarId,
        eventId,
        resource: event,
      });

      return response.data;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw new Error('Failed to update calendar event');
    }
  }

  // Delete an event
  async deleteEvent(eventId: string): Promise<void> {
    try {
      await this.calendar.events.delete({
        calendarId: this.calendarId,
        eventId,
      });
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw new Error('Failed to delete calendar event');
    }
  }

  // Get a specific event by ID
  async getEvent(eventId: string): Promise<CalendarEventResponse> {
    try {
      const response = await this.calendar.events.get({
        calendarId: this.calendarId,
        eventId,
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching calendar event:', error);
      throw new Error('Failed to fetch calendar event');
    }
  }

  // Get events for a specific date
  async getEventsForDate(date: Date): Promise<CalendarEventResponse[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.getEvents(startOfDay.toISOString(), endOfDay.toISOString());
  }

  // Search events by text
  async searchEvents(query: string): Promise<CalendarEventResponse[]> {
    try {
      const response = await this.calendar.events.list({
        calendarId: this.calendarId,
        q: query,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Error searching calendar events:', error);
      throw new Error('Failed to search calendar events');
    }
  }
}

// Export singleton instance
export const googleCalendarService = new GoogleCalendarService();
export default googleCalendarService;
