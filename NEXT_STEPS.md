# VRS Time Wizard - Next Steps & Future Roadmap

## ⚠️ CRITICAL: Database Preservation Notice

**USER HAS V1.1.0 IN PRODUCTION WITH REAL DATA**

When implementing v1.2.0 (On-Call Schedule feature):
- **DO NOT drop or reset existing tables**
- **DO NOT wipe user's production data**
- Use proper database migration strategy (see SESSION_NOTES_NOV19_2025.md)
- Test upgrade path: v1.1.0 → v1.2.0 thoroughly
- Preserve: time_entries, line_codes, work_notes, settings

**See `/app/SESSION_NOTES_NOV19_2025.md` for complete details**

---

## ✅ Current Status: v1.1.0 in Production (Offline-First + Notes)

The app has been successfully refactored to an offline-first architecture with notes feature added. All core functionality is complete and tested on physical devices. **User is actively using this version.**

### Completed Phases
- ✅ **Phase 1**: Local SQLite database setup
- ✅ **Phase 2**: Business logic migration from backend to frontend
- ✅ **Phase 3**: One-time data migration system
- ✅ **Phase 4**: Export/import backup functionality
- ✅ **Phase 5**: Notes feature (v1.1.0) - Weekly notes with tabs
- ✅ **Bug Fixes**: Pay week calculation, grid alignment, data consistency, timezone bugs

### What Works Now (v1.1.0)
- 100% offline functionality
- Local data storage with expo-sqlite
- Week navigation and hour entry
- Pay week detection (timezone-safe)
- History with auto-refresh
- Backup/restore via JSON files
- Debug information screen
- **Weekly notes with day tabs**
- **Context-aware notes per line/day**
- **Notes in weekly summary**

## 🚀 Future Enhancements

### Priority 1: User Experience Improvements

#### PDF Generation 📄
**Goal**: Generate PDF timesheets from data

**Implementation**:
```bash
# Install dependencies
npm install react-native-pdf-lib
# or
npm install expo-print
```

**Features**:
- Generate PDF matching paper timesheet format
- Include all weekly data
- Add signature lines
- Share via email or save to device

**Estimated Effort**: 2-3 days

#### Enhanced Validation Messages 🚨
**Goal**: Better user feedback for constraint violations

**Current**: Basic Alert dialogs  
**Proposed**: 
- Toast notifications
- Inline validation messages
- Visual indicators on form fields
- Suggested corrections

**Estimated Effort**: 1 day

#### Undo/Redo for Hour Entries ↩️
**Goal**: Allow users to undo accidental changes

**Implementation**:
- Add action history stack in Zustand
- Undo/Redo buttons in UI
- Keyboard shortcuts (optional)

**Estimated Effort**: 2 days

### Priority 2: Advanced Features

#### Cloud Sync 🔄
**Goal**: Optional multi-device synchronization

**Architecture**:
```
Device 1          Backend          Device 2
   |                 |                |
   |-- Push changes->|                |
   |                 |<--Pull changes-|
   |                 |                |
```

**Implementation**:
- Use existing FastAPI backend
- Add sync timestamps to database
- Conflict resolution strategy
- Background sync service
- Offline queue for pending changes

**Key Decisions**:
- Sync frequency (manual, automatic, scheduled)
- Conflict resolution (last-write-wins, merge, user choice)
- Authentication mechanism

**Estimated Effort**: 1-2 weeks

#### Multi-User Support 👥
**Goal**: Team/supervisor features

**Features**:
- User accounts and authentication
- Supervisor dashboard
- Bulk timesheet review
- Approval workflow
- Team reports

**Backend Changes**:
- User table with roles
- Multi-tenant data isolation
- Approval status tracking

**Estimated Effort**: 2-3 weeks

### Priority 3: Quality of Life

#### Search/Filter in History 🔍
**Current**: Shows last 8 weeks  
**Proposed**:
- Search by date range
- Filter by line code
- Search by hours (show weeks over X hours)
- Export filtered results

**Estimated Effort**: 3-4 days

#### Configurable Pay Settings ⚙️
**Current**: Hardcoded in database  
**Proposed**:
- UI to change base pay week date
- UI to change pay frequency
- Recalculate all weeks when changed
- Warning about impacts

**Implementation**:
- Add settings screen section
- Date picker for base date
- Dropdown for frequency (7, 14, 30 days)
- Confirmation dialog

**Estimated Effort**: 2 days

#### Time Entry Notes/Comments 📝
**Goal**: Add context to hour entries

**Schema Changes**:
```sql
ALTER TABLE time_entries ADD COLUMN notes TEXT;
```

**UI Changes**:
- Note icon on entries with comments
- Modal or expandable view for notes
- Character limit (e.g., 500 chars)

**Estimated Effort**: 2 days

#### Photo Attachments 📸
**Goal**: Attach photos to time entries

**Implementation**:
- expo-image-picker for photo selection
- Store as base64 or file references
- Thumbnail view in grid
- Full-size modal view

**Considerations**:
- Database size impact
- Export/import handling

**Estimated Effort**: 4-5 days

### Priority 4: Analytics & Reporting

#### Advanced Reports 📊
- Monthly summaries
- Year-to-date totals
- Line code usage analytics
- OT trends
- Comparison charts

**Tools**: react-native-chart-kit or Victory Native

**Estimated Effort**: 1 week

#### Export Formats 📤
**Current**: JSON  
**Additional**:
- CSV for Excel
- PDF reports
- Email integration

**Estimated Effort**: 3 days

### Priority 5: Platform Enhancements

#### Standalone Builds 📱
**Goal**: Installable apps (not just Expo Go)

**Process**:
```bash
# EAS Build
eas build --platform android
eas build --platform ios
```

**Benefits**:
- Faster startup
- Better performance
- App store distribution
- Custom splash screen
- No Expo Go dependency

**Estimated Effort**: 2-3 days (setup & testing)

#### Push Notifications 🔔
**Use Cases**:
- Reminder to submit timesheet
- Pay week alerts
- Supervisor approvals (if multi-user)

**Implementation**:
- expo-notifications
- Backend notification service
- User preferences

**Estimated Effort**: 4-5 days

## 🛠️ Technical Debt

### Code Quality
- [ ] Add TypeScript strict mode
- [ ] Improve error handling
- [ ] Add unit tests (Jest)
- [ ] Add E2E tests (Detox)
- [ ] Refactor large components
- [ ] Extract reusable hooks

### Performance
- [ ] Optimize timesheet grid rendering
- [ ] Add database indexes
- [ ] Implement virtual scrolling for large lists
- [ ] Profile and optimize re-renders

### Documentation
- [x] README with setup instructions
- [x] Architecture documentation
- [x] Changelog
- [x] GitHub summary
- [ ] API documentation (if backend used)
- [ ] User manual/help screens

## 📋 Decision Log

### Architecture Decisions

**Q: Why expo-sqlite instead of Realm or WatermelonDB?**  
A: expo-sqlite is native to Expo, simpler for this use case, and sufficient for the data volume.

**Q: Why Zustand instead of Redux?**  
A: Lighter weight, simpler API, less boilerplate, sufficient for app complexity.

**Q: Why keep the backend?**  
A: Reserved for future cloud sync, multi-user features, and supervisor portal.

### Design Decisions

**Q: Why top tabs instead of bottom tabs?**  
A: Bottom tabs conflicted with Android system navigation buttons. Top tabs work better.

**Q: Why sticky headers in timesheet?**  
A: Users get lost scrolling large grids. Sticky headers maintain context.

**Q: Why Paper Timesheet Helper?**  
A: Users still need to manually fill paper forms. This format makes transcription easy.

## 🐛 Known Issues

### Non-Critical
1. Web preview has mock data only (SQLite not supported)
2. One-time migration cannot be re-run without reinstall
3. No undo for accidental deletions
4. No bulk operations (e.g., copy week)

### Future Monitoring
- Database size growth over time
- Performance with 100+ weeks of data
- Battery usage
- Memory leaks

## 📚 Resources for Future Work

### Expo Documentation
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)

### Libraries to Consider
- **Charts**: victory-native, react-native-chart-kit
- **PDF**: expo-print, react-native-pdf-lib
- **Auth**: expo-auth-session, Firebase Auth
- **Forms**: react-hook-form
- **Testing**: Jest, Detox

### Backend (Optional Sync)
- FastAPI documentation
- SQLAlchemy (if switching from raw SQL)
- Authentication: JWT, OAuth
- Real-time sync: WebSockets, Server-Sent Events

## 🎯 Milestones

### Milestone 1: Enhanced UX (2-3 weeks)
- PDF generation
- Undo/redo
- Search/filter
- Better validation

### Milestone 2: Cloud Sync (3-4 weeks)
- Backend sync implementation
- Conflict resolution
- Offline queue
- Multi-device testing

### Milestone 3: Multi-User (4-6 weeks)
- User accounts
- Supervisor portal
- Approval workflow
- Team reports

### Milestone 4: Production Release (1-2 weeks)
- Standalone builds
- App store submission
- User documentation
- Training materials

## 📝 Contributing

When adding features:
1. Update this document with new items
2. Document decisions in Decision Log
3. Add tests for new functionality
4. Update CHANGELOG.md
5. Test on physical devices

## 🎓 Learning Resources

For new developers:
- Review ARCHITECTURE.md for technical details
- Check CHANGELOG.md for recent changes
- Use Debug Information screen to inspect data
- Test changes on physical device (not web preview)

---

**Status**: ✅ Production Ready (Offline Mode)  
**Last Updated**: November 17, 2024  
**Next Review**: After first production deployment
