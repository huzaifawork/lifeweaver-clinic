#!/usr/bin/env node

/**
 * 🔧 ENABLE GOOGLE APIS FOR DATA POPULATION FIX
 * 
 * This script helps enable the required Google APIs to fix the data population issue.
 * Run this after following the manual setup in GOOGLE_DOCS_API_SETUP.md
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const PROJECT_ID = 'lwv-calendar-integration';

async function enableGoogleAPIs() {
  console.log('🔧 FIXING DATA POPULATION ISSUE');
  console.log('================================');
  console.log('');
  
  console.log('📋 Required APIs to enable:');
  console.log('   1. Google Docs API (docs.googleapis.com)');
  console.log('   2. Google Drive API (drive.googleapis.com)');
  console.log('');
  
  console.log('🚨 IMPORTANT: Manual Setup Required');
  console.log('   This script provides the commands, but you need to run them manually');
  console.log('   or enable the APIs through the Google Cloud Console.');
  console.log('');
  
  // Check if gcloud CLI is available
  try {
    await execAsync('gcloud --version');
    console.log('✅ Google Cloud CLI detected');
    console.log('');
    
    console.log('🔧 Run these commands to enable APIs:');
    console.log('');
    console.log('1. Enable Google Docs API:');
    console.log(`   gcloud services enable docs.googleapis.com --project=${PROJECT_ID}`);
    console.log('');
    console.log('2. Enable Google Drive API:');
    console.log(`   gcloud services enable drive.googleapis.com --project=${PROJECT_ID}`);
    console.log('');
    
    console.log('🔍 Verify APIs are enabled:');
    console.log(`   gcloud services list --enabled --project=${PROJECT_ID} | grep -E "(docs|drive)"`);
    console.log('');
    
  } catch (error) {
    console.log('⚠️  Google Cloud CLI not found');
    console.log('   Please enable APIs manually through Google Cloud Console');
    console.log('');
  }
  
  console.log('🌐 MANUAL SETUP (Recommended):');
  console.log('   1. Google Docs API: https://console.cloud.google.com/apis/library/docs.googleapis.com?project=lwv-calendar-integration');
  console.log('   2. Google Drive API: https://console.cloud.google.com/apis/library/drive.googleapis.com?project=lwv-calendar-integration');
  console.log('');
  
  console.log('📋 VERIFICATION STEPS:');
  console.log('   1. Enable both APIs in Google Cloud Console');
  console.log('   2. Run: node test-google-docs-integration.js');
  console.log('   3. Should see: "✅ Document created successfully!"');
  console.log('   4. Start app: npm run dev');
  console.log('   5. Test data population in the application');
  console.log('');
  
  console.log('🎯 EXPECTED RESULT:');
  console.log('   ✅ Google Docs integration working');
  console.log('   ✅ Data populating in documents');
  console.log('   ✅ Client names appearing dynamically');
  console.log('   ✅ Session notes being appended');
  console.log('');
  
  console.log('🚨 ROOT CAUSE IDENTIFIED:');
  console.log('   The "data not populating" issue is caused by missing API permissions.');
  console.log('   Once you enable Google Docs API and Google Drive API, everything will work!');
  console.log('');
  
  console.log('📞 NEXT STEPS:');
  console.log('   1. Enable the APIs using the links above');
  console.log('   2. Run the test script to verify');
  console.log('   3. Test the application');
  console.log('   4. Data should now populate correctly!');
}

// Run the setup
enableGoogleAPIs().catch(console.error);