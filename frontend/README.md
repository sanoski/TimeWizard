# VRS Time Wizard 🚂

**Version 1.2.0.1** | Railroad Timesheet & On-Call Tracking App

An offline-first mobile application built with Expo for railroad workers to log work hours, track on-call schedules, and generate detailed reports.

---

## 📋 Features

### Core Functionality
- **📅 Weekly Timesheet Grid** - Log hours across multiple work lines
- **📝 Work Notes** - Add notes to specific work days and lines
- **🔄 On-Call Schedule Sync** - Automatic sync from Google Sheets
- **📊 Advanced Reports** - Generate reports with standard/overtime breakdowns
- **📱 Offline-First** - Works completely offline with SQLite
- **🗓️ Unified Calendar View** - See logged hours, notes, and on-call duties in one place
- **📤 Export Options** - CSV and PDF export for reports

### Recent Additions (v1.2.0.1)
- ✅ Fixed keyboard covering text input in note modal
- ✅ Custom MOW-themed branding and icons
- ✅ Repository cleanup (removed corrupted files)
- ✅ Improved build compatibility with Expo SDK 54

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- Yarn or npm
- Expo CLI
- Android Studio (for local builds) or EAS CLI (for cloud builds)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   yarn install
   # or
   npm install
   ```

3. **Start development server**
   ```bash
   npx expo start
   ```

4. **Test the app**
   - Scan QR code with Expo Go (iOS/Android)
   - Press `a` for Android emulator
   - Press `i` for iOS simulator
   - Press `w` for web browser

---

## 🔨 Building for Production

### Option 1: EAS Build (Recommended)

```bash
# Preview build (APK for testing)
npx expo prebuild --clean
eas build -p android --profile preview

# Production build
eas build -p android --profile production
```

### Option 2: Local Build

```bash
# Generate native Android project
npx expo prebuild --clean

# Build APK
cd android
./gradlew assembleRelease
```

**APK Location:** `android/app/build/outputs/apk/release/app-release.apk`

---

## 📦 Version History

### v1.2.0.1 (Current - November 2025)
**🔧 Patch Release - Repository Cleanup & Keyboard Fix**

- Fixed keyboard covering text input in note modal (KeyboardAvoidingView added)
- Removed corrupted UTF-8 filename blocking git checkout
- Cleaned up repository (removed android/, metro-cache/, build artifacts)
- Updated .gitignore to follow Expo best practices
- Added custom MOW-themed app icons and splash screens
- Synced with working local build configuration
- Updated Android versionCode from 3 to 4

### v1.2.0 (Base Version)
**🎉 Major Release - Full Feature Set**

- Weekly timesheet with multiple work lines
- On-call schedule sync from Google Sheets
- Unified calendar view with color-coded indicators
- Advanced reporting with date range selection
- CSV and PDF export functionality
- Auto-sync feature for schedule updates
- Work notes with daily and line-specific entries
- Non-destructive database migrations
- SQLite offline storage

---

## 🏗️ Project Structure

```
frontend/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── index.tsx      # Timesheet (Home)
│   │   ├── history.tsx    # Calendar & Reports
│   │   ├── oncall.tsx     # On-Call Schedule
│   │   └── settings.tsx   # Settings & Config
│   ├── weekly-summary.tsx # Weekly summary detail
│   └── _layout.tsx        # Root layout
├── components/            # Reusable components
│   ├── ReportsView.tsx
│   ├── WeeklyNotesModal.tsx
│   └── NotesFloatingButton.tsx
├── services/              # Business logic
│   ├── database.ts        # SQLite database
│   ├── autoSync.ts        # Google Sheets sync
│   └── migrations.ts      # Database migrations
├── assets/                # Images and static files
├── app.json              # Expo configuration
├── package.json          # Dependencies
├── eas.json              # EAS Build configuration
└── babel.config.js       # Babel configuration
```

---

## ⚙️ Configuration

### Environment Variables
No environment variables required - the app is fully self-contained and offline-first.

### Google Sheet Integration
The app syncs on-call schedules from a hardcoded Google Sheet URL. To customize:
1. Publish your Google Sheet as CSV
2. Update the URL in `constants/config.ts`

---

## 🧪 Testing

### Development Testing
```bash
# Start Expo development server
npx expo start

# Test on physical device with Expo Go
# Scan QR code from terminal
```

### Production Testing
```bash
# Generate preview APK
eas build -p android --profile preview

# Install on Android device
adb install app-preview.apk
```

---

## 🛠️ Tech Stack

- **Framework:** Expo SDK 54 with React Native 0.81
- **Routing:** Expo Router (file-based routing)
- **Database:** expo-sqlite with custom migrations
- **UI Components:** React Native core components
- **Calendar:** react-native-calendars
- **State Management:** React hooks (useState, useEffect)
- **Export:** expo-print, expo-sharing
- **Build:** EAS Build, New Architecture enabled

---

## 📱 Device Support

- **Android:** 7.0+ (API 24+)
- **iOS:** iOS 13+ (planned)
- **Screen Sizes:** Phones and tablets

---

## 🚨 Important Notes

### For Developers

**⚠️ DO NOT commit the following:**
- `android/` or `ios/` folders (regenerated during build)
- `.metro-cache/` or `.expo/` folders
- `node_modules/`
- Build artifacts (*.apk, *.aab)

**✅ Follow these guidelines:**
- Native folders are disposable and regenerated with `npx expo prebuild --clean`
- All configuration lives in `app.json`, `package.json`, `eas.json`
- Never manually edit Android/Kotlin files
- Never add `react-native-reanimated/plugin` or `react-native-worklets/plugin` manually to Babel (Expo handles this)

### For Building
- Always run `npx expo prebuild --clean` before building locally
- Use branch `1.2.0` as the canonical source of truth
- Ensure New Architecture is enabled (`newArchEnabled: true`)

---

## 📄 License

Copyright © 2025 VRS Time Wizard. All rights reserved.

---

## 🤝 Contributing

This is a private project. For questions or support, contact the project maintainer.

---

## 📞 Support

For issues or questions:
1. Check the documentation in the `/docs` folder
2. Review `BUILD_INSTRUCTIONS.md` for build troubleshooting
3. Contact the development team

---

**Built with ❤️ for railroad workers**

