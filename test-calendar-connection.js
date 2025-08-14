// Test Google Calendar Service Connection
const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

async function testCalendarConnection() {
  console.log('🔄 Testing Google Calendar Service Connection...\n');

  try {
    // Initialize with service account credentials
    const credentials = {
      type: process.env.GOOGLE_SERVICE_ACCOUNT_TYPE,
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
      auth_uri: process.env.GOOGLE_AUTH_URI,
      token_uri: process.env.GOOGLE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_CERT_URL,
      client_x509_cert_url: process.env.GOOGLE_CLIENT_CERT_URL,
    };

    console.log('📋 Service Account Details:');
    console.log(`   Project ID: ${credentials.project_id}`);
    console.log(`   Client Email: ${credentials.client_email}`);
    console.log(`   Private Key ID: ${credentials.private_key_id}`);
    console.log(`   Calendar ID: ${process.env.GOOGLE_CALENDAR_ID}\n`);

    // Create auth instance
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    // Create calendar instance
    const calendar = google.calendar({ version: 'v3', auth });
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    console.log('🔗 Testing connection to Google Calendar API...');

    // Test 1: Get calendar info
    try {
      const calendarInfo = await calendar.calendars.get({
        calendarId: calendarId
      });
      console.log('✅ Calendar connection successful!');
      console.log(`   Calendar Name: ${calendarInfo.data.summary}`);
      console.log(`   Calendar Description: ${calendarInfo.data.description || 'No description'}`);
      console.log(`   Time Zone: ${calendarInfo.data.timeZone}`);
    } catch (error) {
      console.log('⚠️  Could not access calendar info (this is normal for primary calendar)');
      console.log(`   Error: ${error.message}`);
    }

    // Test 2: List recent events
    console.log('\n📅 Testing event listing...');
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const eventsResponse = await calendar.events.list({
      calendarId: calendarId,
      timeMin: oneWeekAgo.toISOString(),
      timeMax: oneWeekFromNow.toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = eventsResponse.data.items || [];
    console.log(`✅ Successfully retrieved ${events.length} events from the past/next week`);

    if (events.length > 0) {
      console.log('\n📋 Recent Events:');
      events.slice(0, 3).forEach((event, index) => {
        const start = event.start.dateTime || event.start.date;
        console.log(`   ${index + 1}. ${event.summary} (${start})`);
      });
    }

    // Test 3: Create a test event
    console.log('\n🧪 Testing event creation...');
    const testEvent = {
      summary: 'LWV Calendar Integration Test',
      description: 'This is a test event created by the LWV calendar integration system.',
      start: {
        dateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
        timeZone: 'America/New_York',
      },
    };

    const createdEvent = await calendar.events.insert({
      calendarId: calendarId,
      resource: testEvent,
    });

    console.log('✅ Test event created successfully!');
    console.log(`   Event ID: ${createdEvent.data.id}`);
    console.log(`   Event Link: ${createdEvent.data.htmlLink}`);

    // Test 4: Update the test event
    console.log('\n🔄 Testing event update...');
    const updatedEvent = await calendar.events.update({
      calendarId: calendarId,
      eventId: createdEvent.data.id,
      resource: {
        ...testEvent,
        summary: 'LWV Calendar Integration Test - UPDATED',
        description: 'This test event has been updated successfully.',
      },
    });

    console.log('✅ Test event updated successfully!');

    // Test 5: Delete the test event
    console.log('\n🗑️  Testing event deletion...');
    await calendar.events.delete({
      calendarId: calendarId,
      eventId: createdEvent.data.id,
    });

    console.log('✅ Test event deleted successfully!');

    console.log('\n🎉 ALL TESTS PASSED! Google Calendar integration is working perfectly!');
    console.log('\n📝 Summary:');
    console.log('   ✅ Service account authentication working');
    console.log('   ✅ Calendar access granted');
    console.log('   ✅ Event listing working');
    console.log('   ✅ Event creation working');
    console.log('   ✅ Event updating working');
    console.log('   ✅ Event deletion working');
    console.log('\n🚀 Your shared calendar integration is ready to use!');

  } catch (error) {
    console.error('❌ Calendar connection test failed:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    
    if (error.message.includes('insufficient authentication scopes')) {
      console.error('\n💡 Suggestion: Make sure the service account has Calendar API access');
    } else if (error.message.includes('Calendar usage limits exceeded')) {
      console.error('\n💡 Suggestion: Wait a moment and try again (API quota limit)');
    } else if (error.message.includes('Not Found')) {
      console.error('\n💡 Suggestion: Check if the calendar ID is correct');
    }
  }
}

// Run the test
testCalendarConnection();
