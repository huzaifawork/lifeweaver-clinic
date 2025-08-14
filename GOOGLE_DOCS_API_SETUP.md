# Google Docs API Setup Guide

## 🚨 CRITICAL: Data Population Issue Resolution

The data population issue is caused by **missing API permissions** in Google Cloud Console. Follow these steps to resolve it:

## 🔧 Step 1: Enable Required APIs

### Enable Google Docs API
1. Go to: https://console.cloud.google.com/apis/library/docs.googleapis.com?project=lwv-calendar-integration
2. Click **"ENABLE"** button
3. Wait for confirmation

### Enable Google Drive API
1. Go to: https://console.cloud.google.com/apis/library/drive.googleapis.com?project=lwv-calendar-integration
2. Click **"ENABLE"** button
3. Wait for confirmation

## 🔑 Step 2: Verify Service Account Permissions

### Check Service Account
1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts?project=lwv-calendar-integration
2. Find: `lwv-clinic-calendar-service@lwv-calendar-integration.iam.gserviceaccount.com`
3. Ensure it has these roles:
   - **Editor** (or Document Creator)
   - **Service Account User**

## 🧪 Step 3: Test the Fix

After enabling the APIs, run this test:

```bash
node test-google-docs-integration.js
```

You should see:
```
✅ Document created successfully!
✅ Content added to document successfully!
✅ Data population should now work properly.
```

## 🎯 Step 4: Test in Application

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to:** http://localhost:9002

3. **Test data population:**
   - Go to `/sessions/new`
   - Create a new session with client data
   - Check if Google Doc is created with populated data
   - Go to `/admin/cases`
   - Generate professional documents
   - Verify data appears in Google Docs

## 🔍 Troubleshooting

### If you still get "The caller does not have permission":

1. **Double-check APIs are enabled:**
   - Google Docs API: https://console.cloud.google.com/apis/api/docs.googleapis.com/overview?project=lwv-calendar-integration
   - Google Drive API: https://console.cloud.google.com/apis/api/drive.googleapis.com/overview?project=lwv-calendar-integration

2. **Verify service account key:**
   - Ensure `.env.local` has correct `GOOGLE_CLIENT_EMAIL`
   - Check private key formatting (no extra escaping)

3. **Check quotas:**
   - Go to: https://console.cloud.google.com/apis/api/docs.googleapis.com/quotas?project=lwv-calendar-integration
   - Ensure you haven't exceeded API limits

### If data still doesn't populate:

1. **Check browser console** for JavaScript errors
2. **Check terminal logs** for API errors
3. **Verify Firebase connection** is working
4. **Test with sample data** first

## 📋 Quick Checklist

- [ ] Google Docs API enabled
- [ ] Google Drive API enabled  
- [ ] Service account has proper roles
- [ ] Environment variables are correct
- [ ] Test script passes
- [ ] Application server is running
- [ ] Data populates in Google Docs

## 🎉 Expected Result

Once fixed, you should see:
- ✅ Professional documents created automatically
- ✅ Client names and data populated dynamically
- ✅ Session notes appended to existing documents
- ✅ Medical assessments included in documents
- ✅ No hardcoded data - everything dynamic

## 🆘 Still Having Issues?

If the problem persists after following these steps:

1. **Check the terminal output** when running the app
2. **Look for specific error messages** in browser console
3. **Verify the Google Cloud project** is the correct one
4. **Ensure billing is enabled** on the Google Cloud project (required for API usage)

---

**The root cause was missing API permissions - this should resolve your data population issue completely!** 🚀