const { google } = require('googleapis');
const fs = require('fs');

class GoogleCalendarIntegration {
  constructor(serviceAccountPath, calendarId) {
    this.serviceAccountPath = serviceAccountPath;
    this.calendarId = calendarId;
    this.calendar = null;
    this.init();
  }

  init() {
    try {
      // Load service account credentials
      const serviceAccount = JSON.parse(fs.readFileSync(this.serviceAccountPath));
      
      // Create JWT client for service account authentication
      const jwtClient = new google.auth.JWT(
        serviceAccount.client_email,
        null,
        serviceAccount.private_key,
        ['https://www.googleapis.com/auth/calendar']
      );

      // Initialize Calendar API
      this.calendar = google.calendar({ version: 'v3', auth: jwtClient });
      
      console.log('✅ Google Calendar integration initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Google Calendar:', error.message);
    }
  }

  // Create a new appointment/event
  async createAppointment(appointmentData) {
    try {
      const event = {
        summary: appointmentData.title || 'Clinic Appointment',
        description: appointmentData.description || '',
        start: {
          dateTime: appointmentData.startTime,
          timeZone: 'America/New_York', // Adjust to your timezone
        },
        end: {
          dateTime: appointmentData.endTime,
          timeZone: 'America/New_York', // Adjust to your timezone
        },
        attendees: appointmentData.attendees || [],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 24 hours before
            { method: 'popup', minutes: 30 }, // 30 minutes before
          ],
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: this.calendarId,
        resource: event,
      });

      console.log('✅ Event created successfully:', response.data.id);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating event:', error.message);
      throw error;
    }
  }

  // Get appointments for a date range
  async getAppointments(startDate, endDate) {
    try {
      const response = await this.calendar.events.list({
        calendarId: this.calendarId,
        timeMin: startDate,
        timeMax: endDate,
        singleEvents: true,
        orderBy: 'startTime',
      });

      console.log(`✅ Retrieved ${response.data.items.length} appointments`);
      return response.data.items;
    } catch (error) {
      console.error('❌ Error retrieving appointments:', error.message);
      throw error;
    }
  }

  // Update an existing appointment
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
      });

      console.log('✅ Event updated successfully:', eventId);
      return response.data;
    } catch (error) {
      console.error('❌ Error updating event:', error.message);
      throw error;
    }
  }

  // Delete an appointment
  async deleteAppointment(eventId) {
    try {
      await this.calendar.events.delete({
        calendarId: this.calendarId,
        eventId: eventId,
      });

      console.log('✅ Event deleted successfully:', eventId);
      return true;
    } catch (error) {
      console.error('❌ Error deleting event:', error.message);
      throw error;
    }
  }

  // Test calendar access
  async testConnection() {
    try {
      const response = await this.calendar.calendarList.list();
      console.log('✅ Calendar connection test successful!');
      console.log('Available calendars:', response.data.items.map(cal => ({
        id: cal.id,
        summary: cal.summary
      })));
      return true;
    } catch (error) {
      console.error('❌ Calendar connection test failed:', error.message);
      return false;
    }
  }
}

// Example usage
async function example() {
  // Initialize the calendar integration
  const calendarIntegration = new GoogleCalendarIntegration(
    './service-account-key.json', // Path to your service account key
    'your-calendar-id@group.calendar.google.com' // Your calendar ID
  );

  // Test connection
  await calendarIntegration.testConnection();

  // Create a sample appointment
  const appointmentData = {
    title: 'Patient Consultation - John Doe',
    description: 'Regular checkup appointment',
    startTime: '2025-07-25T10:00:00-05:00',
    endTime: '2025-07-25T11:00:00-05:00',
    attendees: [
      { email: 'patient@example.com' },
      { email: 'doctor@clinic.com' }
    ]
  };

  try {
    const event = await calendarIntegration.createAppointment(appointmentData);
    console.log('Created event ID:', event.id);

    // Get appointments for today
    const today = new Date().toISOString();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const appointments = await calendarIntegration.getAppointments(today, tomorrow);
    console.log('Today\'s appointments:', appointments.length);

  } catch (error) {
    console.error('Example failed:', error.message);
  }
}

module.exports = GoogleCalendarIntegration;

// Uncomment to run example
// example();
