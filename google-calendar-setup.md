# Google Calendar Integration Setup Guide

## 📋 Current Status
✅ Google Cloud Project: "LWV Calendar Integration" (lwv-calendar-integration)
✅ Google Calendar API: Enabled
✅ Service Account: "LWV Clinic Calendar Service"
✅ Service Account Email: lwv-clinic-calendar-service@lwv-calendar-integration.iam.gserviceaccount.com

## 🔑 Getting Your Service Account Key

### Option 1: Download New Key (Recommended)
1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts/details/112692055783990850972/keys?project=lwv-calendar-integration
2. Click "Add Key" → "Create new key"
3. Select "JSON" → Click "Create"
4. Save the downloaded file as `service-account-key.json` in your project root

### Option 2: Use Existing Service Account
If you can't download the key, you can use OAuth2 flow or domain-wide delegation.

## 📦 Install Dependencies

```bash
npm install googleapis
```

## 🔧 Basic Setup Code

```javascript
const { google } = require('googleapis');
const fs = require('fs');

// Load service account key
const serviceAccount = JSON.parse(fs.readFileSync('service-account-key.json'));

// Create JWT client
const jwtClient = new google.auth.JWT(
  serviceAccount.client_email,
  null,
  serviceAccount.private_key,
  ['https://www.googleapis.com/auth/calendar']
);

// Initialize Calendar API
const calendar = google.calendar({ version: 'v3', auth: jwtClient });

// Test function
async function testCalendarAccess() {
  try {
    const response = await calendar.calendarList.list();
    console.log('Calendar access successful!');
    console.log('Available calendars:', response.data.items);
  } catch (error) {
    console.error('Error accessing calendar:', error);
  }
}

testCalendarAccess();
```

## 📅 Next Steps

1. **Create a Google Calendar** for your clinic
2. **Share the calendar** with your service account email:
   - lwv-clinic-calendar-service@lwv-calendar-integration.iam.gserviceaccount.com
   - Give "Make changes and manage sharing" permissions
3. **Get the Calendar ID** from the calendar settings
4. **Test the integration** with the code above

## 🔗 Important Links
- Google Cloud Console: https://console.cloud.google.com/iam-admin/serviceaccounts?project=lwv-calendar-integration
- Calendar API Documentation: https://developers.google.com/calendar/api/v3/reference
