# VRS Time Wizard — Complete Technical Specification & Development History

**Version:** 1.2.0.1  
**Last Updated:** November 23, 2025  
**Framework:** Expo SDK 54 + React Native 0.81  
**Database:** SQLite (expo-sqlite)  
**Status:** Production Ready (Beta Testing)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Core Features & Functionality](#core-features--functionality)
3. [Technical Architecture](#technical-architecture)
4. [Database Schema](#database-schema)
5. [File Structure & Key Components](#file-structure--key-components)
6. [Business Logic Rules](#business-logic-rules)
7. [Configuration Files](#configuration-files)
8. [Development History](#development-history)
9. [Known Issues & Limitations](#known-issues--limitations)
10. [Build & Deployment](#build--deployment)
11. [Testing Guidelines](#testing-guidelines)
12. [Future Roadmap](#future-roadmap)
13. [Critical Notes for Continuation](#critical-notes-for-continuation)

---

## Project Overview

### Purpose
VRS Time Wizard is an **offline-first mobile timesheet application** designed specifically for Vermont Railway (VRS) Maintenance-of-Way (MOW) workers. It replaces a paper-based system with a local SQLite database, allowing workers to track hours, lines worked, notes, and on-call schedules without requiring internet connectivity.

### Target Users
- Railroad MOW (maintenance-of-way) workers
- Track crews at VRS (Rutland, Burlington, White River locations)
- Workers who need reliable offline hour tracking in remote areas

### Key Design Principles
1. **Offline-First:** All data stored locally; no internet required after initial on-call sync
2. **Simple & Fast:** Tap-based hour entry with immediate feedback
3. **Business Logic Enforcement:** Automatic ST/OT caps to prevent over-logging
4. **Zero Data Loss:** Non-destructive migrations, backup/restore functionality
5. **Field-Ready:** Works in airplane mode, survives app crashes

---

## Core Features & Functionality

### 1. Weekly Timesheet Grid

**Purpose:** Primary interface for logging work hours across multiple lines per day.

**Implementation:**
- **File:** `/app/frontend/app/(tabs)/timesheet.tsx`
- **State Management:** Zustand store (`/app/frontend/store/timesheetStore.ts`)
- **Database Table:** `time_entries`

**How It Works:**
- Displays current week by default (Monday-Sunday)
- Each day has multiple work lines (VTR, CLP, custom projects)
- Users tap `+` or `-` buttons to add/remove hours
- Hours split into **Straight Time (ST)** and **Overtime (OT)**
- Real-time validation against business rules
- Haptic feedback on button press
- Weekly summary shown at top (total ST, total OT)

**Key Functions:**
- `handleAddHours(date, lineCode, type)` - Adds 1 hour ST or OT
- `handleRemoveHours(date, lineCode, type)` - Removes 1 hour ST or OT
- `fetchWeekData(startDate)` - Loads all entries for a week
- `calculateWeekTotals()` - Computes weekly ST/OT totals

**Business Rules Applied:**
- Max 8 ST hours per day per line
- Max 40 ST hours per week (across all lines/days)
- OT has no limit
- If ST cap hit, hours can still be added as OT

**UI Details:**
- Color-coded buttons: Blue for ST, Orange for OT
- Disabled state when caps reached
- Week navigation: "Previous Week" / "Next Week" buttons
- Pay period indicator (bi-weekly, configurable)

---

### 2. Work Notes

**Purpose:** Allow workers to add detailed notes to specific work days and lines.

**Implementation:**
- **File:** `/app/frontend/components/WeeklyNotesModal.tsx`
- **Database Table:** `work_notes`
- **Trigger:** Floating action button (FAB) in timesheet view

**How It Works:**
- Modal opens with tabs for each day of the week
- Workers select a day, then select which line the note applies to
- Notes are saved with: `work_date`, `line_code`, `note_text`, `created_at`
- Notes visible in weekly summary and history views
- **v1.2.0.1 Fix:** Wrapped in `KeyboardAvoidingView` to prevent keyboard covering input

**Key Functions:**
- `loadNotesForWeek(startDate, endDate)` - Fetches all notes for date range
- `saveNote(date, lineCode, text)` - Saves note to database
- `deleteNote(noteId)` - Removes a note

**UI Details:**
- Tabbed interface (Monday-Sunday)
- Dropdown to select line code
- Multi-line text input
- Save/Cancel buttons
- Badge count on FAB shows number of notes for the week

---

### 3. On-Call Schedule

**Purpose:** Sync and display weekend on-call duty assignments from a master Google Sheet.

**Implementation:**
- **File:** `/app/frontend/app/(tabs)/oncall.tsx`
- **Service:** `/app/frontend/services/autoSync.ts`
- **Database Tables:** `on_call_users`, `on_call_schedule`
- **Config:** `/app/frontend/constants/config.ts` (hardcoded URL)

**How It Works:**
1. **Master Schedule:**
   - Maintained as a Google Sheet by management
   - Published to web as CSV
   - URL hardcoded in `config.ts`: 
     ```
     https://docs.google.com/spreadsheets/d/e/2PACX-1vQKbW0xHsx93vd8xLVdZXQghRzSLndLxtA25zuKYKXPwz5yrGX4H8Xnnbe5BS114UBr9YoXgc4cSrE7/pub?output=csv
     ```

2. **Sync Process:**
   - Fetches CSV from URL
   - Parses rows (expects: `start_date`, `end_date`, `user`, `notes`)
   - Clears old schedule data
   - Inserts new rows into `on_call_schedule` table
   - Updates `last_sync` timestamp in AsyncStorage

3. **Auto-Sync:**
   - Triggers weekly when app opens (if 7+ days since last sync)
   - Configurable via Settings toggle
   - Service: `/app/frontend/services/autoSync.ts`

4. **Manual Sync:**
   - Available in Settings → On-Call Schedule → "Sync Now"
   - Forces immediate refresh

5. **User Filtering:**
   - Worker sets their name in Settings
   - Stored in `on_call_users` table with `is_current_user = 1`
   - App filters schedule to show only their shifts

**Key Functions:**
- `syncOnCallSchedule()` - Main sync function
- `parseCSV(csvText)` - Converts CSV to JS objects
- `getCurrentUser()` - Gets current user from database
- `getOnCallSchedule(startDate, endDate, userName)` - Fetches filtered schedule

**UI Details:**
- Calendar view showing upcoming on-call weekends
- Green highlights for assigned shifts
- Notes displayed below each shift
- Last sync timestamp shown
- Manual sync button with loading indicator

**Required CSV Format:**
```
start_date,end_date,user,notes
2025-11-23,2025-11-24,John Smith,Regular shift
2025-11-30,2025-12-01,Jane Doe,Holiday weekend
```

**Important Notes:**
- Dates must be `YYYY-MM-DD` format
- User names must match exactly (case-sensitive)
- CSV is cleared and replaced on each sync (not additive)

---

### 4. History & Calendar View

**Purpose:** View past work history in multiple formats: list, calendar, and reports.

**Implementation:**
- **File:** `/app/frontend/app/(tabs)/history.tsx`
- **Toggle:** Three-way toggle (List / Calendar / Reports)

#### 4A. List View

**How It Works:**
- Shows last 8 weeks of timesheet data
- Expandable cards for each week
- Displays: week ending date, total ST, total OT, lines worked
- Tap to expand and see daily breakdown

**Key Functions:**
- `fetchWeekSummaries()` - Loads last 8 weeks of data
- `calculateWeekTotals(entries)` - Aggregates ST/OT by week

**UI Details:**
- Collapsible cards with Ionicons chevron
- Color-coded ST (blue) and OT (orange)
- Shows pay period boundaries

#### 4B. Calendar View

**Purpose:** Visual representation of work history with color-coded indicators.

**Implementation:**
- **Library:** `react-native-calendars`
- **Marked Dates System:**
  - **Blue dot:** Hours logged that day
  - **Orange dot:** Work notes exist
  - **Green dot:** On-call assignment
  - Multiple dots can appear on same day

**How It Works:**
- Loads data for current visible month
- Queries `time_entries`, `work_notes`, `on_call_schedule` tables
- Generates marking object for react-native-calendars
- User taps a date to open detail modal

**Day Detail Modal:**
- Shows all hours logged (by line)
- Shows all notes for that day
- Shows on-call status (if applicable)
- Modal is scrollable for long content

**Key Functions:**
- `loadCalendarData()` - Fetches data for month
- `generateMarkedDates(entries, notes, oncall)` - Creates marking object
- `onDayPress(date)` - Opens detail modal

**UI Details:**
- Month navigation via swipe or arrow buttons
- Multi-dot system (stacked vertically)
- Modal with sections: Hours / Notes / On-Call
- "Close" button to dismiss modal

#### 4C. Reports View

**Purpose:** Generate detailed work hour reports for any date range with export options.

**Implementation:**
- **File:** `/app/frontend/components/ReportsView.tsx`
- **Export Libraries:** `expo-print` (PDF), `expo-sharing` (file sharing)

**How It Works:**
1. **Date Range Selection:**
   - Presets: Last 30/90/180/365 days, YTD, All Time
   - Custom: Manual start/end date picker
   - Defaults to last 30 days

2. **Statistics Calculated:**
   - Total hours (ST + OT)
   - Total ST hours
   - Total OT hours
   - Days worked
   - Average hours per day
   - ST/OT percentage breakdown

3. **Export Formats:**
   - **CSV:** Complete data export (date, line, ST, OT, notes)
   - **PDF:** Two formats based on range:
     - ≤ 90 days: Detailed daily breakdown with notes
     - > 90 days: Monthly summary format

4. **PDF Generation:**
   - HTML template with inline styles
   - Header with user name and date range
   - Statistics summary table
   - Detailed breakdown table
   - Rendered using `expo-print.printToFileAsync()`

5. **CSV Generation:**
   - Standard comma-separated format
   - Headers: Date, Line Code, ST Hours, OT Hours, Notes
   - Saved to device with `expo-file-system`

**Key Functions:**
- `generateReport()` - Main report generation function
- `generatePDFReport(data, stats)` - Creates PDF HTML
- `generateCSVReport(data)` - Creates CSV string
- `exportReport(format)` - Handles export and sharing

**UI Details:**
- Date range selector with buttons and pickers
- Optional name input for PDF header
- "Generate Report" button
- Statistics cards (total hours, ST, OT, days)
- Export buttons: "Download CSV" / "Download PDF"
- Loading indicators during generation

---

### 5. Settings & Configuration

**Purpose:** App-wide configuration and administrative functions.

**Implementation:**
- **File:** `/app/frontend/app/(tabs)/settings.tsx`
- **Storage:** Mix of SQLite (`on_call_users`, `settings`) and AsyncStorage

**Sections:**

#### 5A. User Profile
- **User Name Input:** Sets name for on-call filtering
- Stored in `on_call_users` table with `is_current_user = 1`
- Required for on-call schedule to work

#### 5B. Pay Week Configuration
- **Base Pay Week Date Picker:** Sets start of bi-weekly pay period
- Stored in `settings` table with key `base_pay_week_date`
- Used to calculate which weeks are pay weeks
- Format: `YYYY-MM-DD` (typically a Friday)

#### 5C. Work Lines Management
- **Add Custom Lines:** Users can add project-specific line codes
- **Toggle Visibility:** Hide unused lines from timesheet
- Stored in `line_codes` table with `is_visible` flag
- Default lines: VTR, CLP, RUTS, MOW

#### 5D. On-Call Schedule
- **Auto-Sync Toggle:** Enable/disable weekly auto-sync
- **Last Sync Timestamp:** Shows when last sync occurred
- **Sync Now Button:** Forces immediate sync
- **Clear Schedule:** Removes all on-call data (debug feature)

#### 5E. Backup & Restore
- **Export Data:** Saves entire database as JSON file
- **Import Data:** Restores data from JSON file
- Uses `expo-document-picker` for file selection
- **Warning:** Import merges with existing data (not replace)

#### 5F. Developer Menu (Hidden)
- **Activation:** Tap "Version 1.2.0.1" exactly 5 times
- **Features:**
  - Override master schedule URL
  - Clear all on-call data
  - Direct database access (debug)
- **UI:** Red-bordered card to indicate admin-only

**Key Functions:**
- `saveUserName(name)` - Saves current user
- `saveBasePayWeek(date)` - Saves pay period start
- `addCustomLine(code)` - Adds new work line
- `toggleLineVisibility(code)` - Shows/hides line
- `exportDatabase()` - Creates JSON backup
- `importDatabase(file)` - Restores from JSON

---

### 6. Dashboard (Home Screen)

**Purpose:** Quick overview of current week and navigation hub.

**Implementation:**
- **File:** `/app/frontend/app/(tabs)/index.tsx`

**Displays:**
- Current week's total ST and OT hours
- Quick links to:
  - Timesheet entry
  - History/Reports
  - On-call schedule
- Recent activity (last 3 entries)
- Upcoming on-call shift (if any)

**Key Functions:**
- `loadCurrentWeekSummary()` - Fetches current week totals
- `loadRecentEntries()` - Gets last few logged entries
- `loadUpcomingOnCall()` - Gets next on-call shift

---

## Technical Architecture

### Framework & Libraries

**Core:**
- **Expo SDK:** 54 (latest stable)
- **React Native:** 0.81.5
- **TypeScript:** ~5.x
- **Node.js:** 18+ required

**Key Dependencies:**
```json
{
  "expo": "^54.0.0",
  "expo-router": "^6.0.15",
  "expo-sqlite": "^15.0.5",
  "react-native": "0.81.5",
  "react": "19.1.0",
  "zustand": "^5.0.3",
  "date-fns": "^4.1.0",
  "react-native-calendars": "^1.1311.0",
  "react-native-screens": "4.16.0",  // IMPORTANT: Must be ~4.16.0 for SDK 54
  "expo-print": "^14.0.3",
  "expo-sharing": "^13.0.3",
  "@react-native-async-storage/async-storage": "^2.1.1",
  "expo-haptics": "^14.0.2"
}
```

**Critical Version Notes:**
- `react-native-screens` MUST be `~4.16.0` (version 4.18.0 causes Metro bundler errors)
- All packages aligned with Expo SDK 54 via `npx expo install --fix`
- `react-native-worklets` must be `0.5.1` (not 0.6.1)

### Routing System

**Expo Router (File-Based):**
- All navigable screens are files in `/app` directory
- Tab navigation defined in `/app/(tabs)/_layout.tsx`
- Route structure:
  ```
  /                    → Dashboard (index.tsx)
  /timesheet           → Timesheet Grid
  /history             → History/Calendar/Reports
  /oncall              → On-Call Schedule
  /settings            → Settings
  /weekly-summary      → Detailed weekly view
  ```

**Navigation Library:**
- Uses `@react-navigation/bottom-tabs` under the hood
- Tab bar icons: Ionicons
- Bottom tab navigation with 5 tabs

### State Management

**Zustand Store:** `/app/frontend/store/timesheetStore.ts`

**State Structure:**
```typescript
interface TimesheetStore {
  // Current timesheet data
  entries: TimeEntry[];
  weekStartDate: string;
  weekEndDate: string;
  
  // Summary data
  weekTotals: { st: number; ot: number };
  
  // Loading states
  isLoading: boolean;
  
  // Actions
  setEntries: (entries: TimeEntry[]) => void;
  addHours: (date: string, line: string, type: 'ST' | 'OT') => void;
  removeHours: (date: string, line: string, type: 'ST' | 'OT') => void;
  loadWeek: (startDate: string) => void;
  refreshWeek: () => void;
}
```

**Why Zustand?**
- Lightweight (no boilerplate)
- Works well with React hooks
- Easy to debug
- Minimal re-renders

**Alternative State:**
- Local component state (useState) for UI-only state
- AsyncStorage for simple key-value pairs (last sync time, etc.)
- SQLite for all structured data

### Database Architecture

**SQLite Implementation:**
- **Library:** `expo-sqlite` (official Expo package)
- **Location:** On-device storage (private app directory)
- **Platform Differences:**
  - Native (Android): Full SQLite support
  - Web Preview: Mock implementation (`database.web.ts`)

**Database Wrapper:**
- **File:** `/app/frontend/services/databaseWrapper.ts`
- Dynamically loads native or web implementation
- Provides unified interface across platforms

**Database Service:**
- **File:** `/app/frontend/services/database.ts`
- All SQL queries centralized here
- Handles initialization, migrations, CRUD operations

**Migration System:**
- **File:** `/app/frontend/services/migrations.ts`
- Non-destructive migrations
- Version tracking in `schema_version` table
- Migrations run automatically on app start
- Current schema version: 2

---

## Database Schema

### Schema Version 2 (Current)

#### Table: `schema_version`
**Purpose:** Track database version for migrations

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Auto-increment ID |
| version | INTEGER | NOT NULL | Schema version number |
| name | TEXT | | Human-readable version name |
| applied_at | TEXT | | ISO timestamp of migration |

**Current Row:**
```sql
INSERT INTO schema_version (version, name, applied_at) 
VALUES (2, 'v2-oncall-feature', '2025-11-20T00:00:00.000Z');
```

---

#### Table: `time_entries`
**Purpose:** Store all work hour entries

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Auto-increment ID |
| work_date | TEXT | NOT NULL | Date in YYYY-MM-DD format |
| line_code | TEXT | NOT NULL | Work line (VTR, CLP, etc.) |
| st_hours | INTEGER | DEFAULT 0 | Straight time hours |
| ot_hours | INTEGER | DEFAULT 0 | Overtime hours |
| week_ending_date | TEXT | | Saturday of that week (YYYY-MM-DD) |

**Indexes:**
```sql
CREATE INDEX idx_time_entries_work_date ON time_entries(work_date);
CREATE INDEX idx_time_entries_week_ending ON time_entries(week_ending_date);
```

**Example Row:**
```sql
INSERT INTO time_entries (work_date, line_code, st_hours, ot_hours, week_ending_date)
VALUES ('2025-11-20', 'VTR', 8, 2, '2025-11-23');
```

---

#### Table: `line_codes`
**Purpose:** Manage available work lines and visibility

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| line_code | TEXT | PRIMARY KEY | Unique line identifier |
| is_visible | INTEGER | DEFAULT 1 | 1 = visible, 0 = hidden |
| created_at | TEXT | | ISO timestamp |

**Default Lines:**
```sql
INSERT INTO line_codes (line_code, is_visible) VALUES
  ('VTR', 1),
  ('CLP', 1),
  ('RUTS', 1),
  ('MOW', 1);
```

---

#### Table: `settings`
**Purpose:** App-wide configuration key-value pairs

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| key | TEXT | PRIMARY KEY | Setting identifier |
| value | TEXT | | Setting value (stored as string) |

**Example Rows:**
```sql
INSERT INTO settings (key, value) VALUES
  ('base_pay_week_date', '2025-01-03'),
  ('auto_sync_enabled', 'true');
```

---

#### Table: `work_notes`
**Purpose:** Store notes attached to work days/lines

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Auto-increment ID |
| work_date | TEXT | NOT NULL | Date in YYYY-MM-DD format |
| line_code | TEXT | | Optional line code |
| note_text | TEXT | NOT NULL | Note content |
| created_at | TEXT | | ISO timestamp |

**Indexes:**
```sql
CREATE INDEX idx_work_notes_work_date ON work_notes(work_date);
```

**Example Row:**
```sql
INSERT INTO work_notes (work_date, line_code, note_text, created_at)
VALUES ('2025-11-20', 'VTR', 'Replaced 50ft rail section near MP 42', '2025-11-20T14:30:00.000Z');
```

---

#### Table: `on_call_users`
**Purpose:** Store user information for on-call filtering

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Auto-increment ID |
| user_name | TEXT | UNIQUE, NOT NULL | Full name |
| is_current_user | INTEGER | DEFAULT 0 | 1 = current user, 0 = other |
| created_at | TEXT | | ISO timestamp |

**Constraint:**
- Only ONE row can have `is_current_user = 1`
- Enforced in application logic (not database constraint)

**Example Row:**
```sql
INSERT INTO on_call_users (user_name, is_current_user, created_at)
VALUES ('John Smith', 1, '2025-11-01T12:00:00.000Z');
```

---

#### Table: `on_call_schedule`
**Purpose:** Store on-call weekend assignments

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Auto-increment ID |
| start_date | TEXT | NOT NULL | Weekend start (YYYY-MM-DD) |
| end_date | TEXT | NOT NULL | Weekend end (YYYY-MM-DD) |
| user_name | TEXT | NOT NULL | Assigned worker's name |
| notes | TEXT | | Optional notes |
| is_swapped | INTEGER | DEFAULT 0 | 1 if shift was swapped |
| original_user_name | TEXT | | Original assignee if swapped |
| created_at | TEXT | | ISO timestamp (when row created) |
| updated_at | TEXT | | ISO timestamp (last modified) |

**Unique Constraint:**
```sql
UNIQUE(start_date, end_date, user_name)
```

**Indexes:**
```sql
CREATE INDEX idx_oncall_dates ON on_call_schedule(start_date, end_date);
CREATE INDEX idx_oncall_user ON on_call_schedule(user_name);
```

**Example Row:**
```sql
INSERT INTO on_call_schedule 
  (start_date, end_date, user_name, notes, is_swapped, created_at)
VALUES 
  ('2025-11-23', '2025-11-24', 'John Smith', 'Holiday weekend', 0, '2025-11-15T10:00:00.000Z');
```

---

### Database Service Functions

**Location:** `/app/frontend/services/database.ts`

#### Initialization
```typescript
initialize(): Promise<void>
// Opens database connection, runs migrations
```

#### Time Entries
```typescript
getTimeEntries(startDate: string, endDate: string): Promise<TimeEntry[]>
saveTimeEntry(entry: TimeEntry): Promise<void>
updateTimeEntry(entry: TimeEntry): Promise<void>
deleteTimeEntry(id: number): Promise<void>
```

#### Work Notes
```typescript
getWorkNotes(startDate: string, endDate: string): Promise<WorkNote[]>
saveWorkNote(note: WorkNote): Promise<void>
deleteWorkNote(id: number): Promise<void>
```

#### Line Codes
```typescript
getLineCodes(): Promise<LineCode[]>
addLineCode(code: string): Promise<void>
toggleLineVisibility(code: string, visible: boolean): Promise<void>
```

#### On-Call Schedule
```typescript
getOnCallSchedule(startDate: string, endDate: string, userName?: string): Promise<OnCallEntry[]>
saveOnCallSchedule(entries: OnCallEntry[]): Promise<void>
clearOnCallSchedule(): Promise<void>
```

#### Users
```typescript
getCurrentUser(): Promise<string | null>
setCurrentUser(userName: string): Promise<void>
```

#### Settings
```typescript
getSetting(key: string): Promise<string | null>
setSetting(key: string, value: string): Promise<void>
```

---

## Business Logic Rules

### Hour Entry Rules

#### Straight Time (ST) Caps
1. **Daily Per-Line Cap:** 8 hours ST per day per line
   - Example: VTR line on Monday can have max 8 ST hours
   - CLP line on Monday can also have 8 ST hours (separate cap)

2. **Weekly Total Cap:** 40 hours ST per week (across all lines/days)
   - Week = Monday-Sunday
   - Once 40 ST hours reached, all additional hours must be OT

3. **Cap Enforcement:**
   - Caps checked on every `+` button press
   - If cap would be exceeded, button becomes disabled
   - User must add hours as OT instead

#### Overtime (OT)
- **No Caps:** Workers can log unlimited OT hours
- **Purpose:** Capture all hours worked beyond ST limits

#### Hour Increment/Decrement
- Hours change in 1-hour increments
- Minimum value: 0 (cannot go negative)
- Maximum value: Enforced by business rules (ST) or unlimited (OT)

---

### Week Calculation

#### Week Definition
- **Start:** Monday
- **End:** Sunday
- **Week Ending Date:** The Saturday of that week

**Example:**
- Week of Nov 18-24, 2025
- Week ending date: November 23, 2025 (Saturday)

#### Pay Period Calculation
- **System:** Bi-weekly (every 2 weeks)
- **Configuration:** User sets "Base Pay Week" date (a Friday)
- **Calculation:**
  ```typescript
  function isPayWeek(weekEndingDate: string, basePayWeekDate: string): boolean {
    const daysDiff = differenceInDays(weekEndingDate, basePayWeekDate);
    const weeksDiff = Math.floor(daysDiff / 7);
    return weeksDiff % 2 === 0;
  }
  ```
- **Display:** Pay weeks shown with special indicator in UI

---

### On-Call Schedule Rules

#### Sync Behavior
1. **Full Replacement:** Each sync clears ALL existing on-call data and replaces it
2. **Not Additive:** Old entries are deleted before new ones are inserted
3. **Reason:** Ensures schedule stays accurate to master sheet

#### User Filtering
1. User sets their name in Settings
2. Name saved to `on_call_users` with `is_current_user = 1`
3. All queries filter by `user_name = currentUser`
4. **Case-Sensitive:** "John Smith" ≠ "john smith"

#### Date Matching
- On-call entries matched by `start_date` and `end_date`
- Typically weekends (Saturday-Sunday)
- Example: `2025-11-23` to `2025-11-24`

---

### Data Validation Rules

#### Date Format
- **Required Format:** `YYYY-MM-DD`
- **Example:** `2025-11-23`
- **Validation:** Regex or date-fns parsing
- **Invalid Examples:** `11/23/2025`, `23-11-2025`, `2025/11/23`

#### Line Codes
- **Allowed Characters:** Letters, numbers, hyphens
- **Length:** 2-10 characters
- **Case:** Stored as uppercase
- **Reserved Codes:** VTR, CLP, RUTS, MOW (cannot be deleted)

#### User Names
- **Allowed Characters:** Letters, spaces, hyphens
- **Length:** 2-50 characters
- **Whitespace:** Trimmed on save
- **Required:** Cannot be empty for on-call to work

---

## File Structure & Key Components

```
/app/
├── frontend/
│   ├── app/                          # Expo Router screens
│   │   ├── (tabs)/                   # Tab navigation group
│   │   │   ├── _layout.tsx           # Tab bar configuration
│   │   │   ├── index.tsx             # Dashboard (home screen)
│   │   │   ├── timesheet.tsx         # Timesheet entry grid
│   │   │   ├── history.tsx           # History/Calendar/Reports
│   │   │   ├── oncall.tsx            # On-call schedule
│   │   │   └── settings.tsx          # Settings & config
│   │   ├── weekly-summary.tsx        # Detailed week view
│   │   └── _layout.tsx               # Root layout
│   │
│   ├── components/                   # Reusable UI components
│   │   ├── ReportsView.tsx           # Reports generation UI
│   │   ├── WeeklyNotesModal.tsx      # Notes entry modal
│   │   └── NotesFloatingButton.tsx   # FAB for notes
│   │
│   ├── services/                     # Business logic layer
│   │   ├── database.ts               # SQLite operations (native)
│   │   ├── database.web.ts           # Mock DB for web preview
│   │   ├── databaseWrapper.ts        # Platform-specific loader
│   │   ├── migrations.ts             # Database migrations
│   │   └── autoSync.ts               # On-call schedule sync
│   │
│   ├── store/                        # State management
│   │   └── timesheetStore.ts         # Zustand store
│   │
│   ├── constants/                    # App configuration
│   │   └── config.ts                 # URLs, version, constants
│   │
│   ├── assets/                       # Static resources
│   │   ├── images/                   # Icons, splash screens
│   │   │   ├── icon.png              # App icon
│   │   │   ├── splash.png            # Splash screen
│   │   │   └── adaptive-icon.png     # Android adaptive icon
│   │   └── screenshots/              # Documentation images
│   │       ├── dashboard.jpg
│   │       ├── timesheet.jpg
│   │       ├── history-list-view.jpg
│   │       ├── history-calendar.jpg
│   │       ├── history-reports.jpg
│   │       ├── on-call.jpg
│   │       └── settings.jpg
│   │
│   ├── app.json                      # Expo configuration
│   ├── package.json                  # Dependencies
│   ├── eas.json                      # EAS Build profiles
│   ├── babel.config.js               # Babel configuration (MINIMAL)
│   ├── .gitignore                    # Git ignore rules
│   ├── .env                          # Environment variables
│   └── README.md                     # Documentation
│
├── backend/                          # FastAPI backend (DORMANT)
│   ├── main.py                       # Not used in v1.2.0.1
│   └── ...                           # Reserved for future features
│
└── VRS_TIME_WIZARD_COMPLETE_SPECIFICATION.md  # This file
```

---

### Key Files Deep Dive

#### `/app/frontend/app.json`
**Purpose:** Expo configuration and build settings

**Critical Fields:**
```json
{
  "expo": {
    "name": "VRS Time Wizard",
    "slug": "vrs-time-wizard",
    "version": "1.2.0.1",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/images/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "android": {
      "package": "com.vrstimewizard.app",
      "versionCode": 4,
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "permissions": []
    },
    "ios": {
      "bundleIdentifier": "com.vrstimewizard.app",
      "supportsTablet": true
    },
    "plugins": [
      "expo-router",
      "expo-sqlite"
    ],
    "experiments": {
      "typedRoutes": true
    },
    "scheme": "vrstimewizard",
    "newArchEnabled": true  // CRITICAL: Required for react-native-reanimated
  }
}
```

**Important Notes:**
- `newArchEnabled: true` MUST be set (required for Reanimated, Worklets)
- `version` and `android.versionCode` must be incremented together
- No Facebook, Google, or social login plugins (offline-first design)

---

#### `/app/frontend/babel.config.js`
**Purpose:** Babel transpiler configuration (MINIMAL)

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["expo-router/babel"],
  };
};
```

**CRITICAL:**
- **DO NOT** manually add `react-native-reanimated/plugin`
- **DO NOT** manually add `react-native-worklets/plugin`
- Expo handles these automatically when `newArchEnabled: true`
- Adding them manually causes duplicate plugin errors

---

#### `/app/frontend/eas.json`
**Purpose:** EAS Build configuration for cloud builds

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "android": {
        "buildType": "apk"
      },
      "distribution": "internal"
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

**Profiles:**
- **development:** For Expo Go testing
- **preview:** Generates APK for internal testing (what we use)
- **production:** Generates AAB for Play Store (future)

---

#### `/app/frontend/.env`
**Purpose:** Environment variables (Emergent-specific)

```bash
EXPO_TUNNEL_SUBDOMAIN=rail-timekeeper
EXPO_PACKAGER_HOSTNAME=https://rail-timekeeper.preview.emergentagent.com
EXPO_PUBLIC_BACKEND_URL=https://rail-timekeeper.preview.emergentagent.com
EXPO_USE_FAST_RESOLVER="0"
METRO_CACHE_ROOT=/app/frontend/.metro-cache
```

**IMPORTANT:**
- These are set by Emergent platform
- **DO NOT MODIFY** in production code
- In forked environments, these values may change
- `EXPO_PUBLIC_BACKEND_URL` not currently used (app is offline-first)

---

#### `/app/frontend/.gitignore`
**Purpose:** Prevent committing generated files

**Critical Entries:**
```
# Native folders (regenerated by expo prebuild)
android/
ios/

# Build artifacts
.expo/
.metro-cache/
build/
dist/

# Dependencies
node_modules/

# Logs
*.log

# OS
.DS_Store
```

**Why This Matters:**
- Native folders are **disposable** (regenerated on build)
- Committing them causes merge conflicts and bloat
- Only source code and config files should be committed

---

## Configuration Files

### `/app/frontend/constants/config.ts`

**Purpose:** Centralized app configuration

```typescript
/**
 * Default Master On-Call Schedule URL
 * This is the published Google Sheets CSV that all users sync from
 */
export const DEFAULT_ONCALL_SCHEDULE_URL = 
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQKbW0xHsx93vd8xLVdZXQghRzSLndLxtA25zuKYKXPwz5yrGX4H8Xnnbe5BS114UBr9YoXgc4cSrE7/pub?output=csv';

/**
 * Auto-sync interval in days
 */
export const AUTO_SYNC_INTERVAL_DAYS = 7;

/**
 * App version - should match version in app.json
 */
export const APP_VERSION = '1.2.0.1';

/**
 * App name
 */
export const APP_NAME = 'VRS Time Wizard';
```

**Usage:**
- Imported throughout app for consistency
- Only place where version number exists (besides app.json)
- Master schedule URL can be overridden via Developer Menu

---

### TypeScript Types

**Location:** Defined inline in component files or services

**Key Types:**

```typescript
interface TimeEntry {
  id?: number;
  work_date: string;        // YYYY-MM-DD
  line_code: string;        // VTR, CLP, etc.
  st_hours: number;         // Straight time hours
  ot_hours: number;         // Overtime hours
  week_ending_date?: string; // YYYY-MM-DD (Saturday)
}

interface WorkNote {
  id?: number;
  work_date: string;        // YYYY-MM-DD
  line_code?: string;       // Optional (can be general note)
  note_text: string;
  created_at?: string;      // ISO timestamp
}

interface LineCode {
  line_code: string;
  is_visible: boolean;
  created_at?: string;
}

interface OnCallEntry {
  id?: number;
  start_date: string;       // YYYY-MM-DD
  end_date: string;         // YYYY-MM-DD
  user_name: string;
  notes?: string;
  is_swapped?: boolean;
  original_user_name?: string;
  created_at?: string;
  updated_at?: string;
}

interface WeekSummary {
  week_ending_date: string;
  total_st: number;
  total_ot: number;
  entries: TimeEntry[];
}

interface ReportData {
  entries: TimeEntry[];
  notes: WorkNote[];
  startDate: string;
  endDate: string;
  userName?: string;
}

interface ReportStats {
  totalHours: number;
  totalST: number;
  totalOT: number;
  daysWorked: number;
  avgHoursPerDay: number;
  stPercentage: number;
  otPercentage: number;
}
```

---

## Development History

### Version 1.0.0 (Initial Release - November 2025)

**Features Implemented:**
- Basic timesheet grid with ST/OT tracking
- SQLite database with `time_entries` table
- Weekly hour caps (8 ST/day, 40 ST/week)
- Line code management
- History view (list format)
- Backup/restore functionality

**Technical Details:**
- Built with Expo SDK 50
- React Native 0.73
- Basic schema (version 1)

---

### Version 1.1.0 (Notes Feature - November 2025)

**Features Added:**
- Work notes functionality
- `work_notes` table added to database
- Weekly notes modal with tabbed interface
- Notes visible in weekly summary
- Floating action button (FAB) for note entry

**Bug Fixes:**
- Pay week calculation corrections
- Grid alignment issues
- Date formatting inconsistencies

**Technical Changes:**
- Added `date-fns` library for date handling
- Improved database query performance

---

### Version 1.2.0 (On-Call & Reports - November 2025)

**Major Features Added:**
1. **On-Call Schedule:**
   - Google Sheets integration
   - CSV parsing and sync
   - Auto-sync (weekly on app open)
   - Manual sync button
   - User filtering by name
   - New tables: `on_call_users`, `on_call_schedule`

2. **Unified History View:**
   - Three-way toggle: List / Calendar / Reports
   - Calendar view with react-native-calendars
   - Multi-dot marking system (hours/notes/on-call)
   - Day detail modal with full information

3. **Advanced Reporting:**
   - Date range selection (presets + custom)
   - Statistics calculation
   - PDF export (detailed & summary formats)
   - CSV export for data analysis
   - Professional formatting

4. **Developer Menu:**
   - Hidden menu (tap version 5x)
   - Override master schedule URL
   - Clear on-call data
   - Debug functions

**Technical Improvements:**
- Database migration system (schema version 2)
- Non-destructive migrations with verification
- Performance optimizations (debouncing, haptics)
- Improved error handling

**Bug Fixes:**
- Calendar modal header-only bug
- Duplicate on-call data on sync
- Button debouncing issues
- Various UI alignment fixes

---

### Version 1.2.0.1 (Current - November 2025)

**Patch Release - Repository Cleanup & Stability**

**Bug Fixes:**
1. **Keyboard Covering Input:**
   - Issue: Software keyboard covered text input in notes modal
   - Fix: Wrapped modal content in `KeyboardAvoidingView`
   - File: `/app/frontend/components/WeeklyNotesModal.tsx`
   - Impact: Notes now fully usable on all devices

2. **Module Resolution Error:**
   - Issue: `react-native-screens@4.18.0` incompatible with Expo SDK 54
   - Fix: Downgraded to `react-native-screens@4.16.0`
   - Ran `npx expo install --fix` to align all packages
   - Cleared all caches (.metro-cache, .expo, node_modules/.cache)
   - Impact: Metro bundler now starts without errors

**Repository Cleanup:**
- Removed `android/` folder from Git history
- Removed `.metro-cache/` and build artifacts
- Removed corrupted UTF-8 filename blocking checkout
- Updated `.gitignore` to follow Expo best practices
- Created new clean branch: `v1.2.0.1-release`

**Documentation Enhancements:**
- Added 7 high-quality app screenshots
- Enhanced README with visual documentation
- Added screenshot references throughout README
- Created comprehensive troubleshooting section
- Added detailed feature guide

**Version Updates:**
- `app.json`: version "1.2.0.1", versionCode 4
- `package.json`: version "1.2.0.1"
- `config.ts`: APP_VERSION "1.2.0.1"

**Package Updates:**
- Aligned all dependencies with Expo SDK 54
- Fixed version mismatches:
  - react-native: 0.82.1 → 0.81.5
  - react: 19.2.0 → 19.1.0
  - react-native-screens: 4.18.0 → 4.16.0
  - react-native-gesture-handler: 2.29.1 → 2.28.0
  - And 6 other packages

**Build Configuration:**
- Synced with user's working local build
- Confirmed New Architecture enabled
- Minimal Babel config (no manual plugins)
- EAS build profiles verified

---

## Known Issues & Limitations

### Current Limitations

1. **Platform Support:**
   - ✅ Android 7.0+ (fully tested)
   - ⚠️ iOS (compatible but not tested)
   - ⚠️ Web preview (limited - database mocked)

2. **Data Portability:**
   - Data stored locally only
   - No cloud backup (planned for future)
   - Uninstalling app deletes all data
   - Backup/restore requires manual file handling

3. **On-Call Sync:**
   - Requires internet for initial sync
   - No background sync (only on app open)
   - No conflict resolution for swapped shifts
   - Case-sensitive name matching

4. **Reporting:**
   - PDF generation slow for large date ranges (5-10 seconds)
   - No email integration
   - Export requires manual file sharing

5. **UI/UX:**
   - No dark mode
   - Calendar dots can overlap on busy days
   - No undo/redo for hour changes
   - No bulk edit functionality

### Known Bugs (Minor)

1. **Icon Rendering:**
   - Some devices show different icon sizes based on DPI
   - Adaptive icon may not render perfectly on all Android versions
   - Workaround: None needed, cosmetic only

2. **Calendar Navigation:**
   - Swiping between months sometimes requires multiple attempts
   - Related to react-native-calendars library limitation

3. **PDF Layout:**
   - Very long notes can cause PDF page overflow
   - Tables may not break perfectly across pages

4. **Haptic Feedback:**
   - Not all devices support haptics
   - No graceful degradation (just fails silently)

---

## Build & Deployment

### Local Development Build

**Prerequisites:**
- Node.js 18+
- Yarn or npm
- Expo CLI (`npm install -g expo-cli`)

**Steps:**
```bash
# Clone repository
git clone <repo-url>
cd frontend

# Install dependencies
yarn install

# Start development server
npx expo start

# Test on device
# Scan QR code with Expo Go app
```

**Common Commands:**
```bash
# Android emulator
npx expo start --android

# iOS simulator (macOS only)
npx expo start --ios

# Clear cache
npx expo start --clear

# Check for package issues
npx expo-doctor
```

---

### Production Build (EAS)

**Prerequisites:**
- EAS CLI (`npm install -g eas-cli`)
- Expo account (free)

**First-Time Setup:**
```bash
# Login to Expo
eas login

# Configure project
eas build:configure
```

**Build Commands:**
```bash
# Preview build (APK for testing)
eas build -p android --profile preview

# Production build (AAB for Play Store)
eas build -p android --profile production

# Check build status
eas build:list
```

**Download APK:**
- EAS sends email with build link
- Or visit: https://expo.dev/accounts/[username]/projects/vrs-time-wizard/builds

---

### Local Build (Advanced)

**Prerequisites:**
- Android Studio with Android SDK
- NDK installed
- Java 17+

**Steps:**
```bash
# Generate native Android project
npx expo prebuild --clean

# Navigate to android folder
cd android

# Build APK
./gradlew assembleRelease

# Output location
# android/app/build/outputs/apk/release/app-release.apk
```

**Important:**
- Run `npx expo prebuild --clean` before EVERY local build
- Never commit the `android/` folder to Git
- Signing keys required for production builds

---

### Version Bumping Process

**When releasing a new version:**

1. **Update Version Numbers:**
   ```json
   // app.json
   {
     "version": "1.2.0.2",
     "android": {
       "versionCode": 5  // Increment by 1
     }
   }
   ```
   
   ```json
   // package.json
   {
     "version": "1.2.0.2"
   }
   ```
   
   ```typescript
   // constants/config.ts
   export const APP_VERSION = '1.2.0.2';
   ```

2. **Update README:**
   - Add new version to history section
   - Update "Current Version" badge

3. **Git Tag:**
   ```bash
   git tag -a v1.2.0.2 -m "Version 1.2.0.2 - [description]"
   git push origin v1.2.0.2
   ```

4. **Build & Test:**
   ```bash
   eas build -p android --profile preview
   # Test on device
   # If approved, build production
   eas build -p android --profile production
   ```

---

## Testing Guidelines

### Manual Testing Checklist

**Timesheet Entry:**
- [ ] Add ST hours (tap + button)
- [ ] Add OT hours (tap + button)
- [ ] Remove hours (tap - button)
- [ ] Verify 8 ST cap per day per line
- [ ] Verify 40 ST cap per week
- [ ] Test multiple lines on same day
- [ ] Navigate to previous/next week
- [ ] Check weekly summary totals

**Work Notes:**
- [ ] Open notes modal (FAB button)
- [ ] Add note to specific day
- [ ] Add note to specific line
- [ ] Add note without line (general note)
- [ ] Verify keyboard doesn't cover input
- [ ] Delete a note
- [ ] Check notes appear in history

**On-Call Schedule:**
- [ ] Set user name in Settings
- [ ] Trigger manual sync
- [ ] Verify only user's shifts displayed
- [ ] Check shifts appear in calendar view
- [ ] Test auto-sync (change date forward 7 days)
- [ ] Verify last sync timestamp updates

**History Views:**
- [ ] List View: Expand/collapse weeks
- [ ] Calendar View: Navigate between months
- [ ] Calendar View: Tap day, check modal content
- [ ] Verify dots: blue (hours), orange (notes), green (on-call)
- [ ] Check multiple dots on same day

**Reports:**
- [ ] Generate report for last 30 days
- [ ] Generate report for custom date range
- [ ] Verify statistics accuracy
- [ ] Export CSV, open in spreadsheet app
- [ ] Export PDF, verify formatting
- [ ] Test with range > 90 days (summary format)
- [ ] Test with range < 90 days (detailed format)

**Settings:**
- [ ] Change user name, verify on-call filter updates
- [ ] Set base pay week, verify pay period indicators
- [ ] Add custom line code
- [ ] Hide/show line code
- [ ] Toggle auto-sync on/off
- [ ] Export database backup (JSON)
- [ ] Import database backup
- [ ] Activate developer menu (tap version 5x)
- [ ] Override master schedule URL (dev menu)

**Edge Cases:**
- [ ] App survives force close
- [ ] App works in airplane mode
- [ ] Database persists after app restart
- [ ] Large date ranges don't crash reports
- [ ] Empty weeks display correctly
- [ ] Future weeks allow entry

---

### Automated Testing

**Current Status:** No automated tests implemented

**Future Test Suite (Recommended):**
1. **Unit Tests (Jest):**
   - Database service functions
   - Business logic (hour caps)
   - Date calculations
   - CSV parsing

2. **Integration Tests (Detox):**
   - Full user flows (add hours, create note, sync on-call)
   - Database migrations
   - Export/import functionality

3. **E2E Tests:**
   - Complete timesheet week entry
   - Report generation and export
   - On-call sync from actual Google Sheet

**Test Command (when implemented):**
```bash
# Unit tests
yarn test

# E2E tests
yarn test:e2e
```

---

## Future Roadmap

### Planned for v1.3.0 (Next Release)

1. **Shift Swap Feature:**
   - Request shift swap with another worker
   - Accept/reject swap requests
   - Track original vs. swapped assignments
   - Update on-call schedule table with swap info

2. **Enhanced On-Call Statistics:**
   - Days until next shift
   - Total days on call this year
   - On-call hours worked (optional)
   - History of past shifts

3. **Personal Notes on Shifts:**
   - Add notes to specific on-call assignments
   - Different from work notes (shift-specific)
   - Example: "Traded with John", "Standby only"

4. **On-Call Reminders:**
   - Push notification 24h before shift
   - Configurable reminder time
   - Requires expo-notifications

5. **Background Auto-Sync:**
   - Check for schedule updates in background
   - Notify user of changes
   - Requires background task API

---

### Future Considerations (v2.0+)

1. **iOS App Store Release:**
   - Complete iOS testing
   - Configure iOS build settings
   - Submit to App Store

2. **Cloud Backup (Optional):**
   - User account system
   - Encrypted cloud storage
   - Multi-device sync
   - Still works offline-first

3. **Multi-Location Support:**
   - Separate crews: Rutland, Burlington, White River
   - Location-specific line codes
   - Location-based on-call schedules

4. **Payroll Integration:**
   - Export in payroll system format
   - Direct submission to payroll
   - Approval workflow

5. **Dark Mode:**
   - Theme toggle in Settings
   - Auto-detect system preference
   - Consistent styling across app

6. **Widgets:**
   - Today's hours logged (widget)
   - Quick entry from home screen
   - On-call status widget

7. **Offline P2P Sync:**
   - Share timesheets between devices via Bluetooth
   - No internet required
   - Useful for crew leads collecting data

8. **Analytics Dashboard:**
   - Trends over time
   - Most-worked lines
   - ST vs. OT ratio trends
   - Peak work periods

---

## Critical Notes for Continuation

### Important Technical Constraints

1. **Package Version Lock:**
   - **CRITICAL:** `react-native-screens` MUST stay at `~4.16.0`
   - Version 4.18.0 causes Metro bundler errors
   - If upgrading Expo SDK, rerun `npx expo install --fix`

2. **Babel Configuration:**
   - Keep `babel.config.js` MINIMAL
   - Do NOT manually add Reanimated or Worklets plugins
   - Expo handles these via `newArchEnabled: true`

3. **Database Migrations:**
   - NEVER modify existing migration files
   - ALWAYS create new migration for schema changes
   - Include version check in migration logic
   - Test migrations on existing data before release

4. **On-Call Sync:**
   - CSV format is HARDCODED (4 columns: start_date, end_date, user, notes)
   - Changing format requires app update
   - Master URL hardcoded in `config.ts`
   - Can be overridden via Developer Menu

5. **Offline-First Design:**
   - All features MUST work without internet
   - Database is source of truth
   - API calls are for sync only, not required

---

### Code Standards & Best Practices

1. **TypeScript:**
   - Use explicit types for all database functions
   - Define interfaces for all data structures
   - Avoid `any` type

2. **Database Queries:**
   - Always use parameterized queries (prevent SQL injection)
   - Wrap in try-catch blocks
   - Log errors with context

3. **Date Handling:**
   - Always use `date-fns` library
   - Store dates as `YYYY-MM-DD` strings
   - Use ISO timestamps for `created_at`/`updated_at`

4. **Component Structure:**
   - Keep components under 300 lines
   - Extract business logic to services
   - Use hooks for state management
   - Memoize expensive calculations

5. **Error Handling:**
   - User-friendly error messages
   - Log technical details to console
   - Never expose internal errors to user

6. **Performance:**
   - Debounce button presses (300ms)
   - Lazy load calendar months
   - Paginate history list (8 weeks at a time)
   - Optimize database queries with indexes

---

### Git Workflow

**Branch Strategy:**
- `main` - Stable production releases only
- `development` - Active development branch
- `feature/*` - Feature branches (merge to development)
- `hotfix/*` - Critical bug fixes (merge to main)

**Commit Messages:**
```
feat: Add shift swap functionality
fix: Resolve keyboard covering notes input
docs: Update README with v1.3.0 features
chore: Bump dependencies to Expo SDK 55
refactor: Extract report logic to service
test: Add unit tests for hour cap logic
```

**Protected Files:**
- Never commit: `android/`, `ios/`, `.expo/`, `.metro-cache/`
- Always commit: `app.json`, `package.json`, `eas.json`, source code
- Review carefully: `.env` (may contain secrets in prod)

---

### Debugging Tips

**Metro Bundler Issues:**
```bash
# Clear all caches
rm -rf node_modules .expo .metro-cache
yarn install
npx expo start --clear
```

**Database Issues:**
```typescript
// View database in console
import { db } from './services/databaseWrapper';
await db.initialize();
const entries = await db.database.getAllAsync('SELECT * FROM time_entries');
console.log(entries);
```

**Build Errors:**
```bash
# Check for package issues
npx expo-doctor

# Verify Expo SDK alignment
npx expo install --check

# Regenerate native folders
npx expo prebuild --clean
```

**Module Resolution Errors:**
- Check `babel.config.js` (keep minimal)
- Verify `newArchEnabled: true` in `app.json`
- Check package versions against Expo SDK docs
- Run `npx expo install --fix`

---

### Contact & Handoff Information

**Original Developer:** [Your Name/Team]
**Project Repository:** [GitHub URL]
**Current Branch:** `v1.2.0.1-release`
**Last Build Date:** November 23, 2025
**Expo Account:** [Expo username]
**EAS Project:** vrs-time-wizard

**Key Stakeholders:**
- **End Users:** VRS MOW track crews (Burlington, Rutland, White River)
- **Admin/Manager:** Manages master on-call schedule in Google Sheets
- **Developer:** Maintaining and enhancing app

**Support Resources:**
- Expo Documentation: https://docs.expo.dev/
- React Native Docs: https://reactnative.dev/docs/getting-started
- SQLite Expo: https://docs.expo.dev/versions/latest/sdk/sqlite/
- EAS Build: https://docs.expo.dev/build/introduction/

---

## Appendix A: Environment Variables Reference

```bash
# Emergent Platform (DO NOT MODIFY)
EXPO_TUNNEL_SUBDOMAIN=rail-timekeeper
EXPO_PACKAGER_HOSTNAME=https://rail-timekeeper.preview.emergentagent.com
EXPO_PUBLIC_BACKEND_URL=https://rail-timekeeper.preview.emergentagent.com

# Metro Configuration
EXPO_USE_FAST_RESOLVER="0"
METRO_CACHE_ROOT=/app/frontend/.metro-cache

# Custom (Future Use)
# SENTRY_DSN=          # Error tracking
# ANALYTICS_KEY=       # Usage analytics
# CLOUD_BACKUP_URL=    # Future cloud backup
```

---

## Appendix B: Database Migration Example

**File:** `/app/frontend/services/migrations.ts`

```typescript
export async function runMigrations(database: SQLite.SQLiteDatabase) {
  // Check current version
  const result = await database.getAllAsync(
    'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1'
  );
  const currentVersion = result[0]?.version || 0;

  // Migration v1 → v2
  if (currentVersion < 2) {
    console.log('Running migration v1 → v2: Adding on-call tables');
    
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS on_call_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_name TEXT UNIQUE NOT NULL,
        is_current_user INTEGER DEFAULT 0,
        created_at TEXT
      );
      
      CREATE TABLE IF NOT EXISTS on_call_schedule (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        user_name TEXT NOT NULL,
        notes TEXT,
        is_swapped INTEGER DEFAULT 0,
        original_user_name TEXT,
        created_at TEXT,
        updated_at TEXT,
        UNIQUE(start_date, end_date, user_name)
      );
      
      INSERT INTO schema_version (version, name, applied_at)
      VALUES (2, 'v2-oncall-feature', datetime('now'));
    `);
    
    console.log('Migration v1 → v2 complete');
  }

  // Future migrations go here
  // if (currentVersion < 3) { ... }
}
```

---

## Appendix C: Common SQL Queries

**Get current week's entries:**
```sql
SELECT * FROM time_entries
WHERE work_date >= '2025-11-18' 
  AND work_date <= '2025-11-24'
ORDER BY work_date, line_code;
```

**Get total hours for a week:**
```sql
SELECT 
  SUM(st_hours) as total_st,
  SUM(ot_hours) as total_ot,
  SUM(st_hours + ot_hours) as total_hours
FROM time_entries
WHERE week_ending_date = '2025-11-23';
```

**Get user's on-call shifts:**
```sql
SELECT * FROM on_call_schedule
WHERE user_name = 'John Smith'
  AND start_date >= date('now')
ORDER BY start_date;
```

**Get all notes for a date range:**
```sql
SELECT wn.*, te.st_hours, te.ot_hours
FROM work_notes wn
LEFT JOIN time_entries te 
  ON wn.work_date = te.work_date 
  AND wn.line_code = te.line_code
WHERE wn.work_date BETWEEN '2025-11-01' AND '2025-11-30'
ORDER BY wn.work_date DESC;
```

---

## Appendix D: UI Component Hierarchy

```
App Root (_layout.tsx)
│
├── Tab Navigator ((tabs)/_layout.tsx)
│   │
│   ├── Dashboard (index.tsx)
│   │   └── WeekSummaryCard
│   │   └── QuickActionButtons
│   │   └── UpcomingOnCallCard
│   │
│   ├── Timesheet (timesheet.tsx)
│   │   └── WeekNavigator
│   │   └── TimesheetGrid
│   │   │   └── DayColumn
│   │   │       └── LineRow
│   │   │           └── HourButtons (+/-)
│   │   └── WeeklySummaryBar
│   │   └── NotesFloatingButton
│   │       └── WeeklyNotesModal
│   │           └── DayTabs
│   │           └── LineSelector
│   │           └── TextInput (with KeyboardAvoidingView)
│   │
│   ├── History (history.tsx)
│   │   └── ToggleSwitch (List/Calendar/Reports)
│   │   ├── ListView
│   │   │   └── WeekCard (expandable)
│   │   ├── CalendarView
│   │   │   └── Calendar (react-native-calendars)
│   │   │   └── DayDetailModal
│   │   └── ReportsView
│   │       └── DateRangePicker
│   │       └── StatsCards
│   │       └── ExportButtons
│   │
│   ├── OnCall (oncall.tsx)
│   │   └── OnCallCalendar
│   │   └── UpcomingShiftsList
│   │   └── SyncButton
│   │
│   └── Settings (settings.tsx)
│       ├── UserNameInput
│       ├── PayWeekDatePicker
│       ├── LineCodesManager
│       ├── OnCallSettings
│       ├── BackupRestore
│       └── DeveloperMenu (hidden)
│
└── Modal Screens
    └── WeeklySummary (weekly-summary.tsx)
        └── DetailedWeekBreakdown
```

---

## Appendix E: Performance Optimization Notes

**Current Performance:**
- App launch: ~2 seconds
- Database init: ~500ms
- Timesheet load: ~100ms (week of data)
- Report generation (30 days): ~1 second
- PDF export (30 days): ~3 seconds
- On-call sync: ~2 seconds (depends on sheet size)

**Optimization Techniques Used:**
1. **Database:**
   - Indexes on frequently queried columns
   - Batched inserts for on-call sync
   - Prepared statements (parameterized queries)

2. **UI:**
   - Debounced button presses
   - Lazy loading calendar months
   - Virtualized lists (not yet implemented)

3. **React:**
   - Memoized expensive calculations
   - useCallback for event handlers
   - Zustand for minimal re-renders

**Future Optimizations:**
- Implement FlatList for history (virtualization)
- Cache calendar marked dates
- Worker thread for PDF generation
- Compress database backups
- Lazy load on-call schedule by month

---

## Appendix F: Security Considerations

**Current Security Status:**

**✅ Secure:**
- All data stored locally (no cloud exposure)
- No user authentication required (single-user app)
- No sensitive data transmitted (on-call schedule is public)
- SQLite database in private app storage
- No analytics or tracking

**⚠️ To Consider:**
- Database not encrypted (could add SQLCipher)
- Backup JSON files not encrypted
- No PIN/biometric lock (anyone with phone access can use app)
- Master schedule URL accessible to anyone

**Recommendations for v2.0:**
1. Add optional PIN lock
2. Encrypt database at rest
3. Encrypt backup files
4. Add biometric authentication option
5. Secure cloud backup with encryption

---

## Document Changelog

- **v1.0** - November 23, 2025 - Initial comprehensive specification created
- **v1.1** - [Future date] - [Future updates]

---

**END OF SPECIFICATION DOCUMENT**

*This document is intended to provide a complete technical overview of the VRS Time Wizard app for handoff to another AI agent or developer. All critical information, architecture decisions, business logic, and development history are included.*

*For questions or clarifications, refer to the codebase directly or consult the README.md in the repository.*
