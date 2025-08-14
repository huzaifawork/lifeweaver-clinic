// Debug Google Calendar Integration
const admin = require('firebase-admin');

// Initialize Firebase Admin (you might need to adjust the path)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    // Add your Firebase config here if needed
  });
}

const db = admin.firestore();

async function debugCalendarIntegration() {
  console.log('🔍 Debugging Google Calendar Integration...\n');

  try {
    // Check if there are any user calendar connections
    console.log('1. Checking user calendar connections...');
    const connectionsSnapshot = await db.collection('userCalendarConnections').get();
    
    if (connectionsSnapshot.empty) {
      console.log('❌ No user calendar connections found!');
      console.log('   This means users haven\'t signed in with Google or tokens weren\'t saved.');
      console.log('   Users need to sign out and sign back in with Google.');
    } else {
      console.log(`✅ Found ${connectionsSnapshot.size} user calendar connections:`);
      connectionsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   - User: ${data.email} (ID: ${doc.id})`);
        console.log(`   - Connected: ${data.connectedAt}`);
        console.log(`   - Has tokens: ${data.tokens ? 'Yes' : 'No'}`);
        if (data.tokens) {
          console.log(`   - Token type: ${data.tokens.token_type}`);
          console.log(`   - Scope: ${data.tokens.scope}`);
        }
        console.log('');
      });
    }

    // Check recent appointments
    console.log('2. Checking recent appointments...');
    const appointmentsSnapshot = await db.collection('appointments')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    if (appointmentsSnapshot.empty) {
      console.log('❌ No appointments found!');
    } else {
      console.log(`✅ Found ${appointmentsSnapshot.size} recent appointments:`);
      appointmentsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   - ID: ${doc.id}`);
        console.log(`   - Client: ${data.clientName}`);
        console.log(`   - Date: ${data.dateOfSession}`);
        console.log(`   - Google Calendar Event ID: ${data.googleCalendarEventId || 'None'}`);
        console.log(`   - Created by: ${data.createdByUserId}`);
        console.log('');
      });
    }

    // Check if there are any sync errors in logs
    console.log('3. Recommendations:');
    if (connectionsSnapshot.empty) {
      console.log('   📝 Users need to sign out and sign back in with Google');
      console.log('   📝 Make sure Google Calendar API is enabled in Firebase Console');
      console.log('   📝 Check browser console for any error messages');
    } else {
      console.log('   📝 Check browser console when creating appointments');
      console.log('   📝 Verify appointments are being created with correct user IDs');
      console.log('   📝 Test the multi-user sync manually');
    }

  } catch (error) {
    console.error('❌ Error debugging calendar integration:', error);
    console.log('\n💡 Make sure Firebase Admin is properly configured');
  }
}

// Run the debug
debugCalendarIntegration();
