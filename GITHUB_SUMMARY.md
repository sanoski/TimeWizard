# VRS Time Wizard - Project Summary for GitHub

## Quick Overview

**VRS Time Wizard** is a production-ready, offline-first mobile timesheet application built with Expo/React Native. Railroad maintenance workers use it to track weekly hours (Straight Time and Overtime) across multiple line codes, with automatic pay week detection and paper timesheet generation assistance.

### Key Highlights
- ✅ **100% Offline** - Works completely without internet after initial setup
- 📱 **Mobile-First** - Built specifically for iOS/Android devices
- 💾 **Local Storage** - All data in local SQLite database on device
- 📊 **Smart Reports** - Automatic pay week detection and formatted summaries
- 🔄 **Backup/Restore** - Export/import via JSON files

## Technology Stack

```
Frontend:  Expo SDK 51, React Native, TypeScript
UI:        Tamagui (component library)
State:     Zustand
Database:  expo-sqlite (local)
Navigation: expo-router (file-based routing)
Date:      date-fns
Files:     expo-file-system, expo-sharing, expo-document-picker

Backend:   FastAPI (Python) - Optional, for future sync
```

## Architecture

```
┌──────────────────────────────────────────────────┐
│              Expo Mobile App                     │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │  UI Layer (Tamagui Components)             │ │
│  └──────────────────┬─────────────────────────┘ │
│  ┌──────────────────▼─────────────────────────┐ │
│  │  State Management (Zustand Store)          │ │
│  └──────────────────┬─────────────────────────┘ │
│  ┌──────────────────▼─────────────────────────┐ │
│  │  Database Service (database.ts)            │ │
│  │  • CRUD operations                         │ │
│  │  • Business logic                          │ │
│  │  • Week/pay calculations                   │ │
│  └──────────────────┬─────────────────────────┘ │
│  ┌──────────────────▼─────────────────────────┐ │
│  │  expo-sqlite (SQLite on device)            │ │
│  │  File: vrs_time_wizard.db                  │ │
│  └────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

## Project Structure

```
vrs-time-wizard/
├── frontend/
│   ├── app/                    # Expo Router screens
│   │   ├── (tabs)/            # Main navigation
│   │   │   ├── index.tsx      # Dashboard
│   │   │   ├── timesheet.tsx  # Hour entry grid
│   │   │   ├── history.tsx    # Past weeks
│   │   │   └── settings.tsx   # Configuration
│   │   ├── weekly-summary.tsx # Detailed reports
│   │   ├── migrate.tsx        # First-time setup
│   │   └── debug-info.tsx     # Diagnostics
│   ├── services/
│   │   ├── database.ts        # SQLite service (native)
│   │   ├── database.web.ts    # Mock (web preview)
│   │   └── migration.ts       # Data migration
│   ├── store/
│   │   └── timesheetStore.ts  # Zustand state
│   └── package.json
├── backend/                    # Optional (future sync)
│   ├── server.py              # FastAPI
│   └── requirements.txt
├── README.md                   # Main documentation
├── ARCHITECTURE.md            # Technical deep dive
├── CHANGELOG.md               # Version history
└── NEXT_STEPS.md              # Future roadmap
```

## Core Features

### 1. Timesheet Grid
Weekly grid (Sunday-Saturday) with:
- Multiple line codes (VTR, GMRC, CLP, etc.)
- Separate ST (Straight Time, max 8/day, 40/week) and OT (Overtime, unlimited)
- +/- buttons for hour entry
- Sticky headers and synchronized scrolling
- Real-time validation

### 2. Pay Week Detection
- Configurable base date (Nov 29, 2025) and frequency (14 days)
- Automatic calculation of all pay weeks
- Dashboard shows 2-week totals during pay weeks
- Visual PAY badges in history

### 3. Reports
- **Dashboard**: Current week overview, progress bar, pay cycle totals
- **History**: Past 8 weeks with expandable cards
- **Weekly Summary**: Line-by-line and day-by-day breakdown
- **Paper Timesheet Helper**: Formatted for manual transcription

### 4. Data Management
- **Export**: Timestamped JSON backups via share sheet
- **Import**: Restore from backup files
- **Migration**: One-time transfer from backend (if needed)

## Recent Bug Fixes (Nov 2024)

### 1. Pay Week Calculation ✅
- **Issue**: Only one week showing PAY badge
- **Cause**: Timezone + Daylight Saving Time causing -1 day error
- **Fix**: Changed to `Date.UTC()` for timezone-independent calculations
- **Result**: All pay weeks (every 14 days) now correct

### 2. Missing Historical Data ✅
- **Issue**: History showed 0 hours, Dashboard showed correct data
- **Cause**: weekly-summary.tsx still calling backend API
- **Fix**: Updated to use local database
- **Result**: Consistent data across all screens

### 3. Grid Alignment ✅
- **Issue**: Vertical misalignment between line names and data rows
- **Cause**: Variable row heights
- **Fix**: Explicit heights (100px regular, 60px PTO/Holiday)
- **Result**: Perfect alignment

### 4. Export Error ✅
- **Issue**: Deprecated API error in Expo SDK 54
- **Fix**: Migrated to expo-file-system/legacy
- **Result**: Export/import working

## Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI
- iOS/Android device with Expo Go

### Quick Start

```bash
# Clone repository
git clone <repo-url>
cd vrs-time-wizard

# Install frontend dependencies
cd frontend
npm install

# Start Expo dev server
npx expo start

# Scan QR code with Expo Go app
```

### First Launch
1. App opens to migration screen
2. Choose "Migrate Data" or "Start Fresh"
3. Begin tracking hours!

## Testing

### Manual Testing
- Use Debug Information screen (Settings → Debug Information)
- View database contents, pay week calculations, diagnostics
- Test on physical iOS/Android device (SQLite not supported on web)

### Test Checklist
- [ ] Hour entry (ST and OT)
- [ ] Week navigation
- [ ] Pay week detection
- [ ] Offline mode (airplane mode)
- [ ] Export/import
- [ ] Line code management

## Development Notes

### Important Files

**Core Logic**
- `frontend/services/database.ts` - All database operations
- `frontend/store/timesheetStore.ts` - Global state management

**Key Screens**
- `frontend/app/(tabs)/timesheet.tsx` - Hour entry grid (most complex)
- `frontend/app/weekly-summary.tsx` - Reports and Paper Timesheet Helper
- `frontend/app/(tabs)/history.tsx` - Past weeks overview

**Business Logic**
- Week ending calculation: Always Saturday
- Pay week detection: Every 14 days from base date using UTC
- ST validation: Max 8/day/line, 40/week total
- PTO/HOLIDAY: ST only, no OT

### Platform Considerations

**iOS/Android**
- Full functionality
- Local SQLite database
- Offline-capable

**Web**
- Preview only
- Mock database (no persistence)
- Not for production use

## Future Enhancements

### Planned
- [ ] PDF generation for timesheets
- [ ] Cloud sync with backend
- [ ] Multi-user/admin portal
- [ ] Notifications/reminders
- [ ] Configurable pay settings UI

### Backend Sync (Future)
The backend is preserved for potential features:
- Multi-device synchronization
- Supervisor/admin dashboard
- Bulk timesheet collection
- Team management

## Known Limitations

1. **Web Preview**: Limited functionality, SQLite not supported
2. **One-Time Migration**: Cannot be re-run without reinstall
3. **No Cloud Sync**: Offline-only for now
4. **No PDF**: Use Paper Timesheet Helper for manual entry

## Performance

- **Database**: Singleton pattern, indexed queries
- **UI**: useFocusEffect for data refresh, memoization for computed values
- **Memory**: Minimal footprint, only last 8 weeks in history
- **Storage**: ~1MB for typical year of data

## Security

- **Local Data**: SQLite stored on device (OS handles encryption)
- **Backups**: Plain JSON (user responsible for secure storage)
- **Network**: None required (offline-first = no attack surface)

## Contributing

### Code Style
- TypeScript for type safety
- Follow existing patterns
- Test on physical device
- Document complex logic

### Pull Request Checklist
- [ ] Tested on iOS/Android device
- [ ] No breaking changes to database schema
- [ ] Updated relevant documentation
- [ ] Added to CHANGELOG.md

## License

Proprietary - For internal use only

## Contact

For questions or issues:
1. Check Debug Information screen
2. Review documentation files
3. Contact development team

---

**Status**: ✅ Production Ready  
**Version**: 1.0.0-offline  
**Last Updated**: November 17, 2024  
**Maintainer**: Development Team
