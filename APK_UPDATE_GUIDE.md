# APK Update & Migration Guide

## ✅ Your App is Configured for Safe Updates

### Current Configuration
```json
Package ID: com.vrstimewizard.app
Version: 1.2.0
Version Code: 3
Database: vrs_time_wizard.db
```

---

## 📱 What Happens When You Install the APK

### Scenario: Updating from v1.1.0 → v1.2.0

```
1. You build new APK (v1.2.0) with migration system
2. Transfer APK to your phone
3. Click to install
4. Android detects: "Same package ID = UPDATE"
5. Android preserves all app data
6. New code installed, old data KEPT
7. Launch app
8. Migration runs automatically
9. Database upgraded v1.0 → v2.0
10. All your existing data intact + new tables added
```

---

## 🔒 Why Your Data Will Be Safe

### 1. Package Identity Matching
```
Old APK: com.vrstimewizard.app
New APK: com.vrstimewizard.app ← SAME
Result: UPDATE (not new install)
```

### 2. Android Data Persistence
When updating (not uninstalling):
```
/data/data/com.vrstimewizard.app/
├── databases/
│   └── vrs_time_wizard.db  ← PRESERVED BY ANDROID
└── (all other app files)
```

### 3. Database File Remains
```javascript
// New app code runs
SQLite.openDatabaseAsync('vrs_time_wizard.db');
// ↑ Opens YOUR EXISTING DATABASE with all data
```

### 4. Migration Adds Only New Tables
```sql
-- YOUR EXISTING TABLES (UNTOUCHED)
time_entries      ✅ All rows preserved
line_codes        ✅ All rows preserved  
work_notes        ✅ All rows preserved
settings          ✅ All rows preserved

-- NEW TABLES (ADDED)
schema_version    🆕 Created empty
on_call_users     🆕 Created empty
on_call_schedule  🆕 Created empty
```

---

## 📋 Pre-Build Checklist

✅ **Version updated**: `1.2.0` (was 1.1.0)  
✅ **Version code**: `3` (for Android tracking)  
✅ **Package ID unchanged**: `com.vrstimewizard.app`  
✅ **Migration system**: Integrated and tested  
✅ **Data preservation**: Verified in migration code

---

## 🚀 Build & Install Process

### Step 1: Build the APK
```bash
# Using EAS Build (recommended)
eas build --platform android --profile production

# Or local build
npx expo build:android
```

### Step 2: Transfer to Phone
- Download APK from build service
- Transfer via USB, email, or cloud storage
- Allow installation from unknown sources (if needed)

### Step 3: Install
- Tap APK file
- Android shows: "Update VRS Time Wizard?"
- Click "Update" (or "Install")
- **DO NOT uninstall old app first!**

### Step 4: First Launch After Update
Watch for migration logs in console:
```
🔄 Initializing database...
✅ Database connection opened
✅ time_entries table created (already exists, skipped)
✅ line_codes table created (already exists, skipped)
✅ settings table created (already exists, skipped)
✅ work_notes table created (already exists, skipped)
🔄 Running database migrations...
📊 Current schema version: 1
📊 Found 1 pending migration(s)
🔄 Running migration v2.0: Add On-Call Schedule Tables
📊 Existing data counts:
   - time_entries: X (your actual count)
   - line_codes: 10
   - work_notes: Y (your actual count)
📊 Creating schema_version table...
📊 Creating on_call_users table...
📊 Creating on_call_schedule table...
✅ Existing data preserved
✅ Migration to v2.0 completed successfully
```

---

## ⚠️ What Could Go Wrong (and how to prevent)

### ❌ DON'T: Uninstall Old App First
```
1. Uninstall v1.1.0 ← DELETES ALL DATA
2. Install v1.2.0 ← FRESH DATABASE
Result: ALL YOUR HOURS/NOTES LOST ❌
```

### ✅ DO: Direct Update
```
1. Install v1.2.0 APK directly (over v1.1.0)
Result: DATA PRESERVED, MIGRATION RUNS ✅
```

### ❌ DON'T: Change Package ID
If package ID changes to something else:
```
Old: com.vrstimewizard.app
New: com.different.app ← Android sees as NEW APP
Result: Two separate apps, can't access old database
```

### ✅ DO: Keep Package ID Same
```
Old: com.vrstimewizard.app
New: com.vrstimewizard.app ← SAME
Result: Update recognized, data accessible
```

---

## 🧪 Verification Steps After Update

### 1. Check Version Number
Go to Settings/About screen:
```
Expected: v1.2.0
```

### 2. Verify Existing Data
- Open Timesheet tab
- Navigate to previous weeks
- **Verify hours are still there**
- **Verify notes are still accessible**

### 3. Check Migration Success
Look for new features:
- Debug screen should show schema version 2
- On-Call tab should appear (after Phase 2)

### 4. Test New Entry
- Add new hours
- Save and reload app
- Verify hours persist

---

## 🆘 Emergency Backup (Do This First!)

### Before Installing Update:

#### Option 1: Export from Current App
1. Open current v1.1.0 app
2. Go to Settings → Export Data
3. Save backup.json file
4. Transfer to computer/cloud storage

#### Option 2: Manual Database Backup (requires root/ADB)
```bash
# Using ADB (Android Debug Bridge)
adb backup -f backup.ab com.vrstimewizard.app
```

### If Something Goes Wrong:
1. Uninstall updated app (if needed)
2. Reinstall v1.1.0
3. Import backup.json
4. Report issue for investigation

---

## 📊 Database Schema Evolution

| Version | DB Schema | Tables | Description |
|---------|-----------|--------|-------------|
| 1.0.0 | v1 | 4 tables | Initial release |
| 1.1.0 | v1 | 4 tables | Added work notes feature |
| **1.2.0** | **v2** | **7 tables** | **Added on-call schedule (THIS UPDATE)** |

---

## 🔍 Advanced: Verify Migration Without Installing

If you want to test the migration on a test device first:

### Option 1: Fresh Install on Test Device
1. Build APK
2. Install on device without app installed
3. Migration creates all tables at once
4. Test thoroughly
5. Once confident, update your main device

### Option 2: Expo Go Testing
1. Scan QR code with Expo Go on test device
2. Check console logs for migration
3. Verify no errors
4. Then proceed with APK build

---

## ✅ Ready to Build Checklist

Before running `eas build`:

- [ ] Backup current app data (export.json)
- [ ] Verified app.json settings unchanged
- [ ] Tested migration on Expo Go
- [ ] Read this guide completely
- [ ] Understand: UPDATE = safe, UNINSTALL = data loss
- [ ] Phone has enough storage for update
- [ ] Have backup plan if something fails

---

## 📞 Support Notes

If migration fails or data appears lost:
1. **Don't panic** - Data is likely still in database
2. Check console logs for error messages
3. Report exact error message
4. Include schema version from logs
5. Use backup to restore if needed

**Remember: As long as you UPDATE (not uninstall/reinstall), your data will be safe!**
