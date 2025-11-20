# VRS Time Wizard - Session Notes: November 19, 2025

## Summary
Completed Notes feature (v1.1.0) and prepared for On-Call Schedule feature (v1.2.0).

---

## ✅ COMPLETED: Notes Feature (v1.1.0)

### What Was Built

**1. Database Schema**
- Created `work_notes` table in SQLite
- Columns: id, work_date, line_code, note_text, created_at, updated_at
- UNIQUE constraint on (work_date, line_code) prevents duplicates

**2. Database Methods (database.ts)**
- `saveNote(workDate, lineCode, noteText)` - Insert/update notes
- `getNote(workDate, lineCode)` - Get single note
- `getNotesByDate(workDate)` - Get all notes for a date
- `getNotesByWeek(weekEnding)` - Get all notes for a week
- `deleteNote(workDate, lineCode)` - Remove note
- `hasNote(workDate, lineCode)` - Check if note exists

**3. UI Components**
- `WeeklyNotesModal.tsx` - Main modal with weekly tabs
- `NotesFloatingButton.tsx` - Blue floating action button (bottom-right)
- `DailyNotesSection.tsx` - Individual day's notes list (used by modal)

**4. Features**
- **Weekly view with tabs**: 7 days (Sun-Sat) of current timesheet week
- **Visual indicators**: Green dot = notes exist, Gray dot = hours logged
- **Smart display**: Only shows lines with logged hours for that day
- **Hour breakdown**: Shows "VTR - 8h ST, 2h OT" for context
- **No character limit**: Write as much as needed
- **Edit/Delete**: Full CRUD operations
- **Badge counter**: Shows total notes for the week on floating button

**5. Integration Points**
- Timesheet screen: Floating button appears bottom-right
- Weekly Summary screen: Notes section displays all notes for the week
- Database export/import: Notes included in backup files

**6. Bug Fixes**
- Fixed timezone issue (was showing UTC date instead of local)
- Changed from `new Date().toISOString().split('T')[0]` to `format(new Date(), 'yyyy-MM-dd')`

---

## 🚨 CRITICAL: Database Preservation for v1.2.0

### User's Production Data
**User is actively using v1.1.0 in production and building their database.**

When we add On-Call Schedule feature (v1.2.0), we MUST NOT wipe existing data.

### What NOT to Do
❌ DO NOT drop existing tables
❌ DO NOT call `db.initializeDefaultData()` if database already has data
❌ DO NOT change the database initialization logic to reset data
❌ DO NOT modify existing table schemas in a breaking way

### What TO Do
✅ ADD new tables only (oncall_employees, oncall_schedule, oncall_swaps)
✅ Use `CREATE TABLE IF NOT EXISTS` for all new tables
✅ Check if tables exist before modifying
✅ Use ALTER TABLE for schema changes if needed
✅ Test migration path from v1.1.0 → v1.2.0 thoroughly
✅ Preserve all existing data in: time_entries, line_codes, work_notes, settings

### Migration Strategy for v1.2.0

```typescript
// In database.ts initialize() method:

async initialize() {
  // ... existing initialization ...
  
  // Check database version
  const version = await this.getDatabaseVersion();
  
  if (version < 2) {
    // Migrate from v1.1.0 to v1.2.0
    await this.migrateToV2();
  }
  
  // ... rest of initialization ...
}

async migrateToV2() {
  console.log('Migrating database to v1.2.0...');
  
  // Add new tables for On-Call feature
  await this.db.runAsync(`
    CREATE TABLE IF NOT EXISTS oncall_employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  await this.db.runAsync(`
    CREATE TABLE IF NOT EXISTS oncall_schedule (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_name) REFERENCES oncall_employees(name)
    )
  `);
  
  await this.db.runAsync(`
    CREATE TABLE IF NOT EXISTS oncall_swaps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_employee TEXT NOT NULL,
      covering_employee TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      swap_code TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Update version
  await this.setSetting('database_version', '2');
  
  console.log('✅ Migration to v1.2.0 complete');
}

async getDatabaseVersion(): Promise<number> {
  const result = await this.getSetting('database_version');
  return result ? parseInt(result) : 1;
}
```

### Testing Checklist Before Release
- [ ] Install v1.1.0 APK on device
- [ ] Add time entries for multiple weeks
- [ ] Add notes to various days/lines
- [ ] Add custom project lines
- [ ] Export backup
- [ ] Install v1.2.0 APK over v1.1.0 (without uninstalling)
- [ ] Verify all time entries still exist
- [ ] Verify all notes still exist
- [ ] Verify all custom lines still exist
- [ ] Verify settings preserved (base pay week, etc.)
- [ ] Test new On-Call features work
- [ ] Import backup from v1.1.0 into v1.2.0

---

## 📋 NEXT TASKS: On-Call Schedule Feature (v1.2.0)

### Feature Requirements

**1. New Tab: "On-Call"**
- Add 5th tab to bottom navigation
- Icon: calendar or person-circle
- Title: "On-Call"

**2. User Identity Setup**
- First-time setup: ask user for their name
- Name must match on-call schedule list
- Option to select from imported list (handles misspellings)
- Stored in settings table: `user_full_name`

**3. Schedule Import**
- Format from bosses: `Name, Start Date, End Date` (CSV or plain text)
- Example:
  ```
  John Doe, 11/22/2025, 11/24/2025
  Jane Smith, 11/29/2025, 12/01/2025
  Bob Johnson, 12/06/2025, 12/08/2025
  ```
- Parse flexible date formats: MM/DD/YYYY, M/D/YY, etc.
- Import button opens text input or file picker
- Preview before confirming import
- Can re-import to update (replaces old schedule)

**4. Calendar View (Month)**
- Show full month calendar
- Highlight dates with on-call assignments
- **User's shifts**: Bold blue highlight
- **Other people's shifts**: Light gray
- Tap date to see who's on call
- Navigate previous/next months

**5. Employee Management**
- List all people in schedule
- Mark as "Inactive" when someone quits (preserves history)
- Add new employee manually
- Edit employee names

**6. Swap System**
- View your upcoming shifts
- Tap shift → "Create Swap Code"
- Generate code: `SWAP-JOHN-JANE-112925` format
- Other person enters code in their app
- Both people see swap recorded
- Track: original person, covering person, dates
- No approval needed - just tracking

**7. Dashboard Integration**
- Add banner: "You're on call THIS WEEKEND!" (if applicable)
- Show next on-call date

**8. Data Structure**

```sql
-- Employees table
CREATE TABLE oncall_employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  is_active INTEGER DEFAULT 1,
  location TEXT,  -- For future: suggest replacements by location
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Base schedule (from boss)
CREATE TABLE oncall_schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_name TEXT NOT NULL,
  start_date TEXT NOT NULL,  -- Format: YYYY-MM-DD
  end_date TEXT NOT NULL,    -- Format: YYYY-MM-DD
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_name) REFERENCES oncall_employees(name)
);

-- Swaps tracking
CREATE TABLE oncall_swaps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  original_employee TEXT NOT NULL,
  covering_employee TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  swap_code TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- User settings
-- Add to existing settings table:
-- key='user_full_name', value='John Doe'
```

**9. Business Logic**

```typescript
// Get who's on call for a date (considering swaps)
getOnCallForDate(date: string): Promise<string | null> {
  // 1. Check if there's a swap for this date
  // 2. If swap exists, return covering_employee
  // 3. Otherwise, return from oncall_schedule
}

// Get all user's shifts for a date range
getUserShifts(startDate: string, endDate: string): Promise<Shift[]> {
  // Include both:
  // - Shifts assigned to user in oncall_schedule
  // - Shifts user is covering (from oncall_swaps)
}

// Generate unique swap code
generateSwapCode(original: string, covering: string, date: string): string {
  // Format: SWAP-{FirstName1}-{FirstName2}-{MMDDYY}
  // Example: SWAP-JOHN-JANE-112925
}

// Validate and apply swap code
applySwapCode(code: string, userName: string): Promise<boolean> {
  // 1. Parse code
  // 2. Verify userName matches one of the names in code
  // 3. Find corresponding schedule entry
  // 4. Create swap record
  // 5. Return success/failure
}
```

---

## 🎨 UI/UX Design Guidelines

### On-Call Tab Layout

```
┌─────────────────────────────────────┐
│ ← On-Call Schedule        [Import]  │ ← Header
├─────────────────────────────────────┤
│                                     │
│  You're on call:                    │ ← User's next shift
│  📅 Nov 29 - Dec 1                  │
│                                     │
├─────────────────────────────────────┤
│  November 2025           < >        │ ← Month navigation
├─────────────────────────────────────┤
│  Sun Mon Tue Wed Thu Fri Sat        │
│                                     │
│   3   4   5   6   7   8   9         │
│  10  11  12  13  14  15  16         │
│  17  18  19  20  21  22  23         │
│  24  25  26  27  28 [29] 30         │ ← 29 highlighted blue (user)
│                                     │
│  [Legend]                           │
│  🔵 Your shifts                     │
│  ⚪ Other's shifts                  │
├─────────────────────────────────────┤
│  Upcoming Schedule                  │ ← List view
│                                     │
│  📅 Nov 29-Dec 1                    │
│     You (John Doe)                  │
│     [Create Swap Code]              │
│                                     │
│  📅 Dec 6-8                         │
│     Jane Smith                      │
│                                     │
└─────────────────────────────────────┘
```

### Import Flow

```
1. Tap [Import Schedule] button
2. Show modal with text input
3. Paste schedule list
4. Preview parsed schedule (table format)
5. Confirm or Cancel
6. Success message + refresh calendar
```

### Swap Code Flow

```
User A (Creating Swap):
1. Tap their shift → "Create Swap Code"
2. Select covering person from list
3. Generate code: SWAP-JOHN-JANE-112925
4. Copy code or share via text

User B (Accepting Swap):
1. Tap "Enter Swap Code" button
2. Paste or type code
3. Confirm swap details
4. Success → Calendar updates for both users
```

---

## 📝 Implementation Steps for Next Session

### Phase 1: Database & Core Logic (30 min)
1. Add migration system to database.ts
2. Create three new tables (with IF NOT EXISTS)
3. Implement core methods:
   - importSchedule()
   - getOnCallForDate()
   - getUserShifts()
   - saveEmployee()
   - getEmployees()

### Phase 2: New Tab & Navigation (20 min)
4. Update app/(tabs)/_layout.tsx to add 5th tab
5. Create app/(tabs)/oncall.tsx
6. Add user identity setup (first-time modal)

### Phase 3: Calendar UI (45 min)
7. Install/use calendar library or build custom month view
8. Implement month navigation
9. Add date highlighting logic
10. Tap date → show on-call person

### Phase 4: Import & Employee Management (30 min)
11. Build import modal with text input
12. Parse CSV/text format (flexible)
13. Preview screen before import
14. Employee list screen with active/inactive toggle

### Phase 5: Swap System (40 min)
15. Generate swap codes
16. Create swap entry form
17. Validate and apply swap codes
18. Display swaps in calendar

### Phase 6: Dashboard Integration (15 min)
19. Add banner to Dashboard if user on call soon
20. Show next shift date

### Phase 7: Testing (30 min)
21. Test complete flow:
    - Import schedule
    - View calendar
    - Create swap code
    - Apply swap code
    - Verify calendar updates
22. Test with v1.1.0 → v1.2.0 upgrade path

**Total Estimated Time: 3-4 hours**

---

## 🔧 Technical Notes

### Libraries to Consider
- **Calendar**: `react-native-calendars` (well-maintained)
- **Date parsing**: Use existing `date-fns` + custom parsing
- **CSV parsing**: Simple string.split() since format is basic

### Key Files to Create/Modify

**New Files:**
- `/app/frontend/app/(tabs)/oncall.tsx` - Main on-call screen
- `/app/frontend/components/CalendarView.tsx` - Month calendar
- `/app/frontend/components/ImportScheduleModal.tsx` - Import UI
- `/app/frontend/components/SwapCodeModal.tsx` - Swap creation/entry
- `/app/frontend/components/EmployeeListModal.tsx` - Employee management

**Modified Files:**
- `/app/frontend/app/(tabs)/_layout.tsx` - Add 5th tab
- `/app/frontend/services/database.ts` - Add on-call methods + migration
- `/app/frontend/services/database.web.ts` - Mock methods
- `/app/frontend/app/(tabs)/index.tsx` - Add on-call banner
- `/app/frontend/app.json` - Bump version to 1.2.0

### State Management
Consider adding on-call store:
```typescript
// store/oncallStore.ts
interface OncallStore {
  employees: Employee[];
  schedule: ScheduleEntry[];
  swaps: Swap[];
  userFullName: string | null;
  fetchSchedule: () => Promise<void>;
  fetchSwaps: () => Promise<void>;
  importSchedule: (text: string) => Promise<void>;
  createSwap: (original: string, covering: string, dates: string[]) => Promise<string>;
  applySwapCode: (code: string) => Promise<boolean>;
}
```

---

## 🎯 Success Criteria for v1.2.0

### Must Have
- [ ] User can import schedule from text/CSV
- [ ] Calendar displays on-call dates correctly
- [ ] User's shifts highlighted differently than others
- [ ] Swap codes can be generated and applied
- [ ] Database migration preserves all v1.1.0 data
- [ ] Dashboard shows "on call soon" banner

### Nice to Have (Future)
- [ ] Push notifications for upcoming shifts
- [ ] Suggest replacements by location
- [ ] Track swap history
- [ ] Export on-call schedule to calendar app

---

## 📞 User Context

- **Industry**: Railroad maintenance workers
- **Team Size**: Multiple employees, rotating schedule
- **Schedule Frequency**: On-call weekends, typically once a month
- **Pain Points**: 
  - People quit, schedule needs updating
  - Swaps are informal (no tracking)
  - Hard to remember when you're on call
- **Boss involvement**: Provides schedule 1-2 times per year
- **User preference**: Simple, easy to use, minimal boss coordination

---

## 🚀 Deployment Notes

### Current Status
- v1.1.0 is in production use
- User has APK on their device
- User is actively logging hours and notes
- **DO NOT WIPE DATA ON UPGRADE**

### Build for v1.2.0
```bash
cd /app/frontend

# Update version in app.json (already 1.1.0, bump to 1.2.0)

# Build APK
eas build --platform android --profile production

# Test installation over v1.1.0
# Verify data preservation before releasing to users
```

---

## 📚 References

**Created Files (Session Nov 19):**
- `/app/frontend/components/WeeklyNotesModal.tsx` - Weekly notes interface
- `/app/frontend/components/NotesFloatingButton.tsx` - FAB for notes
- `/app/frontend/components/DailyNotesSection.tsx` - Daily notes list
- `/app/SESSION_NOTES_NOV19_2025.md` - This file

**Key Previous Documentation:**
- `/app/README.md` - Project overview
- `/app/BUILD_INSTRUCTIONS.md` - APK build process
- `/app/GITHUB_SUMMARY.md` - Development history
- `/app/NEXT_STEPS.md` - Roadmap

---

## 💬 Last Message from User

"Document everything. We will start the remaining tasks tomorrow. Put in a note about not overwriting the data on my stand alone app once we decide to recompile everything into the next version. I don't want the app to delete the database I am already building in the production app. I will be forking this, so write whatever you need to yourself so you'll still know what we need to do next."

**Translation for Next AI:**
1. User has v1.1.0 in production with real data
2. When building v1.2.0, MUST preserve all existing database data
3. Use proper migration strategy (see above)
4. Test upgrade path thoroughly before release
5. Next task: Build On-Call Schedule feature (v1.2.0)

---

**Session End: November 19, 2025**
**Next Session: Build On-Call Schedule Feature (v1.2.0)**
