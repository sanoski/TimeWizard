# VRS Time Wizard - Railroad Timesheet Mobile App

## Overview
VRS Time Wizard is a mobile timesheet tracking application for railroad MOW (Maintenance of Way) crews. It tracks straight time (ST) and overtime (OT) hours with union rules and pay period calculations.

## Current Status: MVP Complete ✅

### What Works:
- ✅ Mobile-first UI with tab navigation (Dashboard, Timesheet, History, Settings)
- ✅ Weekly timesheet grid with sticky headers (days stay at top, lines stay on left)
- ✅ ST/OT hour tracking with +/- buttons
- ✅ ST validation: max 8 hours/day per line, 40 hours/week total
- ✅ PTO and HOLIDAY lines (ST only, no OT)
- ✅ Pay week detection (Nov 23-29, 2025 and every 14 days)
- ✅ Dashboard with "This Pay Cycle" view (shows 2-week totals on pay weeks)
- ✅ Weekly summary screen (formatted for manual paper timesheet filling)
- ✅ Project line management (add/remove project numbers)
- ✅ Line visibility toggles in settings
- ✅ Data export/import (JSON format)
- ✅ Backend API with SQLite database
- ✅ Week navigation (previous/next week)

### Known Issues:
- ⚠️ **CRITICAL**: App requires backend server - NOT truly offline
- ⚠️ Line name cell heights may need fine-tuning for perfect alignment
- ⚠️ Metro bundler cache issues during development (clear with `rm -rf .metro-cache`)

## 🚨 CRITICAL NEXT STEP: Make App Truly Offline

### Current Architecture Problem:
```
Mobile App (Frontend) → API Calls → Backend Server → SQLite Database
```
**Issue**: Requires internet connection and running backend server

### Required Architecture:
```
Mobile App (Frontend + expo-sqlite) → SQLite Database (on phone)
```
**Goal**: All data stored locally on device, no server needed

### Steps to Make Offline:

1. **Install expo-sqlite**
   ```bash
   cd /app/frontend
   yarn add expo-sqlite
   ```

2. **Move Database Logic to Frontend**
   - Create `/app/frontend/services/database.ts`
   - Copy all SQL schema from `backend/server.py`
   - Implement SQLite operations using expo-sqlite API

3. **Update Zustand Store**
   - Replace all `fetch()` calls with direct database calls
   - Remove `BACKEND_URL` dependencies
   - Keep same state management structure

4. **Remove Backend Dependency**
   - Keep backend code for reference
   - Update app to work without API calls

5. **Test Offline Functionality**
   - Turn off WiFi/data on test device
   - Verify all features work
   - Test data persistence across app restarts

### Reference Implementation:
```typescript
// Example: frontend/services/database.ts
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabase('timesheet.db');

export const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS time_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          work_date TEXT NOT NULL,
          week_ending_date TEXT NOT NULL,
          line_code TEXT NOT NULL,
          st_hours INTEGER DEFAULT 0,
          ot_hours INTEGER DEFAULT 0,
          is_pay_week INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(work_date, line_code)
        );`,
        [],
        () => resolve(true),
        (_, error) => reject(error)
      );
    });
  });
};
```

## Tech Stack

### Frontend (Expo React Native)
- **Framework**: Expo SDK with expo-router
- **State Management**: Zustand
- **UI Components**: React Native core components
- **Navigation**: expo-router with tabs
- **Date Handling**: date-fns
- **Icons**: @expo/vector-icons
- **File System**: expo-file-system (for export)
- **Sharing**: expo-sharing (for export)

### Backend (FastAPI + SQLite)
- **Framework**: FastAPI
- **Database**: SQLite with aiosqlite
- **CORS**: Enabled for development

## Project Structure

```
/app
├── backend/
│   ├── server.py          # FastAPI server with SQLite
│   ├── requirements.txt   # Python dependencies
│   ├── timesheet.db      # SQLite database (auto-created)
│   └── .env              # Backend config
├── frontend/
│   ├── app/
│   │   ├── (tabs)/       # Tab navigation screens
│   │   │   ├── index.tsx        # Dashboard
│   │   │   ├── timesheet.tsx    # Weekly grid
│   │   │   ├── history.tsx      # Past weeks
│   │   │   ├── settings.tsx     # Settings & line management
│   │   │   └── _layout.tsx      # Tab navigation config
│   │   ├── weekly-summary.tsx   # Weekly summary view
│   │   └── _layout.tsx          # Root layout with Tamagui
│   ├── store/
│   │   └── timesheetStore.ts    # Zustand state management
│   ├── assets/           # Images and fonts
│   ├── package.json      # Dependencies
│   ├── app.json         # Expo config
│   └── .env             # Frontend config
├── test_result.md       # Testing log
└── README.md           # This file
```

## Setup Instructions

### Prerequisites
- Node.js 18+
- Python 3.8+
- Expo Go app on mobile device (for testing)

### Installation

1. **Backend Setup**
   ```bash
   cd /app/backend
   pip install -r requirements.txt
   python server.py
   ```
   Backend runs on http://localhost:8001

2. **Frontend Setup**
   ```bash
   cd /app/frontend
   yarn install
   yarn start
   ```
   Scan QR code with Expo Go app

### Environment Variables

**Backend (.env)**
```
MONGO_URL=<leave as is>
```

**Frontend (.env)**
```
EXPO_PACKAGER_PROXY_URL=<auto-configured>
EXPO_PACKAGER_HOSTNAME=<auto-configured>
EXPO_PUBLIC_BACKEND_URL=<auto-configured>
```

## Key Features Explained

### 1. Work Week & Pay Periods
- **Work week**: Sunday → Saturday
- **Week ending**: Always Saturday
- **Pay weeks**: Every 2 weeks starting Nov 23, 2025 (Saturday)
- **Pay day**: Friday (e.g., paid Nov 28 for work Nov 9-22)

### 2. Hour Validation Rules
- **ST per day**: Max 8 hours per line code
- **ST per week**: Max 40 hours total across all lines
- **OT**: No limit, tracked separately
- **PTO/HOLIDAY**: ST only (no OT allowed)

### 3. Line Codes
**Standard Lines** (in order matching paper timesheet):
- VTR, GMRC, CLP, WACR, WACR-CRD, NEGS, NHC, NYOG, PTO, HOLIDAY

**Project Lines**: 
- Dynamic (user adds as needed)
- Format: "PROJECT ####" (e.g., "PROJECT 6545")

### 4. Dashboard Pay Cycle View
- **Regular weeks**: Shows "This Week" with current week hours
- **Pay weeks**: Shows "This Pay Cycle" with current + previous week totals
- Progress bar shows ST toward 40-hour weekly max

### 5. Weekly Summary
- Formatted to match paper timesheet layout
- Lines ordered same as official form
- Shows ST/OT breakdown by line and by day
- Accessible via "View Previous Week Summary" button

## API Endpoints

### Time Entries
- `POST /api/entries` - Create/update time entry
- `GET /api/entries?week_ending={date}` - Get entries for week
- `GET /api/entries?start_date={date}&end_date={date}` - Get date range

### Line Codes
- `GET /api/lines` - Get all line codes
- `POST /api/lines` - Add project line
- `PUT /api/lines/{code}` - Toggle visibility
- `DELETE /api/lines/{code}` - Delete project line

### Week Info
- `GET /api/week-info?work_date={date}` - Get week ending & pay week status

### Summary
- `GET /api/weekly-summary?week_ending={date}` - Get week totals

### Settings
- `GET /api/settings` - Get all settings
- `PUT /api/settings/{key}` - Update setting

### Export/Import
- `GET /api/export` - Export all data as JSON
- `POST /api/import` - Import data from JSON

## Database Schema

### time_entries
```sql
CREATE TABLE time_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_date TEXT NOT NULL,
  week_ending_date TEXT NOT NULL,
  line_code TEXT NOT NULL,
  st_hours INTEGER DEFAULT 0,
  ot_hours INTEGER DEFAULT 0,
  is_pay_week INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(work_date, line_code)
);
```

### line_codes
```sql
CREATE TABLE line_codes (
  line_code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  is_project INTEGER DEFAULT 0,
  is_visible INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### settings
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Default Settings:**
- `base_pay_week_ending`: "2025-11-29"
- `pay_frequency_days`: "14"

## Testing

### Backend Testing
- All 26 backend tests passing ✅
- Tested via curl and deep_testing_backend_v2 agent

### Frontend Testing
- Manual testing via Expo Go
- Tested on mobile device
- Key flows verified:
  - Hour entry with validation
  - Week navigation
  - Project line addition
  - Weekly summary generation
  - Settings management

## Building Standalone App

### Using EAS Build

1. **Install EAS CLI**
   ```bash
   npm install -g @expo/eas-cli
   ```

2. **Configure**
   ```bash
   cd /app/frontend
   eas build:configure
   ```

3. **Build Android APK**
   ```bash
   eas build --platform android --profile preview
   ```

4. **Build iOS IPA** (requires Apple Developer account)
   ```bash
   eas build --platform ios --profile preview
   ```

### Important Notes:
- ⚠️ **Must convert to offline app first** (see Critical Next Step above)
- Current version requires backend server running
- Standalone app won't work without backend

## Troubleshooting

### Metro Bundler Cache Issues
```bash
cd /app/frontend
rm -rf .metro-cache .expo
sudo supervisorctl restart expo
```

### Backend Not Starting
```bash
cd /app/backend
pip install -r requirements.txt --force-reinstall
sudo supervisorctl restart backend
```

### Date Display Issues (Timezone)
- Always append 'T00:00:00' to date strings when creating Date objects
- Example: `new Date('2025-11-16' + 'T00:00:00')`
- This prevents timezone shifting

### Grid Scrolling Jittery
- Issue: Circular scroll synchronization causing feedback loop
- Solution: Use one-way binding (main grid controls headers, not vice versa)
- Set header scrollviews to `scrollEnabled={false}`

## Version History

### v1.0.0 - Current (Nov 16, 2025)
- Initial MVP complete
- All core features implemented
- Backend tested and verified
- Frontend functional on mobile
- **Requires backend server** (not offline yet)

### Planned for v1.1.0
- [ ] Convert to true offline app with expo-sqlite
- [ ] Remove backend dependency
- [ ] PDF export feature
- [ ] Paycheck estimator (placeholder in place)

## Contributing

### Code Style
- TypeScript for frontend
- Python with type hints for backend
- Follow existing patterns in codebase

### Testing Requirements
- Backend: Test all API endpoints
- Frontend: Test on physical device via Expo Go
- Verify offline functionality before release

## Support & Resources

- **Expo Documentation**: https://docs.expo.dev/
- **React Native**: https://reactnative.dev/
- **FastAPI**: https://fastapi.tiangolo.com/
- **expo-sqlite**: https://docs.expo.dev/versions/latest/sdk/sqlite/

## License

Proprietary - For VRS Railroad internal use only.

## Contact

For questions or issues, contact the development team.

---

**Last Updated**: November 16, 2025  
**Status**: MVP Complete, Requires Offline Conversion  
**Next Priority**: Convert to expo-sqlite for true offline functionality
