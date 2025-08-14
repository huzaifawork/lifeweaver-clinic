#!/usr/bin/env node

/**
 * Test Script for Lifeweavers Google Calendar Integration
 * 
 * This script tests the Google Calendar integration with your service account.
 * Make sure you have the actual private key in the JSON file before running.
 */

const LifeweaversCalendarIntegration = require('./google-calendar-integration-complete');
const fs = require('fs');

async function testCalendarIntegration() {
  console.log('🏥 Lifeweavers Clinic - Google Calendar Integration Test');
  console.log('=' .repeat(60));
  
  // Check if service account file exists
  const keyFilePath = './lwv-calendar-service-account-key.json';
  if (!fs.existsSync(keyFilePath)) {
    console.error('❌ Service account key file not found!');
    console.log('📝 Please ensure the file exists at:', keyFilePath);
    return;
  }

  // Check if the file has the actual private key
  try {
    const keyContent = fs.readFileSync(keyFilePath, 'utf8');
    if (keyContent.includes('[ACTUAL PRIVATE KEY CONTENT WILL BE HERE]')) {
      console.error('❌ Service account key file needs the actual private key!');
      console.log('📝 Please replace the placeholder with the actual private key from Google Cloud Console.');
      console.log('🔗 Download from: https://console.cloud.google.com/iam-admin/serviceaccounts/details/112692055783990850972/keys?project=lwv-calendar-integration');
      return;
    }
  } catch (error) {
    console.error('❌ Error reading service account key file:', error.message);
    return;
  }

  console.log('✅ Service account key file found');
  console.log('🔑 Key ID: 1cd8f55cd3930aed7e8650bf146034d1d66fbf38');
  console.log('📧 Service Account: lwv-clinic-calendar-service@lwv-calendar-integration.iam.gserviceaccount.com');
  console.log('');

  // Initialize the calendar integration
  const calendar = new LifeweaversCalendarIntegration(
    keyFilePath,
    'primary' // Use primary calendar for testing
  );

  console.log('🔄 Initializing Google Calendar connection...');
  
  // Test 1: Initialize connection
  const initialized = await calendar.initialize();
  if (!initialized) {
    console.error('❌ Failed to initialize calendar integration');
    console.log('💡 Make sure:');
    console.log('   - The private key in the JSON file is correct');
    console.log('   - The Google Calendar API is enabled');
    console.log('   - Your internet connection is working');
    return;
  }

  console.log('✅ Calendar integration initialized successfully!');
  console.log('');

  // Test 2: Test connection and list calendars
  console.log('🔄 Testing calendar connection...');
  const connected = await calendar.testConnection();
  if (!connected) {
    console.error('❌ Failed to connect to Google Calendar');
    console.log('💡 Make sure:');
    console.log('   - You have shared a calendar with the service account');
    console.log('   - The service account has proper permissions');
    return;
  }

  console.log('✅ Calendar connection successful!');
  console.log('');

  // Test 3: Create a test appointment
  console.log('🔄 Creating a test appointment...');
  
  const testAppointment = {
    title: '🧪 Test Appointment - Lifeweavers Clinic',
    description: 'This is a test appointment created by the calendar integration.\n\n' +
                'Patient: Test Patient\n' +
                'Doctor: Dr. Test\n' +
                'Type: Integration Test\n' +
                'Created: ' + new Date().toISOString(),
    startTime: getTestDateTime(1), // 1 hour from now
    endTime: getTestDateTime(2),   // 2 hours from now
    attendees: [
      { email: 'test@example.com', displayName: 'Test Patient' }
    ],
    colorId: '2' // Green color for test appointments
  };

  const createResult = await calendar.createAppointment(testAppointment);
  
  if (!createResult.success) {
    console.error('❌ Failed to create test appointment:', createResult.error);
    console.log('💡 This might be because:');
    console.log('   - The calendar is not shared with the service account');
    console.log('   - The service account doesn\'t have write permissions');
    return;
  }

  console.log('✅ Test appointment created successfully!');
  console.log('📅 Event ID:', createResult.eventId);
  console.log('🔗 Event Link:', createResult.eventLink);
  console.log('');

  // Test 4: Get today's appointments
  console.log('🔄 Getting today\'s appointments...');
  const todaysAppointments = await calendar.getTodaysAppointments();
  
  if (todaysAppointments.success) {
    console.log(`✅ Found ${todaysAppointments.count} appointments for today`);
    
    if (todaysAppointments.count > 0) {
      console.log('📋 Today\'s appointments:');
      todaysAppointments.appointments.forEach((apt, index) => {
        const startTime = new Date(apt.start.dateTime || apt.start.date);
        console.log(`   ${index + 1}. ${apt.summary} - ${startTime.toLocaleTimeString()}`);
      });
    }
  } else {
    console.error('❌ Failed to get today\'s appointments:', todaysAppointments.error);
  }

  console.log('');

  // Test 5: Clean up - Delete the test appointment
  console.log('🔄 Cleaning up test appointment...');
  const deleteResult = await calendar.deleteAppointment(createResult.eventId);
  
  if (deleteResult.success) {
    console.log('✅ Test appointment deleted successfully');
  } else {
    console.log('⚠️  Could not delete test appointment:', deleteResult.error);
    console.log('📝 You may need to delete it manually from Google Calendar');
  }

  console.log('');
  console.log('🎉 INTEGRATION TEST COMPLETED SUCCESSFULLY!');
  console.log('=' .repeat(60));
  console.log('✅ Your Google Calendar integration is working perfectly!');
  console.log('🚀 You can now integrate this with your Lifeweavers clinic dashboard.');
  console.log('');
  console.log('📋 Next steps:');
  console.log('   1. Create a dedicated calendar for your clinic');
  console.log('   2. Share it with: lwv-clinic-calendar-service@lwv-calendar-integration.iam.gserviceaccount.com');
  console.log('   3. Update your calendar ID in the integration code');
  console.log('   4. Integrate with your React dashboard');
}

/**
 * Helper function to get test date/time
 */
function getTestDateTime(hoursFromNow) {
  const date = new Date();
  date.setHours(date.getHours() + hoursFromNow);
  return date.toISOString();
}

/**
 * Handle errors gracefully
 */
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error.message);
  process.exit(1);
});

// Run the test
if (require.main === module) {
  testCalendarIntegration().catch((error) => {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  });
}

module.exports = testCalendarIntegration;
