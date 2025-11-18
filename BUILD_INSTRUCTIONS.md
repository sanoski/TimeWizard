# VRS Time Wizard - Android Build Instructions

## Project Overview

**VRS Time Wizard** is an **Expo React Native** mobile timesheet app built with **Expo SDK 51**. It's an **offline-first** application that uses **expo-sqlite** for local data storage.

### Key Technical Details
- **Platform**: Expo (managed workflow)
- **Framework**: React Native with TypeScript
- **Database**: expo-sqlite (local SQLite on device)
- **UI Library**: Tamagui
- **Navigation**: expo-router (file-based)
- **State**: Zustand
- **Build System**: EAS Build (Expo Application Services)

### ⚠️ CRITICAL: This is NOT a standard React Native CLI project
- This is an **Expo managed workflow** project
- Cannot use standard `react-native run-android` commands
- Must use **EAS Build** or `npx expo prebuild` + custom build
- Uses expo-sqlite which requires native compilation

## Project Structure

```
/app
├── frontend/               # Main Expo app (THIS IS THE APP TO BUILD)
│   ├── app/               # Expo Router screens
│   ├── services/          # Database and business logic
│   ├── store/             # Zustand state management
│   ├── app.json           # Expo configuration
│   ├── package.json       # Dependencies
│   └── eas.json           # Build configuration (if exists)
├── backend/               # FastAPI server (NOT NEEDED FOR BUILD)
└── [documentation files]
```

**The app to build is in the `/frontend` directory.**

## Prerequisites

You will need:
1. **Node.js 18+** installed
2. **npm** or **yarn** package manager
3. **Expo CLI**: `npm install -g expo-cli`
4. **EAS CLI** (recommended): `npm install -g eas-cli`
5. **Expo account** (free) at https://expo.dev

## Build Method 1: EAS Build (RECOMMENDED - Easiest)

This is the official Expo build service. Builds happen in the cloud.

### Step 1: Install Dependencies
```bash
cd frontend
npm install
```

### Step 2: Login to Expo
```bash
eas login
# Create free account if needed at expo.dev
```

### Step 3: Configure EAS (if not already done)
```bash
eas build:configure
```

This creates `eas.json`. Use this configuration:

```json
{
  "cli": {
    "version": ">= 5.2.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

### Step 4: Build APK
```bash
# For testing (APK)
eas build --platform android --profile preview

# For production (AAB for Play Store)
eas build --platform android --profile production
```

**Build takes 10-20 minutes.** You'll get a download link when complete.

### Step 5: Download APK
- Check build status: `eas build:list`
- Download from Expo dashboard or use provided link
- Install on Android device: `adb install app.apk`

## Build Method 2: Local Build (More Complex)

If you need to build locally without EAS:

### Step 1: Install Android Studio & SDK
- Android Studio with SDK 33+
- Android SDK Build-Tools
- Android Emulator (optional)

### Step 2: Prebuild Native Projects
```bash
cd frontend
npx expo prebuild --platform android
```

This generates the `/android` directory with native code.

### Step 3: Build APK
```bash
cd android
./gradlew assembleRelease
```

APK will be in: `android/app/build/outputs/apk/release/app-release.apk`

### Potential Issues with Local Build:
- May need to configure signing keys
- May need to adjust `android/app/build.gradle`
- Expo modules might need additional setup
- expo-sqlite requires native compilation

## Important Configuration Files

### app.json
Key settings in `frontend/app.json`:

```json
{
  "expo": {
    "name": "VRS Time Wizard",
    "slug": "vrs-time-wizard",
    "version": "1.0.0",
    "android": {
      "package": "com.yourcompany.vrstimewizard",
      "versionCode": 1,
      "permissions": [
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    }
  }
}
```

**Change `package` to your own bundle identifier** (e.g., com.yourname.vrstimewizard)

### package.json
All dependencies are in `frontend/package.json`. Key ones:
- `expo` ~51.0.0
- `expo-sqlite` ~14.0.0 (native module - requires compilation)
- `expo-router` ~3.5.0
- `@tamagui/config` ~1.93.0
- `zustand` ~4.5.0

## Environment Variables

### .env file in frontend/
```
EXPO_PUBLIC_BACKEND_URL=http://your-backend-url
EXPO_PACKAGER_PROXY_URL=http://...
EXPO_PACKAGER_HOSTNAME=...
```

**For APK build, these are optional** since the app is offline-first and doesn't require backend.

## Common Build Issues & Solutions

### Issue 1: "expo-sqlite not found"
**Cause**: Native module not compiled  
**Solution**: Use EAS Build or run `npx expo prebuild`

### Issue 2: "Metro bundler cache issues"
**Solution**: 
```bash
npx expo start --clear
rm -rf node_modules
npm install
```

### Issue 3: "Build fails with Gradle error"
**Solution**:
```bash
cd android
./gradlew clean
cd ..
eas build --platform android --profile preview --clear-cache
```

### Issue 4: "Cannot resolve module"
**Solution**: Check all dependencies installed
```bash
npm install
npx expo install --check
```

### Issue 5: "App crashes on launch"
**Likely Cause**: expo-sqlite initialization failing  
**Check**: Logs with `adb logcat` or Expo developer tools

## Testing the Built APK

### Installation
```bash
# Enable USB debugging on Android device
# Connect device via USB
adb devices
adb install path/to/app.apk
```

### Testing Checklist
After installing APK:
- [ ] App launches successfully
- [ ] Shows migration screen on first launch
- [ ] Can add/edit hours in timesheet
- [ ] Week navigation works
- [ ] Data persists after closing/reopening app
- [ ] Export backup works
- [ ] Import backup works
- [ ] Works in airplane mode (offline test)

## Key Features to Verify

1. **Database Initialization**: App creates local SQLite database on first launch
2. **Migration Screen**: Shows "Migrate Data" or "Start Fresh" options
3. **Timesheet Grid**: Can add hours with +/- buttons
4. **Pay Weeks**: History shows PAY badges every 14 days
5. **Offline**: Works completely without internet

## Troubleshooting Build

### If Build Fails:

1. **Check Node version**: `node --version` (should be 18+)
2. **Clear caches**:
   ```bash
   rm -rf node_modules
   rm -rf .expo
   npm install
   ```
3. **Check Expo CLI**: `expo --version`
4. **Update Expo**: `npm install -g expo-cli@latest`
5. **Check dependencies**: `npx expo-doctor`

### If App Crashes After Install:

1. **Check logs**: `adb logcat | grep -i expo`
2. **Verify permissions** in AndroidManifest.xml
3. **Check database initialization** in app logs
4. **Ensure all native modules built** correctly

## Minimal Build Command (Quick Start)

If you just want a working APK quickly:

```bash
# 1. Install dependencies
cd frontend
npm install

# 2. Login to Expo (create free account at expo.dev)
npx eas-cli login

# 3. Build APK
npx eas-cli build --platform android --profile preview

# Wait 10-20 minutes, download APK from link provided
```

## Expected Output

Successful build produces:
- **File**: `app-release.apk` or similar
- **Size**: ~50-80 MB
- **Min Android Version**: Android 6.0+ (API 23+)
- **Architecture**: ARM64 and ARMv7a

## Post-Build

After successful build:
1. Test APK on physical Android device
2. Verify all offline features work
3. Test data persistence
4. Test export/import
5. Ready for distribution or Play Store submission

## Important Notes

- **Backend is optional**: App works 100% offline, backend is for future sync only
- **Web version won't work**: expo-sqlite only works on native platforms
- **First build takes longest**: Subsequent builds are faster
- **EAS Build is free** for basic usage (limited builds per month)
- **Local builds are complex**: EAS Build is strongly recommended

## Getting Help

If build fails:
1. Check error messages carefully
2. Search Expo forums: https://forums.expo.dev
3. Check expo-sqlite documentation
4. Verify all dependencies in package.json are compatible
5. Try EAS Build if local build fails

## Summary for AI Assistant

**What you're building**: An Expo React Native app with local SQLite database  
**Build method**: Use EAS Build (cloud-based, easiest)  
**Key command**: `eas build --platform android --profile preview`  
**Main directory**: `/frontend`  
**Critical dependency**: expo-sqlite (requires native compilation)  
**Output**: Android APK file  
**Testing**: Install on Android device, verify offline functionality

---

**Version**: 1.0.0  
**Last Updated**: November 17, 2024  
**Status**: Ready to build
