# Quick Start for Next Session - On-Call Feature

## 🎯 Mission: Build On-Call Schedule Feature (v1.2.0)

**Time Estimate**: 3-4 hours

---

## ⚠️ CRITICAL FIRST STEP

**READ THIS BEFORE CODING:**
- User has v1.1.0 running in production with real data
- **MUST preserve all existing database data**
- See `/app/SESSION_NOTES_NOV19_2025.md` for migration strategy
- DO NOT drop tables or reset database

---

## 📋 Quick Checklist

### Database (30 min)
- [ ] Add database version tracking (settings: database_version = 2)
- [ ] Create `oncall_employees` table
- [ ] Create `oncall_schedule` table
- [ ] Create `oncall_swaps` table
- [ ] Add migration method: `migrateToV2()`
- [ ] Test migration preserves existing data

### UI Structure (20 min)
- [ ] Add 5th tab "On-Call" to `app/(tabs)/_layout.tsx`
- [ ] Create `app/(tabs)/oncall.tsx`
- [ ] Add user identity setup modal (first-time)

### Calendar View (45 min)
- [ ] Build or install calendar component
- [ ] Show month view with dates
- [ ] Highlight user's shifts (blue)
- [ ] Highlight other shifts (gray)
- [ ] Month navigation (< >)

### Import System (30 min)
- [ ] Create import modal
- [ ] Parse text format: `Name, StartDate, EndDate`
- [ ] Show preview before confirming
- [ ] Save to database

### Swap System (40 min)
- [ ] Generate swap codes: `SWAP-JOHN-JANE-112925`
- [ ] Create swap entry screen
- [ ] Apply swap code screen
- [ ] Update calendar after swap

### Dashboard Banner (15 min)
- [ ] Add "You're on call soon!" banner
- [ ] Show next shift date

### Testing (30 min)
- [ ] Install v1.1.0 APK
- [ ] Add test data
- [ ] Install v1.2.0 over it
- [ ] Verify data preserved
- [ ] Test all on-call features

---

## 📁 Files to Create

```
/app/frontend/app/(tabs)/oncall.tsx
/app/frontend/components/CalendarView.tsx
/app/frontend/components/ImportScheduleModal.tsx
/app/frontend/components/SwapCodeModal.tsx
/app/frontend/store/oncallStore.ts (optional)
```

## 📝 Files to Modify

```
/app/frontend/app/(tabs)/_layout.tsx  - Add 5th tab
/app/frontend/services/database.ts    - Add migration + on-call methods
/app/frontend/services/database.web.ts - Mock methods
/app/frontend/app/(tabs)/index.tsx    - Add on-call banner
/app/frontend/app.json                - Bump to v1.2.0
```

---

## 🗄️ Database Schema

```sql
-- New tables for v1.2.0

CREATE TABLE IF NOT EXISTS oncall_employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  is_active INTEGER DEFAULT 1,
  location TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS oncall_schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_name) REFERENCES oncall_employees(name)
);

CREATE TABLE IF NOT EXISTS oncall_swaps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  original_employee TEXT NOT NULL,
  covering_employee TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  swap_code TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Add to settings table:
-- user_full_name (for identifying user)
-- database_version (for migration tracking)
```

---

## 💡 Key Business Logic

```typescript
// Who's on call today? (considering swaps)
getOnCallForDate(date: string): Promise<string | null>

// User's shifts in date range
getUserShifts(startDate: string, endDate: string): Promise<Shift[]>

// Generate swap code
generateSwapCode(original: string, covering: string, date: string): string
// Returns: "SWAP-JOHN-JANE-112925"

// Parse and import schedule
importSchedule(text: string): Promise<void>
// Accepts:
// John Doe, 11/22/2025, 11/24/2025
// Jane Smith, 11/29/2025, 12/01/2025
```

---

## 🎨 UI Flow

```
1. User opens On-Call tab (new 5th tab)
2. First time? → Ask for their name
3. See calendar with on-call dates
4. Tap [Import Schedule] → Paste list → Preview → Confirm
5. Calendar updates with colored dots
6. Tap own shift → [Create Swap Code]
7. Share code with coworker
8. Coworker enters code → Swap recorded
9. Both calendars update
```

---

## 🧪 Testing Script

```bash
# 1. Install v1.1.0
eas build --platform android --profile production

# 2. On device: Add time entries, notes, project lines

# 3. Build v1.2.0
# Update app.json version to 1.2.0
eas build --platform android --profile production

# 4. Install v1.2.0 OVER v1.1.0 (don't uninstall first)

# 5. Verify:
# - All time entries exist
# - All notes exist
# - All project lines exist
# - Settings preserved
# - New on-call tab works
```

---

## 📚 Reference Documents

- **Full details**: `/app/SESSION_NOTES_NOV19_2025.md`
- **Migration strategy**: `/app/SESSION_NOTES_NOV19_2025.md` (search "Migration Strategy")
- **Roadmap**: `/app/NEXT_STEPS.md`
- **Build instructions**: `/app/BUILD_INSTRUCTIONS.md`

---

## 🚀 Ready to Start?

1. Read `/app/SESSION_NOTES_NOV19_2025.md` (5 min)
2. Start with database migration (30 min)
3. Build UI components (90 min)
4. Test thoroughly (30 min)

**Total**: 3-4 hours to complete v1.2.0

---

**Last Session**: November 19, 2025  
**Next Task**: On-Call Schedule Feature  
**Version**: Upgrade from v1.1.0 → v1.2.0
