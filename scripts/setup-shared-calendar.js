// scripts/setup-shared-calendar.js
const { google } = require('googleapis');
const path = require('path');

// Load service account credentials
const CREDENTIALS_PATH = path.join(__dirname, '../google-service-account.json');
const credentials = require(CREDENTIALS_PATH);

async function setupSharedCalendar() {
  try {
    // Initialize Google Calendar API with service account
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    const calendar = google.calendar({ version: 'v3', auth });

    // Create a new shared calendar
    const calendarResource = {
      summary: 'LWV Clinic Shared Calendar',
      description: 'Shared calendar for all clinic staff - appointments, sessions, and events',
      timeZone: 'America/New_York', // Change to your timezone
    };

    console.log('Creating shared calendar...');
    const response = await calendar.calendars.insert({
      resource: calendarResource,
    });

    const calendarId = response.data.id;
    console.log('✅ Shared calendar created successfully!');
    console.log('📅 Calendar ID:', calendarId);

    // Make the calendar public (readable by anyone with the link)
    await calendar.acl.insert({
      calendarId: calendarId,
      resource: {
        role: 'reader',
        scope: {
          type: 'default'
        }
      }
    });

    console.log('✅ Calendar made publicly readable');

    // Add some sample events
    const sampleEvents = [
      {
        summary: 'Team Meeting',
        description: 'Weekly team sync meeting',
        start: {
          dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
          timeZone: 'America/New_York',
        },
      },
      {
        summary: 'Client Consultation - Sarah Johnson',
        description: 'Initial consultation session',
        start: {
          dateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
          timeZone: 'America/New_York',
        },
      }
    ];

    console.log('Adding sample events...');
    for (const event of sampleEvents) {
      await calendar.events.insert({
        calendarId: calendarId,
        resource: event,
      });
    }

    console.log('✅ Sample events added');

    // Save calendar ID to environment file
    const fs = require('fs');
    const envContent = `
# Google Calendar Configuration
GOOGLE_CALENDAR_ID=${calendarId}
GOOGLE_SERVICE_ACCOUNT_EMAIL=${credentials.client_email}
`;

    fs.appendFileSync('.env.local', envContent);
    console.log('✅ Calendar ID saved to .env.local');

    console.log('\n🎉 Setup Complete!');
    console.log('📋 Next Steps:');
    console.log('1. Add the service account credentials file to your project');
    console.log('2. Install googleapis package: npm install googleapis');
    console.log('3. Update your environment variables');
    console.log('4. Implement the calendar service');

  } catch (error) {
    console.error('❌ Error setting up calendar:', error);
  }
}

setupSharedCalendar();
