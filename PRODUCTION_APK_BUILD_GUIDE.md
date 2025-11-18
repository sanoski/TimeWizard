# VRS Time Wizard - Production APK Build Guide

## ✅ Pre-Build Checklist Complete

Your app is now ready for production APK build with the following verified:

### What's Been Fixed
- ✅ All database imports use `databaseWrapper.ts` (platform-specific)
- ✅ No hardcoded backend API calls remaining
- ✅ Offline-first architecture fully implemented
- ✅ App name updated to "VRS Time Wizard"
- ✅ Android package name: `com.vrstimewizard.app`
- ✅ EAS build configuration created
- ✅ Migration logic uses correct database wrapper

### App Configuration
- **Name**: VRS Time Wizard
- **Version**: 1.0.0
- **Package**: com.vrstimewizard.app
- **Bundle ID (iOS)**: com.vrstimewizard.app

---

## 🚀 Building the APK

### Option 1: Using EAS Build (Recommended - Cloud Build)

#### Step 1: Install EAS CLI
```bash
npm install -g eas-cli
```

#### Step 2: Login to Expo
```bash
eas login
```

#### Step 3: Configure Your Project
```bash
cd /app/frontend
eas build:configure
```

#### Step 4: Build APK
```bash
# For production APK
eas build --platform android --profile production

# OR for preview APK (faster, good for testing)
eas build --platform android --profile preview
```

The build will happen in the cloud and give you a download link when complete (usually 10-15 minutes).

---

### Option 2: Local Build (Requires Android Studio)

#### Prerequisites
1. Install Android Studio
2. Install Android SDK (API 34 or higher)
3. Set up environment variables:
   ```bash
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

#### Build Steps
```bash
cd /app/frontend

# Generate android folder
npx expo prebuild --platform android

# Build APK
cd android
./gradlew assembleRelease

# APK will be at: android/app/build/outputs/apk/release/app-release.apk
```

---

### Option 3: Using GitHub Actions (Automated)

If you push to GitHub, you can set up automated builds:

1. Create `.github/workflows/build-apk.yml`:
```yaml
name: Build Android APK

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          
      - name: Install dependencies
        run: |
          cd frontend
          npm install
          
      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
          
      - name: Build APK
        run: |
          cd frontend
          eas build --platform android --profile production --non-interactive
```

2. Add your Expo token as a GitHub secret named `EXPO_TOKEN`

---

## 📱 Installing the APK

### On Your Phone
1. Download the APK from EAS or your build location
2. Go to Settings → Security → Install from Unknown Sources (enable)
3. Open the APK file
4. Tap "Install"

### Via ADB (Developer)
```bash
adb install path/to/vrs-time-wizard.apk
```

---

## 🔍 What to Test After Install

### Critical Tests
1. **Fresh Install**
   - Opens without crash
   - Database initializes with default lines
   - Can log hours on timesheet

2. **Offline Mode**
   - Turn OFF WiFi and mobile data
   - App still fully functional
   - Can add/edit hours
   - Data persists after closing app

3. **Pay Week Calculation**
   - Check that Nov 29, 2025 shows as pay week
   - Check that Nov 15, 2025 shows as pay week
   - Check that Nov 1, 2025 shows as pay week

4. **Grid Alignment**
   - Line names display correctly
   - Headers align with data columns
   - No scrolling issues

5. **Data Persistence**
   - Add hours, close app
   - Reopen - data should still be there

6. **Export/Import**
   - Export backup from Settings
   - Clear data
   - Import backup
   - Verify all data restored

---

## ⚠️ Known Limitations

1. **Web Preview**: Not fully functional (SQLite doesn't work on web)
2. **First Launch**: May take 2-3 seconds to initialize database
3. **Migration Screen**: Only shows if detected as upgrade from old version

---

## 🐛 Troubleshooting Build Issues

### Build Fails with "SDK Version Mismatch"
```bash
cd frontend
npx expo install --fix
```

### "AAPT2 Error" during build
Update your Android SDK build tools:
```bash
sdkmanager "build-tools;34.0.0"
```

### "Out of Memory" during build
Increase Gradle memory:
```bash
# In android/gradle.properties
org.gradle.jvmargs=-Xmx4096m
```

### APK too large
Enable ProGuard in `android/app/build.gradle`:
```gradle
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
    }
}
```

---

## 📊 Expected APK Size
- **With ProGuard**: ~30-40 MB
- **Without ProGuard**: ~50-60 MB

---

## 🎯 Next Steps After APK

1. **Test on Multiple Devices**
   - Different Android versions
   - Different screen sizes
   - With/without internet

2. **Distribute to Beta Testers**
   - Share APK directly
   - Or use EAS Submit to Google Play internal testing

3. **Prepare for Play Store** (optional)
   - Create privacy policy
   - Prepare screenshots
   - Write app description
   - Set up Google Play Console account

---

## 📞 Support

If you encounter issues during the build process:
1. Check Expo documentation: https://docs.expo.dev/build/introduction/
2. Review logs for specific error messages
3. Ensure all dependencies are up to date

---

**Last Updated**: November 18, 2025  
**App Version**: 1.0.0  
**Ready for Production Build**: ✅ YES
