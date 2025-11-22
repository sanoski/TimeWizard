# VRS Time Wizard

**Version 1.2.0** - Railroad Timesheet Tracking Application

## Overview

VRS Time Wizard is an offline-first mobile timesheet application designed for railroad maintenance-of-way (MOW) workers. It replaces paper-based systems with a local SQLite database, allowing workers to track hours, lines worked, notes, and on-call schedules without requiring internet connectivity.

---

## Features

### Core Timesheet Management
- **Weekly Timesheet Grid**: Log Straight Time (ST) and Overtime (OT) hours
- **Business Logic**: Enforces 8-hour ST cap per line, 40-hour ST cap per week
- **Line Code Management**: Support for standard lines (VTR, CLP, etc.) and project-specific codes
- **Bi-Weekly Pay Periods**: Automatic detection and calculation
- **Work Notes**: Add detailed notes to specific lines and dates

### On-Call Schedule (v1.2.0)
- **Weekend Tracking**: View and manage on-call assignments
- **Google Sheets Sync**: Import master schedule from shared spreadsheet (URL hardcoded)
- **Auto-Sync**: Weekly automatic schedule updates when app opens
- **Visual Indicators**: Highlights your on-call weekends in calendar
- **User Identification**: Set your name to filter relevant shifts
- **Zero Configuration**: Works out of the box with pre-configured sync URL

### Unified Calendar & Reports (v1.2.0)
- **Toggle View**: Switch between list, calendar, and reports views in History tab
- **Multi-Dot Markers**: Shows hours logged, notes, and on-call status
- **Day Details**: Tap any date to see hours, lines, notes, and on-call info
- **Reports Feature**: Generate detailed work hour reports with date range selection
- **PDF Export**: Professional PDF reports (monthly summary or detailed daily)
- **CSV Export**: Complete data export for spreadsheet analysis
- **Statistics**: Total hours, ST/OT breakdown, days worked, averages

### Data Management
- **100% Offline**: All data stored locally with SQLite
- **Backup/Restore**: Export and import timesheet data as JSON
- **Database Migration**: Safe schema updates without data loss
- **Google Sheets Integration**: Sync on-call schedules from master list

---

## Tech Stack

### Frontend (Mobile App)
- **Framework**: Expo (React Native)
- **Language**: TypeScript
- **Database**: expo-sqlite (SQLite on device)
- **State Management**: Zustand
- **Date Handling**: date-fns
- **UI Components**: 
  - react-native core components
  - react-native-calendars (calendar view)
  - expo-haptics (button feedback)
- **Storage**: @react-native-async-storage/async-storage

### Backend (Dormant)
- **Framework**: FastAPI (Python) - Not used in v1.2.0
- **Database**: MongoDB - Not used in v1.2.0
- **Note**: App is fully client-side, backend reserved for future server features

---

## Installation

### Prerequisites
- Node.js 18+
- Yarn
- Expo CLI
- Android Studio (for APK builds) or EAS CLI
- Physical Android device or emulator

### Development Setup

1. **Clone Repository** (if applicable)
```bash
git clone <repo-url>
cd vrs-time-wizard
```

2. **Install Dependencies**
```bash
cd frontend
yarn install
```

3. **Start Development Server**
```bash
npx expo start
```

4. **Run on Device**
- Scan QR code with Expo Go app (Android/iOS)
- Or run on emulator: `npx expo run:android`

### Building Production APK

**Using EAS Build (Recommended):**
```bash
cd frontend
eas build --platform android --profile production
```

**Local Build:**
```bash
cd frontend
npx expo build:android
```

---

## Database Schema

### Version 1.0 (Initial)
```sql
time_entries (
  id INTEGER PRIMARY KEY,
  work_date TEXT,
  line_code TEXT,
  st_hours INTEGER,
  ot_hours INTEGER,
  week_ending_date TEXT
)

line_codes (
  line_code TEXT PRIMARY KEY,
  is_visible INTEGER,
  created_at TEXT
)

settings (
  key TEXT PRIMARY KEY,
  value TEXT
)

work_notes (
  id INTEGER PRIMARY KEY,
  work_date TEXT,
  line_code TEXT,
  note_text TEXT,
  created_at TEXT
)
```

### Version 2.0 (On-Call Feature)
```sql
schema_version (
  id INTEGER PRIMARY KEY,
  version INTEGER,
  name TEXT,
  applied_at TEXT
)

on_call_users (
  id INTEGER PRIMARY KEY,
  user_name TEXT UNIQUE,
  is_current_user INTEGER,
  created_at TEXT
)

on_call_schedule (
  id INTEGER PRIMARY KEY,
  start_date TEXT,
  end_date TEXT,
  user_name TEXT,
  notes TEXT,
  is_swapped INTEGER,
  original_user_name TEXT,
  created_at TEXT,
  updated_at TEXT,
  UNIQUE(start_date, end_date, user_name)
)
```

---

## Usage

### First Time Setup

1. **Launch App**
2. **Enter Your Name** (On-Call tab prompts)
3. **Configure Base Pay Week** (Settings → typically biweekly Friday)
4. **Add Project Lines** (Settings → enter project numbers as needed)

### Daily Workflow

1. **Navigate to Timesheet Tab**
2. **Select Current Week** (automatically shown)
3. **Tap +/- Buttons** to log hours
   - ST (Straight Time): Max 8 hours per day per line
   - OT (Overtime): No limit
4. **Add Work Notes** (Tap notes button, select day, enter details)
5. **View Weekly Summary** at top of screen

### On-Call Schedule Management

#### For Regular Users (Zero Setup):
1. **App auto-syncs weekly** - Schedule updates automatically when app opens
2. **Manual sync** - Go to Settings → On-Call Schedule → "Sync Now"
3. **View shifts** - On-Call tab shows your upcoming weekends
4. **Calendar view** - History tab displays all on-call assignments
5. **Toggle auto-sync** - Settings → Auto-Sync toggle (weekly updates)

#### For Administrators:
**Master Schedule URL is hardcoded** - No user setup needed!

**To Update Master Schedule:**
1. **Edit Google Sheet** with columns: `start_date`, `end_date`, `user`, `notes`
2. **Already published as CSV** - URL hardcoded in app
3. **Users auto-sync** - Changes appear within 7 days (or manual sync)

**To Use Custom URL (Testing):**
1. Go to Settings → About section
2. Tap "Version 1.2.0" **5 times** (unlocks developer menu)
3. Paste test URL in "Master Schedule URL" field
4. Tap "Save URL"

### Generating Reports

1. **Navigate to History Tab** → Tap "Reports"
2. **Select Date Range**:
   - Quick presets: Last 30 days, 3 months, 6 months, year, YTD, all time
   - Custom range: Select specific start/end dates
3. **Optional**: Enter your name for PDF header
4. **Tap "Generate Report"** → View summary statistics
5. **Export Options**:
   - **CSV**: Complete data export (all days with details)
   - **PDF**: 
     - Ranges ≤ 90 days: Detailed daily breakdown
     - Ranges > 90 days: Monthly summary format

**Use Cases:**
- Tax records (overtime tracking)
- Raise negotiations (prove hours worked)
- Dispute resolution (comprehensive records)
- Year-end summaries

### Viewing History

1. **Go to History Tab**
2. **Toggle Between Views**:
   - **List View**: Past 8 weeks with expandable details
   - **Calendar View**: Month-by-month with dots and highlights
3. **Tap Any Date** (in calendar) to see full details:
   - Hours worked
   - Lines used
   - Notes added
   - On-call assignments

### Backup & Restore

**Export Data:**
1. Settings → Backup & Restore → Export Data
2. Save JSON file to device
3. Copy to computer/cloud for safekeeping

**Import Data:**
1. Settings → Backup & Restore → Import Data
2. Select JSON file from device
3. Confirm import (merges with existing data)

---

## Configuration

### Environment Variables

**Frontend (.env):**
```bash
EXPO_PUBLIC_API_URL=<reserved-for-future>
EXPO_PACKAGER_PROXY_URL=<auto-configured>
EXPO_PACKAGER_HOSTNAME=<auto-configured>
```

**Backend (.env):**
```bash
MONGO_URL=<not-used-in-v1.2.0>
```

### App Configuration (app.json)

```json
{
  "expo": {
    "name": "VRS Time Wizard",
    "slug": "vrs-time-wizard",
    "version": "1.2.0",
    "android": {
      "package": "com.vrstimewizard.app",
      "versionCode": 3
    }
  }
}
```

---

## Project Structure

```
/app
├── frontend/
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx          # Tab navigation
│   │   │   ├── index.tsx            # Dashboard
│   │   │   ├── timesheet.tsx        # Timesheet grid
│   │   │   ├── history.tsx          # History + Calendar
│   │   │   ├── oncall.tsx           # On-call schedule (NEW)
│   │   │   └── settings.tsx         # Settings + Sync
│   │   ├── weekly-summary.tsx       # Weekly summary screen
│   │   └── _layout.tsx              # Root layout
│   ├── components/
│   │   ├── NotesFloatingButton.tsx  # Notes button
│   │   ├── WeeklyNotesModal.tsx     # Notes modal
│   │   └── ReportsView.tsx          # Reports feature (NEW)
│   ├── services/
│   │   ├── database.ts              # SQLite operations
│   │   ├── database.web.ts          # Mock DB for web
│   │   ├── databaseWrapper.ts       # Platform selector
│   │   ├── migrations.ts            # Schema migrations (NEW)
│   │   └── autoSync.ts              # Auto-sync service (NEW)
│   ├── constants/
│   │   └── config.ts                # App configuration (NEW)
│   ├── store/
│   │   └── timesheetStore.ts        # Zustand state
│   ├── app.json                     # Expo config
│   ├── package.json                 # Dependencies
│   └── eas.json                     # EAS Build config
├── backend/                         # Dormant
├── test_oncall_schedule.csv         # Test data
├── SESSION_NOTES_NOV22_2025.md      # Today's work
├── PHASE_1_MIGRATION_COMPLETE.md    # Migration docs
├── APK_UPDATE_GUIDE.md              # Update guide
└── README.md                        # This file
```

---

## Migration Guide

### Updating from v1.1.0 to v1.2.0

**What Happens:**
1. Install new APK over existing app (do NOT uninstall first)
2. App detects schema version 1
3. Automatically runs migration to version 2
4. Adds 3 new tables (schema_version, on_call_users, on_call_schedule)
5. All existing data preserved (time_entries, work_notes, settings)

**Data Safety:**
- Migration verifies row counts before and after
- Aborts if any data is lost
- Only adds new tables, never modifies existing ones
- Rollback capability available if needed

**See:** `/app/APK_UPDATE_GUIDE.md` for detailed instructions

---

## Testing

### Manual Testing

**On Expo Go:**
1. Scan QR code with Expo Go app
2. Test on physical device (preferred) or emulator
3. Check console logs for migration messages
4. Verify all features work

**On Production APK:**
1. Build APK with EAS Build
2. Install on test device
3. Verify migration runs successfully
4. Test all features thoroughly
5. Install on main device (update over v1.1.0)

### Test Checklist
- [ ] Database migration runs without errors
- [ ] Existing timesheet data intact
- [ ] On-call tab displays correctly
- [ ] Google Sheets sync works
- [ ] Calendar view shows dots and highlights
- [ ] Day detail modal displays all data
- [ ] Timesheet buttons work with haptics
- [ ] Developer menu accessible (tap 5x)
- [ ] Backup/restore still works
- [ ] App doesn't crash on any action

---

## Troubleshooting

### Common Issues

**Issue:** Buttons don't save data
**Solution:** Database not initialized. Check console for errors, restart app.

**Issue:** Migration doesn't run
**Solution:** Force close Expo Go, rescan QR code. Check console logs.

**Issue:** Calendar modal shows only header
**Solution:** Fixed in v1.2.0. Update to latest version.

**Issue:** Sync adds duplicate data
**Solution:** Fixed in v1.2.0 (clearOnCallSchedule bug). Re-sync to replace.

**Issue:** Can't access developer menu
**Solution:** Tap "Version 1.2.0" exactly 5 times in Settings → About.

### Debug Commands

**View Database Contents:**
```typescript
import { db } from './services/databaseWrapper';

await db.initialize();
const entries = await db.database.getAllAsync('SELECT * FROM time_entries');
console.log(entries);
```

**Check Schema Version:**
```typescript
const version = await db.database.getAllAsync('SELECT * FROM schema_version');
console.log('Current version:', version);
```

**Clear Test Data:**
```typescript
await db.clearOnCallSchedule(); // Clears all on-call data
```

---

## Roadmap

### Completed (v1.2.0)
- ✅ Database migration system
- ✅ On-call schedule tables
- ✅ Google Sheets sync
- ✅ Developer menu
- ✅ Unified calendar view
- ✅ Weekend highlighting
- ✅ Day detail modal
- ✅ Performance improvements

### Planned (v1.3.0)
- ⏸️ Shift swap functionality (UI exists, logic pending)
- ⏸️ Auto-sync schedule (background updates)
- ⏸️ User profile management
- ⏸️ Enhanced on-call tab (weekend details)
- ⏸️ Notifications (on-call reminders)

### Future Considerations
- 📋 Multi-location support (Rutland, Burlington, etc.)
- 📋 Offline peer-to-peer schedule sharing
- 📋 Export to PDF
- 📋 On-call statistics and analytics
- 📋 Integration with payroll systems

---

## Contributing

### Development Guidelines

1. **Never modify existing migrations** - Only add new ones
2. **Always test on physical device** - Emulator may not catch all issues
3. **Preserve user data** - Migrations must include data verification
4. **Document breaking changes** - Update this README
5. **Follow offline-first principle** - App must work without internet

### Code Style
- TypeScript for type safety
- Functional components with hooks
- Zustand for global state
- SQLite for local storage
- Expo APIs for native features

---

## License

Proprietary - Vermont Railway (VRS) Internal Use Only

---

## Support

For issues, questions, or feature requests:
1. Check this README
2. Review session notes in `/app/SESSION_NOTES_*.md`
3. Check console logs for errors
4. Contact project maintainer

---

## Version History

### v1.2.0 (November 22, 2025)
- Added on-call schedule feature
- Google Sheets sync integration
- Unified calendar view in History tab
- Developer menu for admin configuration
- Database migration system
- Performance improvements (haptics, debouncing)
- Bug fixes (buttons, modal, sync)

### v1.1.0 (November 19, 2025)
- Added work notes feature
- Weekly notes modal with tabbed view
- Notes visible in weekly summary
- Bug fixes (pay week, grid alignment)

### v1.0.0 (November 2025)
- Initial release
- Offline-first SQLite database
- Weekly timesheet grid
- Business logic (hour caps)
- History and weekly summaries
- Backup/restore functionality

---

## Acknowledgments

- Built for Vermont Railway MOW crews
- Designed to replace paper timesheets
- Focused on offline reliability and ease of use

---

**Last Updated:** November 22, 2025  
**Current Version:** 1.2.0  
**Status:** Production Ready (Offline-First)
