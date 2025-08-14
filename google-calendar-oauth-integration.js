const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

/**
 * 🎯 LIFEWEAVERS GOOGLE CALENDAR INTEGRATION - OAUTH2 SOLUTION
 * 
 * This is an alternative solution that uses OAuth2 instead of service account keys.
 * This bypasses the private key download issue and provides the same functionality.
 * 
 * Service Account Details (for reference):
 * - Email: lwv-clinic-calendar-service@lwv-calendar-integration.iam.gserviceaccount.com
 * - Project: lwv-calendar-integration
 * - Key IDs: 1cd8f55cd3930aed7e8650bf146034d1d66fbf38, 435cc1b42d4a662676fa09154549405b8c22d27d
 */

class LifeweaversCalendarOAuth {
  constructor() {
    this.oauth2Client = null;
    this.calendar = null;
    this.credentials = {
      client_id: '112692055783990850972-compute@developer.gserviceaccount.com',
      project_id: 'lwv-calendar-integration',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs'
    };
  }

  /**
   * Initialize OAuth2 authentication
   */
  async initializeOAuth() {
    try {
      console.log('🔐 Initializing OAuth2 authentication...');
      
      // Create OAuth2 client
      this.oauth2Client = new google.auth.OAuth2(
        this.credentials.client_id,
        null, // client_secret not needed for service accounts
        'urn:ietf:wg:oauth:2.0:oob' // redirect URI for installed apps
      );

      // Set up the calendar API
      this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      console.log('✅ OAuth2 client initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Error initializing OAuth2:', error.message);
      return false;
    }
  }

  /**
   * Get authorization URL for user to visit
   */
  getAuthUrl() {
    const scopes = ['https://www.googleapis.com/auth/calendar'];
    
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });
    
    return authUrl;
  }

  /**
   * Set credentials from authorization code
   */
  async setCredentials(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      
      // Save tokens for future use
      fs.writeFileSync('tokens.json', JSON.stringify(tokens, null, 2));
      console.log('✅ Credentials set successfully');
      return true;
    } catch (error) {
      console.error('❌ Error setting credentials:', error.message);
      return false;
    }
  }

  /**
   * Load saved tokens
   */
  loadSavedTokens() {
    try {
      if (fs.existsSync('tokens.json')) {
        const tokens = JSON.parse(fs.readFileSync('tokens.json'));
        this.oauth2Client.setCredentials(tokens);
        console.log('✅ Loaded saved tokens');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error loading tokens:', error.message);
      return false;
    }
  }

  /**
   * Test the calendar connection
   */
  async testConnection() {
    try {
      const response = await this.calendar.calendarList.list();
      console.log('✅ Calendar connection test successful!');
      console.log('📅 Available calendars:', response.data.items?.length || 0);
      
      if (response.data.items) {
        response.data.items.forEach(cal => {
          console.log(`  - ${cal.summary} (${cal.id})`);
        });
      }
      
      return true;
    } catch (error) {
      console.error('❌ Calendar connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Create a new appointment in Google Calendar
   */
  async createAppointment(appointmentData, calendarId = 'primary') {
    try {
      const event = {
        summary: appointmentData.title || 'Clinic Appointment',
        description: appointmentData.description || '',
        start: {
          dateTime: appointmentData.startTime,
          timeZone: appointmentData.timeZone || 'America/New_York',
        },
        end: {
          dateTime: appointmentData.endTime,
          timeZone: appointmentData.timeZone || 'America/New_York',
        },
        attendees: appointmentData.attendees || [],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 24 hours before
            { method: 'popup', minutes: 30 }, // 30 minutes before
          ],
        },
        colorId: appointmentData.colorId || '1',
      };

      const response = await this.calendar.events.insert({
        calendarId: calendarId,
        resource: event,
        sendUpdates: 'all',
      });

      console.log('✅ Appointment created successfully');
      console.log(`📅 Event ID: ${response.data.id}`);
      console.log(`🔗 Event Link: ${response.data.htmlLink}`);
      
      return {
        success: true,
        eventId: response.data.id,
        eventLink: response.data.htmlLink,
        event: response.data
      };
    } catch (error) {
      console.error('❌ Error creating appointment:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get appointments for a specific date range
   */
  async getAppointments(startDate, endDate, calendarId = 'primary', maxResults = 50) {
    try {
      const response = await this.calendar.events.list({
        calendarId: calendarId,
        timeMin: startDate,
        timeMax: endDate,
        maxResults: maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const appointments = response.data.items || [];
      console.log(`✅ Retrieved ${appointments.length} appointments`);
      
      return {
        success: true,
        appointments: appointments,
        count: appointments.length
      };
    } catch (error) {
      console.error('❌ Error retrieving appointments:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update an existing appointment
   */
  async updateAppointment(eventId, updateData, calendarId = 'primary') {
    try {
      const existingEvent = await this.calendar.events.get({
        calendarId: calendarId,
        eventId: eventId,
      });

      const updatedEvent = {
        ...existingEvent.data,
        ...updateData,
      };

      const response = await this.calendar.events.update({
        calendarId: calendarId,
        eventId: eventId,
        resource: updatedEvent,
        sendUpdates: 'all',
      });

      console.log('✅ Appointment updated successfully');
      return {
        success: true,
        event: response.data
      };
    } catch (error) {
      console.error('❌ Error updating appointment:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete an appointment
   */
  async deleteAppointment(eventId, calendarId = 'primary') {
    try {
      await this.calendar.events.delete({
        calendarId: calendarId,
        eventId: eventId,
        sendUpdates: 'all',
      });

      console.log('✅ Appointment deleted successfully');
      return {
        success: true,
        eventId: eventId
      };
    } catch (error) {
      console.error('❌ Error deleting appointment:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get today's appointments
   */
  async getTodaysAppointments(calendarId = 'primary') {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
    
    return await this.getAppointments(startOfDay, endOfDay, calendarId);
  }
}

// Example usage and setup
async function setupOAuthIntegration() {
  console.log('🏥 LIFEWEAVERS CLINIC - OAUTH2 CALENDAR INTEGRATION SETUP\n');

  const calendar = new LifeweaversCalendarOAuth();
  
  // Initialize OAuth2
  const initialized = await calendar.initializeOAuth();
  if (!initialized) {
    console.error('Failed to initialize OAuth2');
    return;
  }

  // Try to load saved tokens
  const tokensLoaded = calendar.loadSavedTokens();
  
  if (!tokensLoaded) {
    console.log('🔐 FIRST TIME SETUP - AUTHORIZATION REQUIRED');
    console.log('=' .repeat(60));
    console.log('1. Visit this URL in your browser:');
    console.log('   👉', calendar.getAuthUrl());
    console.log('');
    console.log('2. Sign in with your Google account');
    console.log('3. Grant calendar permissions');
    console.log('4. Copy the authorization code');
    console.log('5. Run: node setup-oauth.js [AUTHORIZATION_CODE]');
    console.log('');
    console.log('💡 After setup, you can use the calendar integration normally!');
    return;
  }

  // Test connection
  console.log('🧪 Testing calendar connection...');
  const connected = await calendar.testConnection();
  
  if (connected) {
    console.log('🎉 OAUTH2 INTEGRATION WORKING PERFECTLY!');
    console.log('✅ Your shared Google Calendar integration is ready!');
  }
}

module.exports = LifeweaversCalendarOAuth;

// Uncomment to run setup
// setupOAuthIntegration().catch(console.error);
