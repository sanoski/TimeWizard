# Changelog

All notable changes to VRS Time Wizard will be documented in this file.

## [1.0.0-offline] - 2024-11-17

### 🎉 Major Release: Offline-First Architecture

Complete refactor from client-server to offline-first mobile application.

### Added
- **Local SQLite Database** - All data stored on device using expo-sqlite
- **Database Service Layer** - Singleton pattern with complete CRUD operations
- **Migration System** - One-time migration from backend to local database
- **Migration Screen** - User-friendly UI for first-time data setup
- **Paper Timesheet Helper** - Formatted view for manual timesheet transcription
- **Export/Import** - JSON backup and restore functionality
- **Debug Information Screen** - Technical diagnostics and database inspection
- **Platform-Specific Builds** - Separate web mock and native implementations

### Changed
- **Zustand Store** - Replaced all fetch() calls with local database operations
- **Weekly Summary** - Now reads from local database instead of backend API
- **History Tab** - Uses local database with useFocusEffect for auto-refresh
- **Tab Navigation** - Moved from bottom to top to avoid system button conflicts
- **File System** - Updated to expo-file-system/legacy for SDK 54 compatibility

### Fixed
- **Pay Week Calculation** - Fixed timezone/DST bug causing off-by-one day errors
  - Changed from local Date objects to Date.UTC() for consistent calculations
  - Now correctly identifies all pay weeks (every 14 days from Nov 29, 2025)
- **Timesheet Grid Alignment** - Fixed vertical misalignment between line names and data
  - Added explicit row heights: 100px for regular lines, 60px for PTO/Holiday
  - Synchronized scrolling between left column and main grid
- **Weekly Summary Data** - Fixed History showing 0 hours when Dashboard showed data
  - Updated to use local database consistently across all screens
- **Export Deprecation** - Fixed expo-file-system writeAsStringAsync error
  - Migrated to legacy API for backward compatibility

### Technical Details

#### Database Schema
```sql
CREATE TABLE time_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_date TEXT NOT NULL,
  line_code TEXT NOT NULL,
  st_hours INTEGER DEFAULT 0,
  ot_hours INTEGER DEFAULT 0,
  week_ending_date TEXT NOT NULL,
  is_pay_week INTEGER DEFAULT 0,
  UNIQUE(work_date, line_code)
);

CREATE TABLE line_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  line_code TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  is_visible INTEGER DEFAULT 1,
  is_project INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL
);
```

#### Key Settings
- `base_pay_week_ending`: "2025-11-29"
- `pay_frequency_days`: "14"

### Known Issues
- Web preview has limited functionality (mock database only)
- One-time migration cannot be re-run without reinstalling
- Historical data from before migration needs to be re-entered if migration wasn't performed

## [0.9.0] - 2024-11-15

### Added
- Initial client-server implementation
- FastAPI backend with SQLite
- Expo frontend with Tamagui UI
- Basic timesheet grid
- Dashboard and History tabs
- Settings for line code management

### Features
- Weekly hour entry (ST and OT)
- Line code management
- Basic reports
- Week navigation

### Known Issues (Pre-Offline)
- Required internet connection
- Backend dependency
- No offline capability
- Data not portable

---

## Version History Summary

| Version | Date | Status | Notes |
|---------|------|--------|-------|
| 1.0.0-offline | 2024-11-17 | ✅ Current | Production ready, offline-first |
| 0.9.0 | 2024-11-15 | ❌ Deprecated | Client-server architecture |

## Migration Guide: 0.9.0 → 1.0.0

### For Users
1. Update app to 1.0.0
2. Launch app
3. Choose "Migrate Data" on first screen
4. Wait for migration to complete
5. All data now stored locally

### For Developers
1. Pull latest code
2. Install new dependencies: `expo-sqlite`, `@react-native-async-storage/async-storage`
3. Backend is now optional
4. All database operations moved to `frontend/services/database.ts`
5. Test on physical device (SQLite not supported in web preview)

## Breaking Changes

### 1.0.0-offline
- **Database Location**: Moved from backend server to local device
- **API Calls**: All removed, replaced with local DB calls
- **Backend**: Now optional, reserved for future sync
- **Web Support**: Limited to mock data only
- **Migration**: One-time process required

---

**Maintained by**: Development Team  
**Last Updated**: November 17, 2024
