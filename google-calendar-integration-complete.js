const { google } = require('googleapis');
const fs = require('fs');

/**
 * Complete Google Calendar Integration for Lifeweavers Clinic
 * 
 * Service Account Details:
 * - Email: lwv-clinic-calendar-service@lwv-calendar-integration.iam.gserviceaccount.com
 * - Project: lwv-calendar-integration
 * - Key ID: 1cd8f55cd3930aed7e8650bf146034d1d66fbf38
 */

class LifeweaversCalendarIntegration {
  constructor(serviceAccountKeyPath, calendarId) {
    this.serviceAccountKeyPath = serviceAccountKeyPath;
    this.calendarId = calendarId;
    this.calendar = null;
    this.auth = null;
  }

  /**
   * Initialize the Google Calendar API client
   */
  async initialize() {
    try {
      // Load service account credentials
      const serviceAccount = JSON.parse(fs.readFileSync(this.serviceAccountKeyPath));
      
      // Create JWT client for service account authentication
      this.auth = new google.auth.JWT(
        serviceAccount.client_email,
        null,
        serviceAccount.private_key,
        ['https://www.googleapis.com/auth/calendar']
      );

      // Initialize Calendar API
      this.calendar = google.calendar({ version: 'v3', auth: this.auth });
      
      console.log('✅ Lifeweavers Google Calendar integration initialized successfully');
      console.log(`📧 Service Account: ${serviceAccount.client_email}`);
      
      return true;
    } catch (error) {
      console.error('❌ Error initializing Google Calendar:', error.message);
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
  async createAppointment(appointmentData) {
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
        colorId: appointmentData.colorId || '1', // Optional: color coding
      };

      const response = await this.calendar.events.insert({
        calendarId: this.calendarId,
        resource: event,
        sendUpdates: 'all', // Send email notifications to attendees
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
  async getAppointments(startDate, endDate, maxResults = 50) {
    try {
      const response = await this.calendar.events.list({
        calendarId: this.calendarId,
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
  async updateAppointment(eventId, updateData) {
    try {
      // First get the existing event
      const existingEvent = await this.calendar.events.get({
        calendarId: this.calendarId,
        eventId: eventId,
      });

      // Merge with update data
      const updatedEvent = {
        ...existingEvent.data,
        ...updateData,
      };

      const response = await this.calendar.events.update({
        calendarId: this.calendarId,
        eventId: eventId,
        resource: updatedEvent,
        sendUpdates: 'all',
      });

      console.log('✅ Appointment updated successfully');
      console.log(`📅 Event ID: ${eventId}`);
      
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
  async deleteAppointment(eventId) {
    try {
      await this.calendar.events.delete({
        calendarId: this.calendarId,
        eventId: eventId,
        sendUpdates: 'all',
      });

      console.log('✅ Appointment deleted successfully');
      console.log(`📅 Event ID: ${eventId}`);
      
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
  async getTodaysAppointments() {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
    
    return await this.getAppointments(startOfDay, endOfDay);
  }

  /**
   * Get this week's appointments
   */
  async getWeeklyAppointments() {
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay())).toISOString();
    const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6)).toISOString();
    
    return await this.getAppointments(startOfWeek, endOfWeek);
  }
}

// Example usage and testing
async function example() {
  console.log('🏥 Lifeweavers Clinic - Google Calendar Integration Test\n');

  // Initialize the calendar integration
  const calendarIntegration = new LifeweaversCalendarIntegration(
    './lwv-calendar-service-account-key.json', // Path to your service account key
    'primary' // Use 'primary' for the main calendar, or specify a calendar ID
  );

  // Initialize the connection
  const initialized = await calendarIntegration.initialize();
  if (!initialized) {
    console.error('Failed to initialize calendar integration');
    return;
  }

  // Test connection
  const connected = await calendarIntegration.testConnection();
  if (!connected) {
    console.error('Failed to connect to Google Calendar');
    return;
  }

  // Example: Create a sample appointment
  const appointmentData = {
    title: 'Patient Consultation - John Doe',
    description: 'Regular checkup appointment\nPatient ID: 12345\nDoctor: Dr. Smith',
    startTime: '2025-07-25T10:00:00-05:00',
    endTime: '2025-07-25T11:00:00-05:00',
    attendees: [
      { email: 'patient@example.com', displayName: 'John Doe' },
      { email: 'doctor@clinic.com', displayName: 'Dr. Smith' }
    ],
    colorId: '2' // Green color for appointments
  };

  console.log('\n📅 Creating sample appointment...');
  const createResult = await calendarIntegration.createAppointment(appointmentData);
  
  if (createResult.success) {
    console.log('✅ Sample appointment created successfully!');
    
    // Get today's appointments
    console.log('\n📋 Getting today\'s appointments...');
    const todaysAppointments = await calendarIntegration.getTodaysAppointments();
    
    if (todaysAppointments.success) {
      console.log(`📅 Found ${todaysAppointments.count} appointments for today`);
    }
  }
}

module.exports = LifeweaversCalendarIntegration;

// Uncomment to run the example
// example().catch(console.error);
