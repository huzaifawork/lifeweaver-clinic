# 📅 Shared Google Calendar Integration Setup

This guide will help you set up a shared Google Calendar integration where all users can see and manage appointments that sync in real-time.

## 🏗️ **Architecture Overview**

- **Service Account**: A Google service account manages the shared calendar
- **Shared Calendar**: One calendar visible to all users in your system
- **Real-time Sync**: Appointments created in your app automatically appear in Google Calendar
- **Bi-directional**: Changes in Google Calendar can sync back to your app
- **Role-based Access**: All users (Admin, Super Admin, Clinician) can create/edit appointments

## 📋 **Step 1: Google Cloud Project Setup**

### 1.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one:
   - Click **Select a project** → **New Project**
   - Enter project name: `lifeweavers-calendar-integration`
   - Note your **Project ID** (you'll need this later)
3. Make sure billing is enabled for your project

### 1.2 Enable Google Calendar API

1. In the Google Cloud console, go to **Menu** → **APIs & Services** → **Library**
   - [Direct link to API Library](https://console.cloud.google.com/apis/library)
2. Search for "Google Calendar API"
3. Click on **Google Calendar API**
4. Click **Enable**

### 1.3 Create Service Account

**Why Service Account?** Service accounts are perfect for shared calendar scenarios because:

- They don't require individual user authentication
- They can manage calendars on behalf of your application
- They provide centralized access control
- They're ideal for server-to-server communication

**Steps to create:**

1. In the Google Cloud console, go to **Menu** → **IAM & Admin** → **Service Accounts**
   - [Direct link to Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Click **Create service account**
3. Fill in the service account details:
   - **Service account name**: `LWV Clinic Calendar Service`
   - **Service account ID**: `lwv-clinic-calendar-service` (auto-generated)
   - **Description**: `Service account for managing shared clinic calendar and appointments`
4. Click **Create and continue**
5. **Optional**: Assign roles (you can skip this for now)
6. Click **Continue**
7. **Optional**: Grant users access to this service account (skip for now)
8. Click **Done**
9. **Important**: Note the service account email address (e.g., `lwv-clinic-calendar-service@your-project.iam.gserviceaccount.com`)

### 1.4 Create Service Account Credentials

1. In the Service Accounts page, click on your newly created service account
2. Go to the **Keys** tab
3. Click **Add Key** → **Create new key**
4. Select **JSON** format
5. Click **Create**
6. **Important**: The JSON file will be automatically downloaded
   - Save this file securely as `google-service-account.json`
   - This file contains your private key - keep it secure!
   - Never commit this file to version control

## 📦 **Step 2: Project Setup**

### 2.1 Install Dependencies

The `googleapis` package should already be installed. If not:

```bash
npm install googleapis
```

### 2.2 Configure Environment Variables

1. Copy the downloaded service account JSON file to your project root as `google-service-account.json`
2. Copy `.env.example` to `.env.local`
3. Fill in the Google Calendar configuration from your service account JSON:

```env
# Google Calendar Service Account Configuration
GOOGLE_SERVICE_ACCOUNT_TYPE=service_account
GOOGLE_PROJECT_ID=your_google_project_id
GOOGLE_PRIVATE_KEY_ID=your_private_key_id_from_json
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_from_json\n-----END PRIVATE KEY-----\n"
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_CLIENT_ID=your_client_id_from_json
GOOGLE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
GOOGLE_TOKEN_URI=https://oauth2.googleapis.com/token
GOOGLE_AUTH_PROVIDER_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
GOOGLE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com

# This will be filled by the setup script
GOOGLE_CALENDAR_ID=
```

**Important**: Make sure to escape newlines in the private key with `\n`

### 2.3 Run Setup Script

```bash
node scripts/setup-shared-calendar.js
```

This script will:

- Create a shared calendar
- Set proper permissions
- Add sample events
- Save the calendar ID to your `.env.local`

## 🚀 **Step 3: Test the Integration**

### 3.1 Start Development Server

```bash
npm run dev
```

### 3.2 Test Appointment Creation

1. Go to `/appointments` in your app
2. Create a new appointment
3. Check that it appears in Google Calendar
4. Verify all users can see the appointment

### 3.3 Test Real-time Sync

1. Create an appointment in your app
2. Modify it in Google Calendar
3. The changes should sync back to your app (may take up to 30 seconds)

## ✅ **Features Implemented**

### 📅 **Appointment Sync**

- ✅ Create appointment in app → appears in Google Calendar
- ✅ Update appointment in app → updates in Google Calendar
- ✅ Delete appointment in app → removes from Google Calendar
- ✅ All users see the same shared calendar

### 🔄 **Real-time Updates**

- ✅ Automatic sync when appointments are created/updated/deleted
- ✅ Background sync to pull changes from Google Calendar
- ✅ Error handling for sync failures

### 👥 **User Access**

- ✅ All user roles (Admin, Super Admin, Clinician) can manage appointments
- ✅ Shared visibility - everyone sees all appointments
- ✅ User attribution - shows who created each appointment

### 📱 **Integration Points**

- ✅ Existing appointment creation form
- ✅ Existing calendar display component
- ✅ Real-time appointment hooks
- ✅ Firebase appointment storage

## 🔧 **How It Works**

1. **Appointment Creation**: When a user creates an appointment through your app:

   - Appointment is saved to Firebase
   - Automatically synced to Google Calendar
   - Google Calendar event ID is stored with the appointment

2. **Appointment Updates**: When a user updates an appointment:

   - Firebase record is updated
   - Corresponding Google Calendar event is updated
   - All users see the changes immediately

3. **Appointment Deletion**: When a user deletes an appointment:

   - Google Calendar event is deleted first
   - Firebase record is removed
   - Change is reflected for all users

4. **Background Sync**: Periodically syncs changes from Google Calendar back to your app

## 🛠️ **Troubleshooting**

### Common Issues

1. **"Service account not found"**

   - Check that the service account JSON file is correctly placed
   - Verify environment variables are properly set

2. **"Calendar API not enabled"**

   - Ensure Google Calendar API is enabled in Google Cloud Console

3. **"Permission denied"**

   - Verify service account has proper permissions
   - Check that calendar was created successfully

4. **"Sync not working"**
   - Check browser console for errors
   - Verify API endpoints are responding
   - Check server logs for sync errors

### Debug Mode

Enable debug logging by adding to your browser console:

```javascript
localStorage.setItem("debug", "calendar:*");
```

## 🎉 **Success!**

Your shared Google Calendar integration is now complete! All users in your system can:

- ✅ Create appointments that appear in Google Calendar
- ✅ See all appointments created by other users
- ✅ Have changes sync in real-time
- ✅ Access the shared calendar from any device

The integration maintains your existing appointment workflow while adding powerful Google Calendar synchronization.
