# VRS Time Wizard - Offline-First Mobile Timesheet App

A mobile-first timesheet application for railroad maintenance workers to track hours offline and generate paper timesheet reports.

## Overview

VRS Time Wizard is an Expo React Native mobile app that replaces an old text-based timesheet system. All data is stored locally on the device using SQLite for complete offline functionality, with optional export/import for backup and data transfer.

## Key Features

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

## Tech Stack

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

## Installation & Setup

### Prerequisites
- Node.js 18+
- Expo CLI
- iOS/Android device with Expo Go app

### Initial Setup

```bash
# Install frontend dependencies
cd frontend
npm install

# Start Expo development server
npx expo start

# Scan QR code with Expo Go app
```

### Backend (Optional)

```bash
# Install backend dependencies
cd backend
pip install -r requirements.txt

# Run backend server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

## Database Schema

### time_entries
- `id`: INTEGER PRIMARY KEY
- `work_date`: TEXT (YYYY-MM-DD)
- `line_code`: TEXT
- `st_hours`: INTEGER (0-8)
- `ot_hours`: INTEGER
- `week_ending_date`: TEXT (Saturday)
- `is_pay_week`: INTEGER (0/1)
- UNIQUE constraint on (work_date, line_code)

### line_codes
- `id`: INTEGER PRIMARY KEY
- `line_code`: TEXT UNIQUE
- `label`: TEXT
- `is_visible`: INTEGER (0/1)
- `is_project`: INTEGER (0/1)
- `sort_order`: INTEGER

### settings
- `id`: INTEGER PRIMARY KEY
- `key`: TEXT UNIQUE
- `value`: TEXT

Key settings:
- `base_pay_week_ending`: "2025-11-29"
- `pay_frequency_days`: "14"

## Business Rules

### Time Entry Constraints
1. **ST Hours**: Max 8 per day per line, max 40 per week total
2. **OT Hours**: Unlimited per day, tracked separately
3. **PTO/HOLIDAY**: ST only, no OT allowed
4. **Week Definition**: Sunday-Saturday
5. **Pay Week**: Every 14 days from base date (Nov 29, 2025)

### Line Codes
- **Standard Lines**: VTR, GMRC, CLP, WACR, WACR-CRD, NEGS, NHC, NYOG, PTO, HOLIDAY
- **Project Lines**: USER-CREATED (format: "PROJECT ####")
- Users can hide/show lines as needed
- Project lines can be deleted, standard lines cannot

## App Architecture

### Offline-First Design
```
┌─────────────────────────────────────┐
│         Expo App (React Native)     │
│  ┌───────────────────────────────┐  │
│  │    UI Layer (Tamagui)         │  │
│  └───────────────┬───────────────┘  │
│  ┌───────────────▼───────────────┐  │
│  │  State Management (Zustand)   │  │
│  └───────────────┬───────────────┘  │
│  ┌───────────────▼───────────────┐  │
│  │  Database Service             │  │
│  │  (services/database.ts)       │  │
│  └───────────────┬───────────────┘  │
│  ┌───────────────▼───────────────┐  │
│  │     expo-sqlite (Local DB)    │  │
│  │   vrs_time_wizard.db          │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Navigation Structure
```
app/
├── _layout.tsx              # Root layout, DB initialization
├── (tabs)/                  # Tab navigation (top tabs)
│   ├── _layout.tsx         # Tab configuration
│   ├── index.tsx           # Dashboard
│   ├── timesheet.tsx       # Weekly hour entry grid
│   ├── history.tsx         # Past weeks overview
│   └── settings.tsx        # Configuration & backup
├── weekly-summary.tsx      # Detailed week report
├── migrate.tsx             # First-time data migration
└── debug-info.tsx          # Technical diagnostics
```

## Recent Bug Fixes (Nov 2024)

### Issue 1: Pay Week Calculation Off by 1 Day ✅ FIXED
**Problem**: Only Nov 15 showed PAY badge, but Nov 1, Oct 18, etc. did not
**Root Cause**: Timezone + Daylight Saving Time bug in date calculations
**Solution**: Changed to `Date.UTC()` for all date math, avoiding local timezone
**Result**: All pay weeks (every 14 days) now correctly identified

### Issue 2: Missing Historical Data ✅ FIXED
**Problem**: History showed 0 hours for weeks, but Dashboard showed correct data
**Root Cause**: weekly-summary.tsx still calling backend API instead of local DB
**Solution**: Updated to use local database service
**Result**: All screens now consistently use local data

### Issue 3: Timesheet Grid Alignment Drift ✅ FIXED
**Problem**: Line names and data rows misaligned vertically
**Root Cause**: Inconsistent row heights between regular and PTO/Holiday lines
**Solution**: Explicit height constraints (100px regular, 60px PTO/Holiday)
**Result**: Perfect alignment across all row types

### Issue 4: Export Error on Expo SDK 54 ✅ FIXED
**Problem**: `writeAsStringAsync` deprecated error
**Solution**: Changed to `expo-file-system/legacy` import
**Result**: Export/import working correctly

## File Structure

```
/app
├── frontend/
│   ├── app/                      # Expo Router screens
│   │   ├── (tabs)/              # Main navigation tabs
│   │   ├── _layout.tsx          # Root layout
│   │   ├── weekly-summary.tsx   # Week details
│   │   ├── migrate.tsx          # Data migration
│   │   └── debug-info.tsx       # Debug screen
│   ├── services/
│   │   ├── database.ts          # SQLite service (native)
│   │   ├── database.web.ts      # Mock DB (web preview)
│   │   └── migration.ts         # Backend migration utility
│   ├── store/
│   │   └── timesheetStore.ts    # Zustand state management
│   ├── tamagui.config.ts        # UI configuration
│   ├── package.json
│   └── app.json                 # Expo configuration
├── backend/                      # Optional FastAPI server
│   ├── server.py                # API endpoints
│   ├── vrs_time_wizard.db       # Backend SQLite (legacy)
│   └── requirements.txt
├── README.md                     # This file
├── ARCHITECTURE.md              # Technical deep dive
├── CHANGELOG.md                 # Version history
├── NEXT_STEPS.md                # Future work
└── test_result.md               # Testing documentation
```

## Usage Guide

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
4. Delete project lines (swipe or tap button)

### Backup & Restore
1. **Export**: Settings → Export Backup → Share/Save
2. **Import**: Settings → Import Backup → Select file → Confirm

### Troubleshooting
1. Go to **Settings** → **Debug Information**
2. View database contents, pay week calculations, and diagnostics
3. Tap **Refresh** to reload data

## Known Limitations

1. **Web Preview**: SQLite not supported, use iOS/Android device
2. **Migration**: One-time process, existing data on backend must be manually re-entered if not migrated
3. **Sync**: No automatic cloud sync yet (future feature)
4. **PDF Export**: Not implemented yet (shows Paper Timesheet Helper instead)

## Future Enhancements

### Planned Features
- [ ] PDF generation for completed timesheets
- [ ] Cloud sync with backend
- [ ] Multi-user/admin portal
- [ ] Notifications/reminders
- [ ] Additional report types
- [ ] Configurable pay week settings in UI
- [ ] Time entry notes/comments
- [ ] Photo attachments

### Backend Sync (Future)
The backend is preserved for potential future features:
- Multi-device sync
- Supervisor/admin portal
- Bulk timesheet collection
- Team management

## Development

### Running Tests
```bash
# Backend testing
cd backend
pytest

# Frontend testing (manual)
# Use Debug Information screen
```

### Building for Production
```bash
# EAS Build (Expo Application Services)
cd frontend
eas build --platform android
eas build --platform ios

# Local build (development)
npx expo run:android
npx expo run:ios
```

### Environment Variables

**Frontend (.env)**
```
EXPO_PUBLIC_BACKEND_URL=http://your-backend-url
EXPO_PACKAGER_PROXY_URL=http://...
EXPO_PACKAGER_HOSTNAME=...
```

**Backend (.env)**
```
MONGO_URL=... (not used for SQLite)
```

## Contributing

### Code Style
- TypeScript for frontend
- Python (FastAPI) for backend
- Follow existing patterns
- Test thoroughly on physical devices

### Testing Checklist
- [ ] Hour entry (ST and OT)
- [ ] Week navigation
- [ ] Pay week detection
- [ ] Offline functionality
- [ ] Export/Import
- [ ] Line code management
- [ ] History and reports

## Support

For issues or questions:
1. Check Debug Information screen
2. Review this README
3. Check NEXT_STEPS.md for known issues
4. Contact development team

## License

Proprietary - For internal use only

## Acknowledgments

- Built with Expo and React Native
- UI components from Tamagui
- Icons from Ionicons
- Date handling by date-fns

---

**Version**: 1.0.0-offline  
**Last Updated**: November 2024  
**Status**: Production Ready (Offline Mode)
