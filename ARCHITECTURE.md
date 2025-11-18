# VRS Time Wizard - Technical Architecture

Detailed technical documentation of the offline-first timesheet application.

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Database Design](#database-design)
3. [State Management](#state-management)
4. [Business Logic](#business-logic)
5. [UI Components](#ui-components)
6. [Critical Algorithms](#critical-algorithms)
7. [Performance Considerations](#performance-considerations)

## System Architecture

### Offline-First Design

The application follows an offline-first architecture where all data operations happen locally using expo-sqlite, with optional backend for future cloud sync.

```
┌──────────────────────────────────────────────────────────┐
│                    Expo App Layer                         │
├──────────────────────────────────────────────────────────┤
│  expo-router Navigation                                   │
│  - File-based routing                                     │
│  - Top tab navigation (Dashboard, Timesheet, History,    │
│    Settings)                                              │
│  - Modal screens (weekly-summary, migrate, debug-info)   │
├──────────────────────────────────────────────────────────┤
│  UI Components (Tamagui)                                  │
│  - Platform-agnostic components                           │
│  - Responsive layouts                                     │
│  - Native feel and performance                            │
├──────────────────────────────────────────────────────────┤
│  State Management (Zustand)                               │
│  - timesheetStore: Global app state                       │
│  - Async actions for DB operations                        │
│  - Computed values and derived state                      │
├──────────────────────────────────────────────────────────┤
│  Database Service Layer (services/database.ts)            │
│  - Singleton pattern                                      │
│  - Promise-based async API                                │
│  - Transaction support                                    │
│  - Business logic encapsulation                           │
├──────────────────────────────────────────────────────────┤
│  expo-sqlite                                              │
│  - SQLite database engine                                 │
│  - Local storage on device                                │
│  - File: vrs_time_wizard.db                               │
│  - Platform: iOS/Android only (no web support)            │
└──────────────────────────────────────────────────────────┘

       Optional Backend (Future Cloud Sync)
┌──────────────────────────────────────────────────────────┐
│  FastAPI Server (Python)                                  │
│  - REST API endpoints                                     │
│  - SQLite backend database                                │
│  - For multi-user sync (future)                           │
└──────────────────────────────────────────────────────────┘
```

### Platform-Specific Code

The app uses React Native's platform extensions to handle web preview:

- `database.ts` - Full SQLite implementation (iOS/Android)
- `database.web.ts` - Mock database for web preview
- Metro bundler automatically selects correct file

## Database Design

### Schema

#### time_entries
Stores individual hour entries.

```sql
CREATE TABLE time_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_date TEXT NOT NULL,              -- YYYY-MM-DD format
  line_code TEXT NOT NULL,              -- VTR, GMRC, PROJECT 1234, etc.
  st_hours INTEGER DEFAULT 0,           -- Straight time hours (0-8)
  ot_hours INTEGER DEFAULT 0,           -- Overtime hours (unlimited)
  week_ending_date TEXT NOT NULL,       -- Saturday of the week
  is_pay_week INTEGER DEFAULT 0,        -- Boolean flag (0 or 1)
  UNIQUE(work_date, line_code)          -- One entry per day per line
);
```

**Indexes**: Implicit index on (work_date, line_code) via UNIQUE constraint

#### line_codes
Defines available line codes for time entry.

```sql
CREATE TABLE line_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  line_code TEXT UNIQUE NOT NULL,       -- Code identifier
  label TEXT NOT NULL,                  -- Display name
  is_visible INTEGER DEFAULT 1,         -- Show in timesheet
  is_project INTEGER DEFAULT 0,         -- User-created project line
  sort_order INTEGER DEFAULT 0          -- Display order
);
```

**Default Lines**:
- VTR (sort_order: 1)
- GMRC (sort_order: 2)
- CLP (sort_order: 3)
- WACR (sort_order: 4)
- WACR-CRD (sort_order: 5)
- NEGS (sort_order: 6)
- NHC (sort_order: 7)
- NYOG (sort_order: 8)
- PTO (sort_order: 9)
- HOLIDAY (sort_order: 10)

#### settings
Configuration key-value pairs.

```sql
CREATE TABLE settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL
);
```

**Key Settings**:
- `base_pay_week_ending`: "2025-11-29" (reference pay week Saturday)
- `pay_frequency_days`: "14" (pay cycle length)

### Data Flow

```
User Action (UI)
       ↓
  Zustand Action
       ↓
 Database Service Method
       ↓
    SQLite Query
       ↓
   Local Database
       ↓
   Result/Update
       ↓
  Zustand State Update
       ↓
    UI Re-render
```

## State Management

### Zustand Store (timesheetStore.ts)

```typescript
interface TimesheetState {
  // State
  lines: LineCode[];
  weekInfo: WeekInfo | null;
  entries: TimeEntry[];
  weeklySummary: WeeklySummary | null;
  currentWeekEnding: string;
  loading: boolean;
  error: string | null;

  // Actions
  fetchLines: () => Promise<void>;
  fetchWeekInfo: (date: string) => Promise<WeekInfo>;
  fetchEntries: (weekEnding: string) => Promise<void>;
  fetchWeeklySummary: (weekEnding: string) => Promise<void>;
  updateEntry: (date, line, st, ot) => Promise<void>;
  addProjectLine: (projectNumber: string) => Promise<void>;
  toggleLineVisibility: (lineCode: string, visible: boolean) => Promise<void>;
  deleteProjectLine: (lineCode: string) => Promise<void>;
  exportData: () => Promise<any>;
  importData: (data: any) => Promise<void>;
  changeWeek: (direction: 'prev' | 'next') => void;
}
```

### State Updates

1. **Optimistic Updates**: UI updates immediately, DB operation happens async
2. **Error Handling**: Errors stored in state, displayed to user
3. **Loading States**: Boolean flags prevent duplicate operations
4. **Derived State**: Computed in components from base state

## Business Logic

### Week Calculation

**Week Definition**: Sunday (day 0) to Saturday (day 6)

```typescript
getWeekEnding(workDate: string): string {
  const date = new Date(workDate + 'T00:00:00');
  const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday
  
  let daysUntilSaturday;
  if (dayOfWeek === 6) {
    daysUntilSaturday = 0; // Already Saturday
  } else {
    daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
  }
  
  const saturday = new Date(date);
  saturday.setDate(date.getDate() + daysUntilSaturday);
  
  return format(saturday, 'yyyy-MM-dd');
}
```

**Example**:
- Nov 17, 2024 (Sunday) → Nov 22, 2024 (Saturday)
- Nov 18, 2024 (Monday) → Nov 22, 2024 (Saturday)
- Nov 22, 2024 (Saturday) → Nov 22, 2024 (Saturday)

### Pay Week Calculation

**Algorithm**: Every 14 days from base date

```typescript
async isPayWeek(weekEndingDate: string): Promise<boolean> {
  const basePayWeek = await getSetting('base_pay_week_ending'); // "2025-11-29"
  const payFrequency = await getSetting('pay_frequency_days'); // 14
  
  // Use UTC to avoid timezone issues
  const [baseYear, baseMonth, baseDay] = basePayWeek.split('-').map(Number);
  const [checkYear, checkMonth, checkDay] = weekEndingDate.split('-').map(Number);
  
  const baseMs = Date.UTC(baseYear, baseMonth - 1, baseDay);
  const checkMs = Date.UTC(checkYear, checkMonth - 1, checkDay);
  
  const daysDiff = Math.round((checkMs - baseMs) / (1000 * 60 * 60 * 24));
  
  return daysDiff % payFrequency === 0;
}
```

**Why UTC?** Avoids Daylight Saving Time issues that caused off-by-one errors.

**Pay Week Schedule** (from Nov 29, 2025):
- Nov 29, 2025 (base)
- Nov 15, 2025 (-14 days)
- Nov 1, 2025 (-28 days)
- Oct 18, 2025 (-42 days)
- Dec 13, 2025 (+14 days)
- Dec 27, 2025 (+28 days)

### Time Entry Validation

```typescript
// ST Hours Constraints
max ST per day per line: 8 hours
max ST per week total: 40 hours

// OT Hours Constraints
no max per day or week

// Special Lines
PTO & HOLIDAY: ST only, no OT

// Validation Logic
if (lineCode === 'PTO' || lineCode === 'HOLIDAY') {
  if (otHours > 0) {
    throw new Error('PTO and HOLIDAY lines cannot have overtime');
  }
}

if (stHours > 8) {
  throw new Error('ST hours cannot exceed 8 per day per line');
}

const weekTotal = calculateWeekSTTotal();
if (weekTotal > 40) {
  throw new Error('Weekly ST total cannot exceed 40 hours');
}
```

## UI Components

### Timesheet Grid

**Challenge**: Sticky headers and line names with synchronized scrolling

**Solution**: Two-column layout

```
┌─────────────────┬──────────────────────────────────────┐
│  Line Names     │     Scrollable Hour Entry Grid       │
│  (Fixed)        │     (Horizontal + Vertical Scroll)   │
│                 │                                       │
│  Day Headers    │     Sun   Mon   Tue   Wed  ...      │
│  (Synced V)     │                                       │
│                 │                                       │
│  VTR            │      8     8     8     8   ...      │
│                 │      2OT   2OT   0     4OT ...      │
│                 │                                       │
│  GMRC           │      0     0     0     0   ...      │
│                 │                                       │
└─────────────────┴──────────────────────────────────────┘
```

**Implementation**:
1. Left column: Fixed width, scrollable vertically
2. Right column: Horizontal scroll container with vertical scroll
3. `onScroll` event handlers synchronize vertical scroll position
4. `useRef` to imperatively control scroll position
5. Different row heights for PTO/Holiday (60px) vs regular lines (100px)

### Paper Timesheet Helper

**Format**: Mimics physical timesheet layout

```
        Sun     Mon     Tue     Wed     Thu     Fri     Sat     ST   OT
        11/16   11/17   11/18   11/19   11/20   11/21   11/22
VTR     8       8       8       8       8       -       -       40   0
        2 OT    2 OT    2 OT    2 OT                            
CLP     -       -       -       -       -       2       -       2    0
───────────────────────────────────────────────────────────────────────
TOTALS  8       8       8       8       8       2       0       40   8
        2 OT    2 OT    2 OT    2 OT
```

**Features**:
- Stacked display (ST on top, OT below with "OT" label)
- Horizontal scrolling for full week view
- Color-coded totals
- Empty cells show "-"

## Critical Algorithms

### Week Navigation

```typescript
changeWeek(direction: 'prev' | 'next') {
  const currentEnd = new Date(currentWeekEnding + 'T00:00:00');
  const days = direction === 'next' ? 7 : -7;
  currentEnd.setDate(currentEnd.getDate() + days);
  const newWeekEnding = format(currentEnd, 'yyyy-MM-dd');
  
  // Load new week data
  fetchWeekInfo(newWeekEnding);
  fetchEntries(newWeekEnding);
  fetchWeeklySummary(newWeekEnding);
}
```

### Weekly Summary Aggregation

```typescript
async getWeeklySummary(weekEnding: string) {
  const entries = await getEntriesByWeek(weekEnding);
  
  const summary = {
    total_st: 0,
    total_ot: 0,
    lines_used: new Set(),
    line_totals: {},
    daily_totals: {}
  };
  
  for (const entry of entries) {
    summary.total_st += entry.st_hours;
    summary.total_ot += entry.ot_hours;
    summary.lines_used.add(entry.line_code);
    
    // Aggregate by line
    if (!summary.line_totals[entry.line_code]) {
      summary.line_totals[entry.line_code] = { st: 0, ot: 0 };
    }
    summary.line_totals[entry.line_code].st += entry.st_hours;
    summary.line_totals[entry.line_code].ot += entry.ot_hours;
    
    // Aggregate by day
    if (!summary.daily_totals[entry.work_date]) {
      summary.daily_totals[entry.work_date] = { st: 0, ot: 0 };
    }
    summary.daily_totals[entry.work_date].st += entry.st_hours;
    summary.daily_totals[entry.work_date].ot += entry.ot_hours;
  }
  
  return summary;
}
```

## Performance Considerations

### Database Optimization

1. **Singleton Pattern**: Single DB connection reused
2. **Indexes**: UNIQUE constraints create implicit indexes
3. **Query Optimization**: WHERE clauses on indexed columns
4. **Batch Operations**: Use transactions for multiple inserts

### UI Optimization

1. **useFocusEffect**: Refresh data when screen comes into focus
2. **Memoization**: Computed values cached with useMemo
3. **FlatList/FlashList**: For large scrollable lists (future)
4. **Image Optimization**: None needed (no images in current version)

### Memory Management

1. **Cleanup**: Remove event listeners on unmount
2. **State Size**: Keep only necessary data in global state
3. **Pagination**: History shows last 8 weeks only

## Error Handling

### Database Errors

```typescript
try {
  await db.runAsync(query, params);
} catch (error) {
  console.error('Database error:', error);
  set({ error: error.message });
  throw error; // Re-throw for UI to handle
}
```

### User-Facing Errors

```typescript
Alert.alert(
  'Error Title',
  'User-friendly error message',
  [{ text: 'OK' }]
);
```

### Validation Errors

```typescript
if (violation detected) {
  Alert.alert('Validation Error', 'Specific constraint violated');
  return; // Don't proceed with operation
}
```

## Testing Strategy

### Manual Testing

1. **Debug Information Screen**: View database state, calculations
2. **Console Logging**: Strategic log points for debugging
3. **Physical Device**: Required for full offline testing

### Test Cases

- [ ] Hour entry (ST and OT)
- [ ] Week navigation (forward and backward)
- [ ] Pay week detection (multiple weeks)
- [ ] Offline functionality (airplane mode)
- [ ] Export/Import (full data cycle)
- [ ] Line code management (add/delete/toggle)
- [ ] History refresh on focus
- [ ] Timezone handling (DST boundaries)
- [ ] Row alignment in timesheet grid

## Security Considerations

1. **Local Data**: Stored unencrypted in SQLite (device security handles encryption)
2. **Backup Files**: JSON exports are plain text (user responsible for secure storage)
3. **No Network**: No data transmitted (offline-first eliminates network attack surface)
4. **Future**: If backend sync added, implement:
   - HTTPS only
   - Authentication tokens
   - End-to-end encryption

## Platform Differences

### iOS vs Android

- **SQLite**: Same on both platforms
- **File System**: Expo handles cross-platform differences
- **Navigation**: expo-router works identically
- **UI**: Tamagui provides platform-appropriate components

### Web (Limited)

- **Database**: Mock implementation, no persistence
- **Purpose**: Preview only, not for production use
- **Testing**: Must use physical device

---

**Document Version**: 1.0  
**Last Updated**: November 2024  
**Maintainer**: Development Team
