#!/usr/bin/env node

/**
 * 🔐 OAUTH2 SETUP FOR LIFEWEAVERS GOOGLE CALENDAR INTEGRATION
 * 
 * This script helps you set up OAuth2 authentication for Google Calendar.
 * Run this once to authorize the application.
 */

const LifeweaversCalendarOAuth = require('./google-calendar-oauth-integration');

async function setupOAuth() {
  console.log('🔐 LIFEWEAVERS GOOGLE CALENDAR - OAUTH2 SETUP');
  console.log('=' .repeat(50));
  console.log('');

  const calendar = new LifeweaversCalendarOAuth();
  
  // Initialize OAuth2
  const initialized = await calendar.initializeOAuth();
  if (!initialized) {
    console.error('❌ Failed to initialize OAuth2');
    return;
  }

  // Check if we have an authorization code from command line
  const authCode = process.argv[2];
  
  if (!authCode) {
    console.log('📋 STEP 1: GET AUTHORIZATION');
    console.log('-'.repeat(30));
    console.log('');
    console.log('1. 🌐 Visit this URL in your browser:');
    console.log('');
    console.log('   👉', calendar.getAuthUrl());
    console.log('');
    console.log('2. 🔐 Sign in with your Google account');
    console.log('3. ✅ Grant calendar permissions');
    console.log('4. 📋 Copy the authorization code from the page');
    console.log('5. 🚀 Run this command with the code:');
    console.log('');
    console.log('   node setup-oauth.js [YOUR_AUTHORIZATION_CODE]');
    console.log('');
    console.log('💡 Example:');
    console.log('   node setup-oauth.js 4/0AX4XfWh...');
    console.log('');
    return;
  }

  console.log('📋 STEP 2: SETTING UP CREDENTIALS');
  console.log('-'.repeat(30));
  console.log('');
  console.log('🔄 Processing authorization code...');
  
  // Set credentials using the authorization code
  const success = await calendar.setCredentials(authCode);
  
  if (!success) {
    console.error('❌ Failed to set up credentials');
    console.log('💡 Make sure the authorization code is correct and not expired');
    return;
  }

  console.log('✅ Credentials saved successfully!');
  console.log('');

  // Test the connection
  console.log('🧪 Testing calendar connection...');
  const connected = await calendar.testConnection();
  
  if (connected) {
    console.log('');
    console.log('🎉 SETUP COMPLETE! OAUTH2 INTEGRATION WORKING!');
    console.log('=' .repeat(50));
    console.log('✅ Your Google Calendar integration is ready to use!');
    console.log('');
    console.log('📋 NEXT STEPS:');
    console.log('   1. Run: npm run test-oauth');
    console.log('   2. Integrate with your React dashboard');
    console.log('   3. Start creating appointments!');
    console.log('');
    console.log('🎯 SHARED CALENDAR FEATURES READY:');
    console.log('   ✅ Create appointments');
    console.log('   ✅ Read appointments');
    console.log('   ✅ Update appointments');
    console.log('   ✅ Delete appointments');
    console.log('   ✅ All users see the same calendar');
    console.log('   ✅ Bidirectional sync');
    console.log('');
  } else {
    console.error('❌ Connection test failed');
    console.log('💡 Check your internet connection and try again');
  }
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
});

// Run setup
if (require.main === module) {
  setupOAuth().catch((error) => {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  });
}

module.exports = setupOAuth;
