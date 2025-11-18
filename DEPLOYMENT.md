# VRS Time Wizard - Deployment Guide

Complete guide for deploying VRS Time Wizard to production.

## Prerequisites

### Required Accounts
- [ ] Expo account (for EAS Build)
- [ ] Apple Developer account ($99/year) - for iOS
- [ ] Google Play Developer account ($25 one-time) - for Android

### Development Environment
- [ ] Node.js 18+ installed
- [ ] Expo CLI installed globally: `npm install -g expo-cli`
- [ ] EAS CLI installed: `npm install -g eas-cli`
- [ ] Git configured

## Pre-Deployment Checklist

### Code Quality
- [ ] All features tested on physical devices
- [ ] No console errors or warnings
- [ ] Debug logging removed/disabled
- [ ] All TODOs resolved
- [ ] Code reviewed

### Documentation
- [ ] README.md updated
- [ ] CHANGELOG.md updated
- [ ] Version number incremented
- [ ] Release notes prepared

### Testing
- [ ] Tested on iOS device
- [ ] Tested on Android device
- [ ] Tested offline functionality
- [ ] Tested backup/restore
- [ ] Tested migration flow (fresh install)
- [ ] Tested all edge cases

## Configuration

### 1. Update app.json

```json
{
  "expo": {
    "name": "VRS Time Wizard",
    "slug": "vrs-time-wizard",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#2563eb"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.vrstimewizard",
      "buildNumber": "1"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#2563eb"
      },
      "package": "com.yourcompany.vrstimewizard",
      "versionCode": 1,
      "permissions": [
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    }
  }
}
```

### 2. Create eas.json

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
  },
  "submit": {
    "production": {}
  }
}
```

## Building the App

### Step 1: Configure EAS

```bash
cd /app/frontend

# Login to Expo
eas login

# Configure project
eas build:configure
```

### Step 2: Build for Android

```bash
# Preview build (APK for testing)
eas build --platform android --profile preview

# Production build (AAB for Play Store)
eas build --platform android --profile production
```

Build process takes 10-20 minutes. You'll get a download link when complete.

### Step 3: Build for iOS

```bash
# Preview build
eas build --platform ios --profile preview

# Production build
eas build --platform ios --profile production
```

**Note**: iOS builds require Apple Developer account credentials.

## Testing Builds

### Android APK Testing

```bash
# Download APK from EAS dashboard
# Install on test device:
adb install path/to/app.apk

# Or share download link with testers
```

### iOS TestFlight

```bash
# Submit to TestFlight
eas submit --platform ios

# Or manually upload to App Store Connect
```

### Test Checklist
- [ ] App installs successfully
- [ ] First launch shows migration screen
- [ ] Can add/edit hours
- [ ] Week navigation works
- [ ] Pay weeks display correctly
- [ ] History loads and refreshes
- [ ] Export/import works
- [ ] Settings changes persist
- [ ] App works in airplane mode
- [ ] App restarts without data loss

## App Store Submission

### Google Play Store

#### 1. Prepare Assets
- [ ] App icon (512x512 PNG)
- [ ] Feature graphic (1024x500 PNG)
- [ ] Screenshots (phone and tablet sizes)
- [ ] Privacy policy URL
- [ ] App description

#### 2. Google Play Console
1. Create app in console
2. Upload AAB file
3. Complete store listing:
   - Title: "VRS Time Wizard"
   - Short description (80 chars): "Offline-first timesheet tracking for railroad maintenance workers"
   - Full description: [See template below]
   - Screenshots
   - Categorization: Business/Productivity
   - Content rating: Everyone
4. Set pricing (Free)
5. Submit for review

Review typically takes 1-3 days.

### Apple App Store

#### 1. Prepare Assets
- [ ] App icon (1024x1024 PNG)
- [ ] Screenshots (required sizes for iPhone, iPad)
- [ ] Privacy policy URL
- [ ] App description
- [ ] Keywords
- [ ] Support URL

#### 2. App Store Connect
1. Create app record
2. Upload build (via EAS submit or Transporter)
3. Complete app information:
   - Name: "VRS Time Wizard"
   - Subtitle: "Offline Timesheet Tracking"
   - Category: Business
   - Description: [See template below]
   - Keywords: timesheet, tracking, offline, railroad, hours
4. Set pricing (Free)
5. Select build
6. Submit for review

Review typically takes 1-7 days.

## Store Listing Template

### Description

```
VRS Time Wizard - Offline Timesheet Tracking

Track your work hours offline with VRS Time Wizard, designed specifically for railroad maintenance workers. No internet connection required!

KEY FEATURES:
• Fully Offline - All data stored on your device
• Weekly Timesheet Grid - Easy hour entry with +/- buttons
• Pay Week Detection - Automatic calculation of pay cycles
• Paper Helper - Formatted view for manual timesheet entry
• Backup & Restore - Export and import your data
• Multiple Line Codes - VTR, GMRC, CLP, and custom projects

SMART TRACKING:
• Separate Straight Time (ST) and Overtime (OT) tracking
• Automatic week calculation (Sunday-Saturday)
• 40-hour ST cap with visual progress bar
• Pay week badges and 2-week cycle totals

REPORTS & HISTORY:
• Dashboard with current week overview
• History of past 8 weeks
• Detailed weekly summaries by line and day
• Paper Timesheet Helper for easy transcription

OFFLINE-FIRST:
• Works completely without internet
• Data never leaves your device
• No account required
• Privacy focused

Perfect for railroad maintenance workers, contractors, and anyone who needs reliable offline time tracking!
```

### Screenshots to Include
1. Dashboard screen
2. Timesheet grid with hours
3. Weekly summary with Paper Helper
4. History view with pay weeks
5. Settings and backup options

## Post-Deployment

### Monitoring

#### Analytics Setup (Optional)
```bash
# Install analytics
npx expo install expo-firebase-analytics
# or
npm install @react-native-firebase/analytics
```

Track:
- Daily active users
- Feature usage
- Crash reports
- Export/import frequency

#### Crash Reporting
```bash
# Install Sentry
npm install @sentry/react-native
```

Configure in app/_layout.tsx:
```typescript
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  enableInExpoDevelopment: false,
});
```

### User Support

#### Support Channels
- Email: support@yourcompany.com
- In-app feedback (future feature)
- App store reviews

#### Common Issues & Solutions

**Issue**: Migration failed  
**Solution**: Clear app data and restart, or choose "Start Fresh"

**Issue**: Pay weeks not showing correctly  
**Solution**: Check Debug Information screen, verify base date is Nov 29, 2025

**Issue**: Export not working  
**Solution**: Check storage permissions, ensure device has space

**Issue**: Grid misalignment  
**Solution**: Restart app, update to latest version

### Update Process

#### For Bug Fixes
```bash
# Increment version
# Update CHANGELOG.md
# Build new version
eas build --platform all --profile production

# Submit updates
eas submit --platform android
eas submit --platform ios
```

#### For New Features
1. Develop in feature branch
2. Test thoroughly
3. Update documentation
4. Increment version number
5. Build and submit

### Versioning

Follow semantic versioning: MAJOR.MINOR.PATCH

- **MAJOR**: Breaking changes (e.g., 2.0.0)
- **MINOR**: New features (e.g., 1.1.0)
- **PATCH**: Bug fixes (e.g., 1.0.1)

Update in:
- `app.json` (`version`)
- `app.json` iOS (`buildNumber`)
- `app.json` Android (`versionCode`)
- `CHANGELOG.md`

## Rollback Plan

If critical issues discovered:

1. **Remove from stores** (temporarily)
2. **Fix issue** in codebase
3. **Test fix** thoroughly
4. **Increment patch version**
5. **Build and resubmit**
6. **Notify users** of fix availability

## Backup Strategy

### For Users
- Encourage regular exports
- Document export process
- Provide import instructions

### For Developers
- Maintain backend as backup (optional)
- Keep previous versions archived
- Document database schema changes

## Compliance

### Privacy Policy
Required for both stores. Include:
- What data is collected (minimal - only local storage)
- How data is used (timesheet tracking)
- Data sharing (none - offline-first)
- User rights (export, delete)

### Terms of Service
- Usage restrictions
- Liability limitations
- Support commitments

### Permissions
Android permissions explained:
- `READ_EXTERNAL_STORAGE`: For importing backup files
- `WRITE_EXTERNAL_STORAGE`: For exporting backup files

iOS permissions automatically handled by Expo.

## Marketing (Optional)

### Launch Plan
- Internal announcement
- Training sessions
- User guide distribution
- Feedback collection

### App Store Optimization
- Keywords: timesheet, offline, tracking, hours, railroad
- Regular updates show active development
- Respond to reviews
- Maintain 4+ star rating

## Troubleshooting Deployment

### Build Fails

**Error**: Gradle build failed  
**Solution**: Clean and rebuild
```bash
cd android && ./gradlew clean
eas build --platform android --profile production
```

**Error**: Provisioning profile issues (iOS)  
**Solution**: Regenerate certificates in EAS

### Submission Rejected

**Common Reasons**:
- Missing privacy policy
- Inadequate screenshots
- Incomplete app information
- Copyright issues with name/icon

**Action**: Address feedback and resubmit

## Success Metrics

Track these post-launch:
- [ ] Download numbers
- [ ] Daily active users
- [ ] Crash-free rate (target: >99%)
- [ ] User ratings (target: 4.5+)
- [ ] Support ticket volume
- [ ] Feature usage analytics

## Next Steps After Launch

1. Monitor crash reports
2. Respond to user feedback
3. Plan updates based on usage
4. Consider cloud sync implementation
5. Add requested features

---

**Document Version**: 1.0  
**Last Updated**: November 17, 2024  
**Status**: Ready for Production Deployment
