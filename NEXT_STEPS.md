# 🚨 CRITICAL NEXT STEPS - DO NOT SKIP

## Current State: NOT READY FOR PRODUCTION

**Status**: App works with backend server but is NOT offline-capable

**Problem**: 
- Data stored on backend server, not on phone
- Requires internet connection and running backend
- Won't work as standalone app without server
- Railroad workers need offline functionality

---

## Priority 1: Convert to Offline App (REQUIRED)

### Why This Is Critical:
1. Original spec required: "All data stored locally on your device"
2. Original spec required: "No requirement for server or cloud sync"
3. Railroad workers may not have reliable internet access
4. Standalone app won't work without this change

### Implementation Steps:

#### Step 1: Install expo-sqlite
```bash
cd /app/frontend
yarn add expo-sqlite
```

#### Step 2: Create Database Service
Create `/app/frontend/services/database.ts`:

```typescript
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabase('timesheet.db');

// Initialize database with tables
export const initDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      // Create time_entries table
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
        );`
      );

      // Create line_codes table
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS line_codes (
          line_code TEXT PRIMARY KEY,
          label TEXT NOT NULL,
          is_project INTEGER DEFAULT 0,
          is_visible INTEGER DEFAULT 1,
          sort_order INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );`
      );

      // Create settings table
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );`
      );

      // Insert default line codes
      const defaultLines = [
        ['VTR', 'VTR', 0, 1, 1],
        ['GMRC', 'GMRC', 0, 1, 2],
        ['CLP', 'CLP', 0, 1, 3],
        ['WACR', 'WACR', 0, 1, 4],
        ['WACR-CRD', 'WACR-CRD', 0, 1, 5],
        ['NEGS', 'NEGS', 0, 1, 6],
        ['NHC', 'NHC', 0, 1, 7],
        ['NYOG', 'NYOG', 0, 1, 8],
        ['PTO', 'PTO', 0, 1, 9],
        ['HOLIDAY', 'HOLIDAY', 0, 1, 10],
      ];

      defaultLines.forEach(([code, label, isProject, isVisible, sortOrder]) => {
        tx.executeSql(
          'INSERT OR IGNORE INTO line_codes (line_code, label, is_project, is_visible, sort_order) VALUES (?, ?, ?, ?, ?)',
          [code, label, isProject, isVisible, sortOrder]
        );
      });

      // Insert default settings
      tx.executeSql(
        'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
        ['base_pay_week_ending', '2025-11-29']
      );
      tx.executeSql(
        'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
        ['pay_frequency_days', '14']
      );
    },
    error => reject(error),
    () => resolve());
  });
};

// Example: Get entries for a week
export const getEntriesByWeek = (weekEnding: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM time_entries WHERE week_ending_date = ? ORDER BY work_date, line_code',
        [weekEnding],
        (_, { rows }) => resolve(rows._array),
        (_, error) => reject(error)
      );
    });
  });
};

// Example: Create or update entry
export const upsertEntry = (workDate: string, lineCode: string, stHours: number, otHours: number, weekEnding: string, isPayWeek: boolean): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `INSERT INTO time_entries (work_date, line_code, st_hours, ot_hours, week_ending_date, is_pay_week)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(work_date, line_code) DO UPDATE SET
           st_hours = excluded.st_hours,
           ot_hours = excluded.ot_hours,
           week_ending_date = excluded.week_ending_date,
           is_pay_week = excluded.is_pay_week,
           updated_at = CURRENT_TIMESTAMP`,
        [workDate, lineCode, stHours, otHours, weekEnding, isPayWeek ? 1 : 0],
        () => resolve(),
        (_, error) => reject(error)
      );
    });
  });
};

// Add more functions for:
// - getLines()
// - addProjectLine()
// - toggleLineVisibility()
// - deleteProjectLine()
// - getWeeklySummary()
// - exportData()
// - importData()
```

#### Step 3: Update Zustand Store
Modify `/app/frontend/store/timesheetStore.ts`:

```typescript
import { create } from 'zustand';
import * as DB from '../services/database';

// Remove BACKEND_URL completely
// Replace all fetch() calls with DB function calls

interface TimesheetState {
  // ... keep existing state shape
  
  fetchEntries: (weekEnding: string) => Promise<void>;
  // ... other methods
}

export const useTimesheetStore = create<TimesheetState>((set, get) => ({
  entries: [],
  lines: [],
  // ... existing state

  fetchEntries: async (weekEnding: string) => {
    try {
      set({ loading: true, error: null });
      const entries = await DB.getEntriesByWeek(weekEnding);
      set({ entries, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  updateEntry: async (workDate: string, lineCode: string, stHours: number, otHours: number) => {
    try {
      set({ error: null });
      
      // Calculate week ending and pay week status
      const weekInfo = get().weekInfo;
      if (!weekInfo) return;
      
      await DB.upsertEntry(
        workDate,
        lineCode,
        stHours,
        otHours,
        weekInfo.week_ending_date,
        weekInfo.is_pay_week
      );
      
      // Refresh data
      await get().fetchEntries(weekInfo.week_ending_date);
      await get().fetchWeeklySummary(weekInfo.week_ending_date);
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  // Update all other methods similarly
}));
```

#### Step 4: Initialize Database on App Start
Update `/app/frontend/app/_layout.tsx`:

```typescript
import { useEffect } from 'react';
import * as DB from '../services/database';

export default function RootLayout() {
  useEffect(() => {
    // Initialize database when app starts
    DB.initDatabase()
      .then(() => console.log('Database initialized'))
      .catch(error => console.error('Database init error:', error));
  }, []);

  return (
    // ... existing layout
  );
}
```

#### Step 5: Remove Backend Dependency
- Keep `/app/backend/` folder for reference
- Add comment: "DEPRECATED - Database logic moved to frontend"
- Update documentation to reflect offline-first architecture

#### Step 6: Test Offline Functionality
1. Build app with `eas build --platform android --profile preview`
2. Install APK on test device
3. Turn OFF WiFi and mobile data
4. Test all features:
   - [ ] Add time entries
   - [ ] View weekly summaries
   - [ ] Navigate between weeks
   - [ ] Add project lines
   - [ ] Toggle line visibility
   - [ ] Export data
5. Restart app and verify data persists
6. Test on multiple devices

---

## Priority 2: Fine-Tune Grid Alignment

### Current Issue:
Line names and data rows drift out of sync slightly as you scroll down.

### Root Cause:
- PTO/HOLIDAY rows are shorter (60px) than regular rows (100px)
- Heights may need exact measurements from actual rendered components

### Solution Options:

#### Option A: Fixed Heights (Current)
- Keep fixed heights but measure exact rendered heights
- Adjust `lineNameCell` and `lineNameCellShort` to match data rows precisely

#### Option B: Dynamic Heights
- Use `onLayout` to measure actual row heights
- Dynamically adjust line name cell heights to match

```typescript
const [rowHeights, setRowHeights] = useState<Record<string, number>>({});

// In data row:
<View 
  onLayout={(e) => {
    const height = e.nativeEvent.layout.height;
    setRowHeights(prev => ({...prev, [line.line_code]: height}));
  }}
>
  {/* row content */}
</View>

// In line name cell:
<View style={[styles.lineNameCell, { height: rowHeights[line.line_code] || 100 }]}>
  {/* line name */}
</View>
```

---

## Priority 3: Additional Features

### PDF Export (From Original Spec)
- Load PDF template of official timesheet
- Fill in values programmatically
- Export as PDF matching paper form
- Library suggestion: `react-native-pdf` or `expo-print`

### Paycheck Estimator (From Original Spec)
- Calculate federal withholding
- Calculate VT state withholding
- Railroad Retirement Tier I / Tier II
- Union dues
- Healthcare deductions
- Display on pay week dashboard

---

## Testing Checklist Before Release

### Offline Functionality
- [ ] App works with no internet connection
- [ ] Data persists across app restarts
- [ ] All CRUD operations work offline
- [ ] Export/import works offline

### Data Validation
- [ ] ST max 8 hours/day per line enforced
- [ ] ST max 40 hours/week enforced
- [ ] PTO/HOLIDAY cannot have OT
- [ ] Pay week detection accurate for all dates

### UI/UX
- [ ] Line names align with data rows
- [ ] Day headers stay visible when scrolling down
- [ ] Line names stay visible when scrolling right
- [ ] No jittery scrolling
- [ ] Touch targets are large enough (44px minimum)

### Cross-Device Testing
- [ ] Test on Android phone
- [ ] Test on Android tablet
- [ ] Test on iPhone (if applicable)
- [ ] Test on iPad (if applicable)
- [ ] Test different screen sizes

---

## Known Issues to Address

1. **Metro Cache Issues**
   - Clear cache frequently during development
   - Document workaround for users

2. **Date Timezone Handling**
   - Always use 'T00:00:00' suffix when parsing dates
   - Document this pattern for future developers

3. **Grid Alignment**
   - PTO/HOLIDAY rows slightly shorter
   - May need dynamic height measurement

---

## Long-Term Considerations

### Cloud Sync (Optional Future Feature)
- Allow users to optionally sync data to cloud
- Useful for backup or multi-device access
- Should be optional, not required
- Offline-first, sync when available

### Multi-User Support
- If multiple crew members use same device
- Add user profiles
- Separate data per user

### Reporting Features
- Monthly summaries
- Year-to-date totals
- Export to Excel/CSV

---

## Remember:

1. **DO NOT release app without offline functionality**
2. Test thoroughly on physical devices
3. Verify data persistence across app restarts
4. Document any issues encountered during offline conversion
5. Keep backend code as reference for database logic

---

**Next Session Priority**: Convert to expo-sqlite for offline functionality

**Estimated Time**: 4-6 hours for full offline conversion and testing

**Blocker**: Cannot release as standalone app until offline conversion complete
