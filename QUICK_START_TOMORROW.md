# Quick Start Guide for Next Session

## Read These Files First (15 min)

1. **`/app/SESSION_NOTES_NOV22_2025.md`** - Complete work log from today
2. **`/app/README.md`** - Updated project overview
3. This file - Quick reference

---

## What We Built Today (Summary)

### ✅ v1.2.0 Features Complete:
1. **Database Migration System** - Safe schema updates
2. **On-Call Schedule Tab** - Weekend view, user setup
3. **Google Sheets Sync** - Master schedule integration  
4. **Developer Menu** - Hidden admin config (tap version 5x)
5. **Unified Calendar** - History tab with toggle view
6. **Performance Fixes** - Buttons now work with haptics

---

## Test Before Starting (10 min)

### On Your Phone (Expo Go):
1. Force close Expo Go
2. Rescan QR code
3. Test these features:
   - ✅ On-Call tab shows weekends
   - ✅ Settings → Sync Schedule works
   - ✅ History → Calendar toggle works
   - ✅ Tap date in calendar → modal shows data
   - ✅ Timesheet buttons work
   - ✅ Developer menu (tap version 5x)

### If Something Broke:
- Check console logs for errors
- Read `/app/SESSION_NOTES_NOV22_2025.md` - Known Issues section
- Database might need reinitialization

---

## Priority Tasks for Next Session

### Option A: Build APK & Test Update
**Time:** 2-3 hours  
**Why:** Validate migration works in production  
**Steps:**
1. Review `/app/APK_UPDATE_GUIDE.md`
2. Build APK: `cd /app/frontend && eas build --platform android`
3. Install over v1.1.0 (don't uninstall first!)
4. Verify migration runs successfully
5. Test all features on APK

### Option B: Implement Shift Swaps
**Time:** 3-4 hours  
**Why:** Complete the on-call feature  
**Steps:**
1. Create swap modal UI
2. Add swap recording logic
3. Update weekend cards to show swaps
4. Test swap flow end-to-end

### Option C: Polish & Bug Fixes
**Time:** 2-3 hours  
**Why:** Improve stability before wider deployment  
**Steps:**
1. Test all features thoroughly
2. Fix any bugs found
3. Add loading states where missing
4. Improve error messages
5. Performance optimizations

---

## Key Information

### Database Schema Version: 2.0
```
v1.0 tables: time_entries, line_codes, settings, work_notes
v2.0 tables: schema_version, on_call_users, on_call_schedule
```

### App Version: 1.2.0
- versionCode: 3 (Android)
- Package: com.vrstimewizard.app

### Critical Files:
- `/app/frontend/services/migrations.ts` - Migration logic
- `/app/frontend/services/database.ts` - Database methods
- `/app/frontend/app/(tabs)/oncall.tsx` - On-call tab
- `/app/frontend/app/(tabs)/history.tsx` - Calendar view
- `/app/frontend/app/(tabs)/settings.tsx` - Sync + dev menu

### Dependencies Added:
- `react-native-calendars`
- `@react-native-async-storage/async-storage`

---

## Common Commands

```bash
# Restart Expo
sudo supervisorctl restart expo

# Check status
sudo supervisorctl status expo

# View logs
sudo supervisorctl tail -50 expo

# Add dependency
cd /app/frontend && yarn add <package>

# Build APK
cd /app/frontend && eas build --platform android --profile production
```

---

## Google Sheets Setup (For Reference)

### Boss Creates Schedule:
1. Google Sheets with columns: `start_date,end_date,user,notes`
2. File → Share → Publish to web → CSV format
3. Copy URL

### Admin Configures App:
1. Settings → Tap version 5x
2. Paste URL in Master Schedule URL
3. Tap Save URL

### Users Sync:
1. Settings → Sync Schedule
2. Done!

---

## Known Issues

### Fixed:
- ✅ Buttons not saving data
- ✅ Calendar modal empty
- ✅ Sync duplicating data
- ✅ Column name mismatch

### Current Limitations:
- Web preview doesn't save data (by design)
- Shift swaps UI exists but logic incomplete
- No auto-sync (manual only)
- No notifications

---

## Testing Checklist

Before continuing development:
- [ ] All tabs navigate correctly
- [ ] Timesheet buttons save hours
- [ ] On-call tab shows weekends
- [ ] Google Sheets sync works
- [ ] Calendar dots appear
- [ ] Day detail modal shows data
- [ ] Developer menu accessible
- [ ] No crashes on any action

---

## Questions to Answer Tomorrow

1. **Should we build APK first or add more features?**
2. **Priority: Shift swaps or polish/testing?**
3. **When does boss need the real schedule?**
4. **How many users will test initially?**
5. **Any bugs found in today's testing?**

---

## Communication with User

### What User Knows:
- Google Sheets sync works
- Developer menu exists (tap 5x)
- Calendar shows on-call weekends
- App is v1.2.0

### What User Doesn't Know Yet:
- How to build APK
- Update process details
- Shift swap feature incomplete
- Auto-sync not implemented

### Next Conversation Points:
- Test results from their side
- APK build when ready
- Real schedule timeline
- User rollout plan

---

## If You Get Stuck

### Database Issues:
- Check `/app/frontend/services/database.ts`
- Use `db.database.getAllAsync()` for custom queries
- Migration logs show in console

### UI Not Updating:
- Check state management
- Verify `useEffect` dependencies
- Force re-render with key prop

### Sync Not Working:
- Check URL format (must end with `export?format=csv`)
- Verify CSV has correct columns
- Check console for parse errors
- Test with `/app/test_oncall_schedule.csv`

### Modal Issues:
- Check height constraints
- Verify data is loading
- Add console.log in render
- Test on native device (not web)

---

## Success Criteria for Tomorrow

### Minimum:
- [ ] App still works after restart
- [ ] No regressions from today
- [ ] User can test successfully

### Good:
- [ ] One new feature completed
- [ ] All features tested
- [ ] Documentation updated

### Excellent:
- [ ] APK built and tested
- [ ] Update process verified
- [ ] Ready for wider rollout

---

## End of Quick Start

**Time to read:** 15 minutes  
**Time to test:** 10 minutes  
**Total prep time:** 25 minutes

After reading and testing, you'll be ready to continue development with full context!

**Good luck tomorrow! 🚀**
