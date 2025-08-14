// Setup Shared Calendar for LWV Clinic
const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

async function setupSharedCalendar() {
  console.log('🏥 Setting up LWV Clinic Shared Calendar...\n');

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

    // Create auth instance
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    // Create calendar instance
    const calendar = google.calendar({ version: 'v3', auth });

    console.log('📅 Creating shared calendar for LWV Clinic...');

    // Create a new calendar specifically for the clinic
    const newCalendar = {
      summary: 'LWV Clinic Appointments',
      description: 'Shared calendar for all LWV Clinic appointments. All staff members can view and manage appointments here.',
      timeZone: 'America/New_York',
    };

    const createdCalendar = await calendar.calendars.insert({
      resource: newCalendar,
    });

    const calendarId = createdCalendar.data.id;
    console.log('✅ Shared calendar created successfully!');
    console.log(`   Calendar ID: ${calendarId}`);
    console.log(`   Calendar Name: ${createdCalendar.data.summary}`);
    console.log(`   Time Zone: ${createdCalendar.data.timeZone}`);

    // Make the calendar public (readable by anyone with the link)
    console.log('\n🔓 Setting up calendar permissions...');
    
    // Add a rule to make it readable by anyone with the link
    await calendar.acl.insert({
      calendarId: calendarId,
      resource: {
        role: 'reader',
        scope: {
          type: 'default'
        }
      }
    });

    console.log('✅ Calendar permissions set up successfully!');
    console.log('   - Calendar is now readable by anyone with the link');
    console.log('   - Service account has full management access');

    // Create a sample appointment to test
    console.log('\n🧪 Creating sample appointment...');
    const sampleAppointment = {
      summary: 'Sample Appointment - John Doe',
      description: 'Client: John Doe\nClinician: Dr. Smith\nType: Consultation\nDuration: 60 minutes\n\nCreated by: LWV Clinic System\nLWV Clinic Appointment ID: sample-123',
      start: {
        dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
        timeZone: 'America/New_York',
      },
      location: 'LWV Clinic',
      colorId: '2', // Green color for appointments
    };

    const sampleEvent = await calendar.events.insert({
      calendarId: calendarId,
      resource: sampleAppointment,
    });

    console.log('✅ Sample appointment created successfully!');
    console.log(`   Event ID: ${sampleEvent.data.id}`);
    console.log(`   Event Link: ${sampleEvent.data.htmlLink}`);

    // Update .env.local with the new calendar ID
    console.log('\n📝 Updating environment configuration...');
    const fs = require('fs');
    const path = require('path');
    
    const envPath = path.join(__dirname, '.env.local');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Replace the calendar ID
    envContent = envContent.replace(
      /GOOGLE_CALENDAR_ID=.*/,
      `GOOGLE_CALENDAR_ID=${calendarId}`
    );
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Environment configuration updated!');

    console.log('\n🎉 SHARED CALENDAR SETUP COMPLETE!');
    console.log('\n📋 Calendar Details:');
    console.log(`   📅 Calendar Name: LWV Clinic Appointments`);
    console.log(`   🆔 Calendar ID: ${calendarId}`);
    console.log(`   🔗 Calendar URL: https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId)}`);
    console.log(`   🌐 Public View: https://calendar.google.com/calendar/u/0?cid=${calendarId}`);
    
    console.log('\n🚀 Next Steps:');
    console.log('   1. ✅ Service account is configured and working');
    console.log('   2. ✅ Shared calendar is created and accessible');
    console.log('   3. ✅ Sample appointment created for testing');
    console.log('   4. ✅ Environment variables updated');
    console.log('   5. 🔄 Ready to test appointment sync with your dashboard');

    console.log('\n💡 How to share with your team:');
    console.log('   - Share this calendar ID with your team members');
    console.log('   - They can add it to their Google Calendar using the calendar ID');
    console.log('   - All appointments created through your dashboard will appear here');
    console.log('   - All team members will see the same appointments in real-time');

  } catch (error) {
    console.error('❌ Failed to set up shared calendar:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    
    if (error.message.includes('insufficient authentication scopes')) {
      console.error('\n💡 Suggestion: Make sure the service account has Calendar API access');
    } else if (error.message.includes('Calendar usage limits exceeded')) {
      console.error('\n💡 Suggestion: Wait a moment and try again (API quota limit)');
    }
  }
}

// Run the setup
setupSharedCalendar();
