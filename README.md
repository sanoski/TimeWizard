# VRS Time Wizard - Offline-First Mobile Timesheet App

A mobile-first timesheet application for railroad maintenance workers to track hours offline and generate paper timesheet reports.

## Overview

VRS Time Wizard is an Expo React Native mobile app that replaces an old text-based timesheet system. All data is stored locally on the device using SQLite for complete offline functionality, with optional export/import for backup and data transfer.

## ✨ Key Features

### ✅ Fully Offline
- All data stored locally using expo-sqlite
- No internet connection required after initial setup
- Complete CRUD operations work offline
- Data persists across app restarts

### 📅 Weekly Timesheet Grid
- Sunday-Saturday weekly grid layout
- Multiple line codes (VTR, GMRC, CLP, WACR, etc.)
- Separate ST (Straight Time) and OT (Overtime) entry per day/line
- Sticky headers and line names for easy scrolling
- +/- buttons for hour entry

### 💰 Pay Week Detection
- Configurable pay cycle (default: 14 days)
- Base pay week: Nov 29, 2025
- Automatic calculation of all pay weeks (past and future)
- Pay week badge display in history
- Dashboard shows 2-week totals during pay weeks

### 📊 Reports & History
- **Dashboard**: Current/pay cycle overview with progress bar
- **History**: Past 8 weeks with expandable summaries
- **Weekly Summary**: Detailed breakdown by line and day
- **Paper Timesheet Helper**: Formatted for easy manual transcription

### 💾 Backup & Restore
- Export to timestamped JSON files
- Import from backup files
- Share via native share sheet
- Complete data portability

### ⚙️ Settings
- Toggle line code visibility
- Add/remove project lines dynamically
- Debug information screen
- Export/Import data management

## 🛠️ Tech Stack

### Frontend
- **Framework**: Expo SDK 51 / React Native
- **Routing**: expo-router (file-based)
- **UI Library**: Tamagui
- **State Management**: Zustand
- **Database**: expo-sqlite (local)
- **Date Handling**: date-fns
- **File Operations**: expo-file-system, expo-sharing, expo-document-picker

### Backend (Optional/Future)
- **Framework**: FastAPI (Python)
- **Database**: SQLite (aiosqlite)
- **Purpose**: Reserved for future cloud sync features

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+
- Expo CLI
- iOS/Android device with Expo Go app

### Frontend Setup

```bash
# Install dependencies
cd frontend
npm install

# Start Expo development server
npx expo start

# Scan QR code with Expo Go app on your phone
```

### Backend (Optional)

```bash
# Install dependencies
cd backend
pip install -r requirements.txt

# Run backend server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

## 📱 Usage Guide

### First Time Setup
1. Open app → Migration screen appears
2. Choose "Migrate Data" (if you have backend data) or "Start Fresh"
3. Wait for migration to complete
4. App opens to Dashboard

### Adding Hours
1. Go to **Timesheet** tab
2. Use arrow buttons to navigate weeks
3. Tap **+** to add hours (ST or OT)
4. Tap **-** to remove hours
5. Data saves automatically

### Viewing Reports
1. **Dashboard**: See current week totals and pay cycle info
2. **History**: Browse past 8 weeks, tap to expand
3. **Weekly Summary**: Detailed breakdown with Paper Timesheet Helper

### Managing Line Codes
1. Go to **Settings** tab
2. Toggle switches to show/hide lines
3. Add project lines with "Add Project Line"
4. Delete project lines (standard lines cannot be deleted)

### Backup & Restore
1. **Export**: Settings → Export Backup → Share/Save
2. **Import**: Settings → Import Backup → Select file → Confirm

### Troubleshooting
1. Go to **Settings** → **Debug Information**
2. View database contents, pay week calculations, and diagnostics
3. Tap **Refresh** to reload data

## 🐛 Recent Bug Fixes (Nov 2024)

### ✅ Pay Week Calculation Off by 1 Day - FIXED
**Problem**: Only Nov 15 showed PAY badge  
**Root Cause**: Timezone + DST bug in date calculations  
**Solution**: Changed to `Date.UTC()` for timezone-independent math  
**Result**: All pay weeks correctly identified

### ✅ Missing Historical Data - FIXED
**Problem**: History showed 0 hours, Dashboard showed correct data  
**Root Cause**: weekly-summary.tsx still calling backend API  
**Solution**: Updated to use local database  
**Result**: All screens now use local data consistently

### ✅ Timesheet Grid Alignment Drift - FIXED
**Problem**: Line names and data rows misaligned vertically  
**Root Cause**: Inconsistent row heights  
**Solution**: Explicit height constraints (100px regular, 60px PTO/Holiday)  
**Result**: Perfect alignment

### ✅ Export Error on Expo SDK 54 - FIXED
**Problem**: `writeAsStringAsync` deprecated error  
**Solution**: Changed to `expo-file-system/legacy`  
**Result**: Export/import working correctly

## ⚠️ Known Limitations

1. **Web Preview**: SQLite not supported, use iOS/Android device
2. **One-Time Migration**: Backend data must be migrated on first launch or re-entered
3. **No Cloud Sync**: Offline-only for now (future feature)
4. **No PDF Export**: Use Paper Timesheet Helper for manual transcription

## 🚀 Future Enhancements

- [ ] PDF generation for completed timesheets
- [ ] Cloud sync with backend
- [ ] Multi-user/admin portal
- [ ] Notifications/reminders
- [ ] Configurable pay week settings in UI

## 📄 License

Proprietary - For internal use only

---

**Version**: 1.0.0-offline  
**Last Updated**: November 17, 2024  
**Status**: Production Ready (Offline Mode)
