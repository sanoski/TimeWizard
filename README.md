# TimeWizard

A mobile timesheet app for tracking work hours offline. Built with React Native and Expo.

---

## Features

**Timesheet grid**
- Sunday to Saturday weekly layout
- Multiple line codes (VTR, GMRC, CLP, WACR, etc.)
- Straight time and overtime entry per day per line
- Sticky headers and line names when scrolling
- +/- buttons for quick hour entry

**Pay week tracking**
- Automatic pay period detection based on a configurable 14-day cycle
- Pay week badge shown in history view
- Dashboard shows 2-week totals during active pay weeks

**History and reporting**
- Browse past 8 weeks with expandable summaries
- Weekly breakdown by line and day
- Paper timesheet helper screen formatted for easy manual transcription

**Backup and restore**
- Export to timestamped JSON files
- Import from backup files
- Share via native share sheet

**Settings**
- Show/hide individual line codes
- Add and remove project lines
- Debug info screen for troubleshooting

**Fully offline** — all data stored locally with SQLite, no account or internet required

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Expo Go](https://expo.dev/go) on your phone

### Install and run

```bash
cd frontend
npm install
npx expo start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS).

> Note: SQLite is not supported in web preview. Use a physical device or simulator.

---

## Usage

**First launch**
1. A migration screen will appear on first open
2. Choose "Start Fresh" or "Migrate Data" if you have backend data from a previous version
3. The app opens to the Dashboard

**Adding hours**
1. Go to the Timesheet tab
2. Use the arrow buttons to navigate weeks
3. Tap + or - to adjust hours per day and line
4. Data saves automatically

**Backup**
- Settings > Export Backup to save a JSON file
- Settings > Import Backup to restore from a file

**Troubleshooting**
- Settings > Debug Information shows database contents and pay week diagnostics

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo (SDK 51) |
| Routing | Expo Router |
| UI | Tamagui |
| State | Zustand |
| Database | SQLite via expo-sqlite |
| Language | TypeScript |

---

## Known Limitations

- No cloud sync (planned for a future version)
- No PDF export — use the Paper Timesheet Helper screen for manual transcription
- Backend folder is reserved for a future cloud sync feature, not used currently

---

## Planned

- PDF generation for completed timesheets
- Cloud sync
- Configurable pay cycle settings in the UI
- Reminders and notifications
