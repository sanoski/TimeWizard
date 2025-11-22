# Session Notes - November 22, 2025

## Summary
Completed v1.2.0 implementation: On-Call Schedule feature with Google Sheets sync, unified calendar view, and developer menu.

---

## What Was Built Today

### 1. Database Migration System (Phase 1) ✅
**Files:**
- `/app/frontend/services/migrations.ts` - Complete migration framework
- `/app/frontend/services/database.ts` - Added on-call methods

**Features:**
- Schema versioning table
- Migration v1.0 → v2.0 (on-call tables)
- Data preservation verification
- Rollback capability

**New Tables:**
```sql
schema_version (id, version, name, applied_at)
on_call_users (id, user_name, is_current_user, created_at)
on_call_schedule (id, start_date, end_date, user_name, notes, is_swapped, original_user_name, created_at, updated_at)
```

**Database Methods Added:**
- `getAllOnCallUsers()`
- `getCurrentUser()`
- `setCurrentUser(userName)`
- `addOnCallUser(userName, isCurrentUser)`
- `importOnCallUsers(users[])`
- `getOnCallSchedule(startDate, endDate)`
- `getOnCallForDate(date)`
- `getOnCallForWeekend(startDate, endDate)`
- `getMyOnCallDays(startDate, endDate)`
- `addOnCallSchedule(startDate, endDate, userName, notes)`
- `swapOnCallShift(startDate, endDate, originalUser, newUser)`
- `importOnCallSchedule(scheduleData[])`
- `clearOnCallSchedule(startDate?, endDate?)`
- `database` getter for direct queries

---

### 2. On-Call Schedule Tab (Phase 2) ✅
**File:** `/app/frontend/app/(tabs)/oncall.tsx`

**Features:**
- User setup flow (enter name on first launch)
- Monthly weekend view
- Month navigation (prev/next)
- "My Upcoming Shifts" section
- Visual indicators:
  - Blue highlight for user's on-call weekends
  - "YOU" badge on user's shifts
  - "Swapped" badges for swapped shifts
- Weekend cards showing 2 people per weekend
- Test data loader button
- Empty states

**Navigation:**
- Added "On-Call" tab between History and Settings
- Icon: people icon

---

### 3. Google Sheets Sync Feature ✅
**File:** `/app/frontend/app/(tabs)/settings.tsx`

**Features:**
- CSV sync from public Google Sheets URL
- Master schedule URL storage (AsyncStorage)
- "Sync Now" button
- Last sync timestamp
- Full schedule replacement on sync (not additive)
- Validation of CSV format
- User extraction and import
- Error handling with user-friendly messages

**How It Works:**
1. Boss maintains schedule in Google Sheet
2. Boss publishes sheet as CSV (File → Share → Publish to web → CSV)
3. Admin configures URL in app (developer menu)
4. Users tap "Sync Schedule" to update
5. App downloads CSV, parses, clears old data, imports new data

**CSV Format:**
```csv
start_date,end_date,user,notes
2025-12-06,2025-12-07,Josh Russell,
2025-12-06,2025-12-07,Joe Chief,
```

**Bug Fixes:**
- Fixed `clearOnCallSchedule()` using wrong column name (schedule_date → start_date)
- Now properly clears all data before importing

---

### 4. Developer Menu (Hidden) ✅
**File:** `/app/frontend/app/(tabs)/settings.tsx`

**Access:** Tap "Version 1.2.0" 5 times in About section

**Features:**
- Master Schedule URL configuration
- Save URL button
- Clear All On-Call Data button (with confirmation)
- Close Developer Menu button
- Red theme styling (warning colors)

**Purpose:**
- Admin/developer-only configuration
- Regular users don't see URL field
- URL configured once, used by all

---

### 5. Unified Calendar in History Tab ✅
**File:** `/app/frontend/app/(tabs)/history.tsx`

**Features:**
- Toggle button: "List View" | "Calendar View"
- Full month calendar with react-native-calendars
- Multi-dot markers:
  - 🔵 Blue = Hours logged
  - 🟠 Orange = Work notes
  - 🟢 Green = User is on-call
- Weekend highlighting:
  - Gray background for all weekends
  - Green background + bold text for user's on-call weekends
- Day detail modal on tap:
  - Hours summary (ST/OT/Total)
  - Lines worked that day
  - Notes for that day (with line codes)
  - On-call info (who's on call, highlights if you)
- Legend explaining all indicators
- Month navigation with arrows
- Empty states for days with no data

**Bug Fixes:**
- Modal rendering issue on native (maxHeight → height: 85%)
- Modal content not displaying (simplified rendering)
- Database query access (added `database` getter)

---

### 6. Performance & UX Improvements ✅
**File:** `/app/frontend/app/(tabs)/timesheet.tsx`

**Features:**
- Haptic feedback on button presses (expo-haptics)
- Debouncing to prevent duplicate taps (300ms window)
- Visual pressed states (opacity + scale)
- Larger touch areas (8px hitSlop)
- Better disabled button styling
- Error handling with user alerts

**Bug Fixes:**
- Database initialization added to timesheet screen
- Buttons now work on both web and native
- Data actually saves when tapping +/- buttons

---

## Files Created/Modified

### New Files:
1. `/app/frontend/services/migrations.ts` - Migration system
2. `/app/frontend/app/(tabs)/oncall.tsx` - On-call schedule screen
3. `/app/test_oncall_schedule.csv` - Test data (updated with user's names)
4. `/app/PHASE_1_MIGRATION_COMPLETE.md` - Phase 1 documentation
5. `/app/APK_UPDATE_GUIDE.md` - Guide for APK updates
6. `/app/BUTTON_PERFORMANCE_FIX.md` - Button fix documentation
7. `/app/SESSION_NOTES_NOV22_2025.md` - This file

### Modified Files:
1. `/app/frontend/app/(tabs)/_layout.tsx` - Added on-call tab
2. `/app/frontend/app/(tabs)/history.tsx` - Complete rewrite with calendar
3. `/app/frontend/app/(tabs)/settings.tsx` - Added sync + dev menu
4. `/app/frontend/app/(tabs)/timesheet.tsx` - Button improvements
5. `/app/frontend/services/database.ts` - Added on-call methods + database getter
6. `/app/frontend/services/databaseWrapper.ts` - No changes
7. `/app/frontend/app.json` - Version bump to 1.2.0, versionCode: 3
8. `/app/frontend/package.json` - Added react-native-calendars, @react-native-async-storage/async-storage

---

## Known Issues & Limitations

### Fixed Today:
1. ✅ Buttons not working (database not initialized)
2. ✅ Calendar modal empty (height constraint issue)
3. ✅ Sync duplicating data (clearOnCallSchedule bug)
4. ✅ Column name mismatch (schedule_date vs start_date)

### Current Limitations:
1. **Web Preview:** Mock database, doesn't save data (by design)
2. **Manual CSV Import:** Not implemented yet (only Google Sheets sync)
3. **Shift Swaps:** UI exists but functionality not built
4. **Auto-Sync:** No background sync yet (manual only)
5. **Notifications:** Not implemented

---

## Testing Performed

### Tested on Native Device (via Expo Go):
- ✅ Database migration runs successfully
- ✅ On-call tab displays correctly
- ✅ User setup flow works
- ✅ Test data loader works
- ✅ Google Sheets sync works (replaces all data)
- ✅ Calendar displays with dots
- ✅ Weekends highlighted correctly
- ✅ User's on-call weekends show green
- ✅ Day detail modal shows content
- ✅ Timesheet buttons work with haptics
- ✅ Developer menu accessible (tap 5x)

### Not Tested:
- ⏸️ APK build and update process
- ⏸️ Multiple users syncing same schedule
- ⏸️ Large schedule data (100+ weekends)
- ⏸️ Network failures during sync

---

## Architecture Changes

### Database Schema v2.0:
```
v1.0 Tables (existing):
- time_entries (work_date, line_code, st_hours, ot_hours, week_ending_date)
- line_codes (line_code, is_visible, created_at)
- settings (key, value)
- work_notes (id, work_date, line_code, note_text, created_at)

v2.0 Tables (added today):
- schema_version (id, version, name, applied_at)
- on_call_users (id, user_name, is_current_user, created_at)
- on_call_schedule (id, start_date, end_date, user_name, notes, is_swapped, original_user_name, created_at, updated_at)
```

### New Dependencies:
- `react-native-calendars` - Calendar component
- `@react-native-async-storage/async-storage` - URL/sync time storage
- `expo-haptics` - Button feedback (already existed)

---

## Critical Decisions Made

### 1. Google Sheets as Master Schedule
**Decision:** Use Google Sheets CSV export as single source of truth
**Reasoning:**
- Boss already familiar with spreadsheets
- No backend server needed
- Easy to edit/maintain
- Version history built-in (Google Sheets)
- Public CSV URL requires no authentication

**Implications:**
- Sync replaces entire schedule (not additive)
- Boss must maintain complete schedule in sheet
- Partial updates = sheet must contain all data

### 2. Offline-First with Manual Sync
**Decision:** App works 100% offline, sync is manual
**Reasoning:**
- Railroad work areas have poor/no signal
- User control over data updates
- No background processes draining battery
- Simple, predictable behavior

**Implications:**
- Users must remember to sync
- Schedule updates not instant
- No conflict resolution needed (last sync wins)

### 3. Developer Menu for URL Configuration
**Decision:** Hide URL config behind version tap easter egg
**Reasoning:**
- Regular users don't need to see technical details
- URL configured once by admin
- Reduces confusion and support requests
- Still accessible when needed

**Implications:**
- Admin must document how to access
- URL can be changed if needed
- Clear all data option available

### 4. Calendar Embedded in History Tab
**Decision:** Toggle between list and calendar views
**Reasoning:**
- Keeps navigation simple (no extra tab)
- Related functionality (both show historical data)
- Easy to switch between views
- Saves screen space

**Implications:**
- History tab more complex
- More code in single file
- Toggle state to manage

---

## Next Session Priorities

### High Priority:
1. **APK Build & Test** - Build production APK, test update process
2. **Shift Swap Feature** - Allow recording weekend swaps
3. **Bug Fixes** - Address any issues found in testing

### Medium Priority:
4. **Auto-Sync** - Background schedule updates
5. **User Profile** - Change name in settings
6. **Enhanced On-Call Tab** - Weekend detail modal

### Low Priority:
7. **Notifications** - On-call reminders
8. **Export/Share** - Share schedule with others
9. **Analytics** - On-call stats/history

---

## Commands to Remember

### Restart Expo:
```bash
sudo supervisorctl restart expo
```

### Check Status:
```bash
sudo supervisorctl status expo
```

### View Logs:
```bash
sudo supervisorctl tail -50 expo
```

### Build APK (when ready):
```bash
cd /app/frontend
eas build --platform android --profile production
```

### Add Dependencies:
```bash
cd /app/frontend
yarn add <package-name>
```

---

## Important Notes for Tomorrow

### Before Starting:
1. Read this file completely
2. Check `/app/PHASE_1_MIGRATION_COMPLETE.md`
3. Review `/app/APK_UPDATE_GUIDE.md`
4. Test current features on device

### When Building APK:
1. Version is now 1.2.0, versionCode 3
2. Migration will run automatically on first launch
3. Users must install over old app (not uninstall/reinstall)
4. Existing data will be preserved
5. New on-call tables will be added

### Google Sheets Setup:
1. Boss creates sheet with columns: start_date, end_date, user, notes
2. File → Share → Publish to web → CSV format
3. Copy URL (looks like: docs.google.com/spreadsheets/.../export?format=csv)
4. Admin taps version 5x in app
5. Paste URL, tap Save
6. Users can now sync

### User Instructions:
1. First launch: Enter your name
2. Go to Settings → Sync Schedule
3. Check On-Call tab for your shifts
4. Check History → Calendar for full view
5. Tap dates to see details

---

## Testing Checklist for Tomorrow

### On-Call Features:
- [ ] User setup flow (first time)
- [ ] Month navigation works
- [ ] My upcoming shifts display
- [ ] Weekend cards show 2 people
- [ ] Test data loader works
- [ ] Empty states display correctly

### Google Sheets Sync:
- [ ] Paste URL in dev menu
- [ ] Save URL persists
- [ ] Sync button works
- [ ] Data replaces (not adds)
- [ ] Last sync time shows
- [ ] Error handling works
- [ ] Invalid URL shows error
- [ ] Network failure handled

### Calendar:
- [ ] Toggle between list/calendar works
- [ ] Dots appear on correct dates
- [ ] Weekends highlighted gray
- [ ] On-call weekends highlighted green
- [ ] Tap date opens modal
- [ ] Modal shows all data correctly
- [ ] Modal closes properly
- [ ] Month navigation works

### Developer Menu:
- [ ] Version tap 5x unlocks
- [ ] Alert shows
- [ ] URL field appears
- [ ] Save button works
- [ ] Clear data button works (with confirmation)
- [ ] Close button works

### Performance:
- [ ] Buttons respond quickly
- [ ] Haptic feedback works
- [ ] No duplicate entries on rapid taps
- [ ] Database operations complete
- [ ] App doesn't crash
- [ ] Smooth scrolling

---

## Code Snippets for Reference

### Access Database Directly:
```typescript
import { db } from '../../services/databaseWrapper';

// Initialize first
await db.initialize();

// Direct query
const results = await db.database.getAllAsync(
  'SELECT * FROM on_call_schedule WHERE start_date = ?',
  ['2025-12-06']
);
```

### Run Migration Manually (if needed):
```typescript
import { runMigrations } from '../../services/migrations';

await db.initialize();
await runMigrations(db.database);
```

### Clear Test Data:
```typescript
await db.initialize();
await db.clearOnCallSchedule(); // Clears all on-call data
```

### Load Test Data:
```typescript
const testSchedule = [
  { start_date: '2025-12-06', end_date: '2025-12-07', user: 'Josh Russell', notes: '' },
  { start_date: '2025-12-06', end_date: '2025-12-07', user: 'Joe Chief', notes: '' },
];
await db.importOnCallSchedule(testSchedule);
```

---

## End of Session Notes

**Total Development Time:** ~8 hours
**Features Completed:** 6 major features
**Bugs Fixed:** 4 critical issues
**Files Modified:** 8 files
**New Files Created:** 7 files
**Dependencies Added:** 2 packages

**Status:** v1.2.0 ready for testing and APK build

**Next Developer:** Read this file, test features, build APK, continue with shift swaps or polish.
