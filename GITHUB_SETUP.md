# GitHub Repository Setup Guide

## Repository Structure

This project should be organized as a monorepo with clear separation between frontend and backend:

```
vrs-time-wizard/
├── README.md              # Main project README
├── NEXT_STEPS.md         # Critical next steps
├── ARCHITECTURE.md       # Technical architecture doc
├── LICENSE               # License file
├── .gitignore           # Git ignore rules
├── backend/             # FastAPI backend (DEPRECATED after offline conversion)
│   ├── README.md
│   ├── requirements.txt
│   ├── server.py
│   └── .env.example
├── frontend/            # Expo React Native app
│   ├── README.md
│   ├── app/
│   ├── store/
│   ├── services/       # Database services (TO BE ADDED)
│   ├── assets/
│   ├── package.json
│   ├── app.json
│   └── .env.example
├── docs/                # Additional documentation
│   ├── API.md          # API documentation
│   ├── DATABASE.md     # Database schema
│   ├── TESTING.md      # Testing guide
│   └── DEPLOYMENT.md   # Deployment instructions
└── assets/             # Shared assets (screenshots, etc.)
```

## .gitignore Configuration

Create `.gitignore` in project root:

```gitignore
# Environment files
.env
.env.local
*.env
!.env.example

# Database files
*.db
*.db-journal
*.sqlite
*.sqlite3

# Dependencies
node_modules/
__pycache__/
*.pyc
*.pyo
*.egg-info/
dist/
build/

# Expo
.expo/
.expo-shared/
dist/
web-build/

# Metro
.metro-health-check*
.metro-cache/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
*.log

# Testing
coverage/
.nyc_output/

# Temporary files
*.tmp
*.temp
.cache/

# Build outputs
*.apk
*.aab
*.ipa
```

## README.md for GitHub

The main README.md (already created in /app/README.md) should be in the root and include:

- Project overview with clear description
- Screenshots or demo video
- Current status and known issues
- Setup instructions
- Tech stack
- Contributing guidelines
- License information
- **Critical**: Clear warning about offline conversion requirement

## Branch Strategy

### Recommended Branches:

1. **main** - Production-ready code
2. **develop** - Development branch
3. **feature/offline-conversion** - Critical: Converting to expo-sqlite
4. **feature/grid-alignment** - Fine-tuning UI alignment
5. **feature/pdf-export** - Future: PDF export feature
6. **feature/paycheck-estimator** - Future: Paycheck calculations

### Workflow:
```bash
# Create feature branch from develop
git checkout develop
git checkout -b feature/offline-conversion

# Make changes, commit
git add .
git commit -m "feat: implement expo-sqlite for offline storage"

# Push and create PR
git push origin feature/offline-conversion
# Create Pull Request to develop

# After testing, merge develop to main
git checkout main
git merge develop
git push origin main
```

## Commit Message Convention

Use conventional commits:

```
feat: add expo-sqlite database service
fix: correct pay week calculation
docs: update offline conversion guide
style: improve grid cell alignment
refactor: move database logic to frontend
test: add offline functionality tests
chore: update dependencies
```

## Issues to Create on GitHub

### Critical Issues:

**Issue #1: Convert to Offline App (PRIORITY)**
```markdown
## 🚨 CRITICAL: Convert to Offline App

**Priority**: P0 - Blocking release

**Problem**: App currently requires backend server and internet connection.
Original spec required offline-first architecture.

**Tasks**:
- [ ] Install expo-sqlite
- [ ] Create database service layer
- [ ] Migrate all API calls to local SQLite
- [ ] Test offline functionality
- [ ] Remove backend dependency
- [ ] Update documentation

**Acceptance Criteria**:
- App works with no internet connection
- Data persists across app restarts
- All features functional offline

**Estimated Time**: 4-6 hours

**Blockers**: Must complete before app can be released as standalone
```

**Issue #2: Fine-Tune Grid Alignment**
```markdown
## UI: Grid Line Name Alignment

**Priority**: P1 - Important

**Problem**: Line names drift slightly out of alignment with data rows
as user scrolls down the timesheet grid.

**Root Cause**: PTO/HOLIDAY rows (60px) shorter than regular rows (100px)

**Proposed Solutions**:
1. Measure exact rendered heights and adjust fixed heights
2. Implement dynamic height measurement with onLayout

**Tasks**:
- [ ] Measure actual rendered row heights
- [ ] Adjust lineNameCell heights to match exactly
- [ ] Test on multiple screen sizes
- [ ] Verify alignment at top, middle, and bottom of list

**Acceptance Criteria**:
- Line names align perfectly with rows throughout scroll
- No drift or offset visible
- Works on different screen sizes
```

### Enhancement Issues:

**Issue #3: PDF Export Feature**
```markdown
## Feature: PDF Export

**Priority**: P2 - Future enhancement

**Description**: Export weekly timesheet as PDF matching official
paper form format.

**Requirements**:
- Load PDF template
- Fill in ST/OT values
- Include line codes and dates
- Match official VRS timesheet layout

**Libraries to Consider**:
- react-native-pdf
- expo-print
- pdf-lib

**Tasks**:
- [ ] Research PDF generation options
- [ ] Obtain official PDF template
- [ ] Implement PDF generation
- [ ] Test output format
- [ ] Add share/save functionality
```

**Issue #4: Paycheck Estimator**
```markdown
## Feature: Paycheck Estimator

**Priority**: P2 - Future enhancement

**Description**: Calculate estimated take-home pay for pay periods.

**Calculations Required**:
- Federal withholding
- Vermont state withholding
- Railroad Retirement Tier I & II (not Social Security)
- Union dues
- Healthcare deductions
- Retirement contributions

**Tasks**:
- [ ] Gather current tax rates and formulas
- [ ] Implement calculation module
- [ ] Add UI to dashboard for pay weeks
- [ ] Allow user to configure deduction amounts
- [ ] Show breakdown of deductions

**Note**: Calculations should be estimates only, not guaranteed amounts.
```

## Pull Request Template

Create `.github/pull_request_template.md`:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested on Android device
- [ ] Tested offline functionality (if applicable)
- [ ] Tested on different screen sizes
- [ ] All existing tests pass

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings introduced

## Screenshots (if applicable)
Add screenshots or screen recordings

## Related Issues
Closes #(issue number)
```

## Documentation to Include

### 1. ARCHITECTURE.md
```markdown
# Architecture Overview

## Current Architecture (v1.0.0)
[Diagram showing frontend → backend → SQLite]
**Status**: Requires offline conversion

## Target Architecture (v1.1.0)
[Diagram showing frontend with embedded SQLite]
**Goal**: True offline-first architecture

## Data Flow
## Component Structure
## State Management (Zustand)
## Database Schema
```

### 2. API.md
Document all current API endpoints (even though they'll be deprecated).
Useful reference when converting to local database calls.

### 3. DATABASE.md
Complete SQLite schema documentation with:
- Table definitions
- Relationships
- Indexes
- Sample queries
- Migration strategy

### 4. TESTING.md
```markdown
# Testing Guide

## Backend Testing
- Unit tests for API endpoints
- Integration tests for database operations

## Frontend Testing
- Component tests
- Integration tests
- E2E tests with Detox (future)

## Manual Testing Checklist
- Offline functionality
- Data persistence
- Cross-device compatibility
```

### 5. DEPLOYMENT.md
```markdown
# Deployment Guide

## Prerequisites
- EAS CLI installed
- Apple Developer account (for iOS)
- Google Play Developer account (for Android)

## Build Process
## Store Submission
## Over-the-Air Updates
```

## Release Strategy

### Version Numbering
Follow semantic versioning: MAJOR.MINOR.PATCH

- **v1.0.0**: Current state (requires backend)
- **v1.1.0**: After offline conversion (CRITICAL)
- **v1.2.0**: After grid alignment fixes
- **v2.0.0**: After PDF export + paycheck estimator

### Release Checklist

**Pre-Release:**
- [ ] All P0 issues closed
- [ ] Offline functionality tested
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped in app.json and package.json

**Release:**
- [ ] Tag release in git: `git tag v1.1.0`
- [ ] Build with EAS
- [ ] Test APK/IPA on devices
- [ ] Submit to stores (if applicable)

**Post-Release:**
- [ ] Monitor crash reports
- [ ] Collect user feedback
- [ ] Plan next version

## License

Add LICENSE file. Recommended for internal use:

```
Proprietary License

Copyright (c) 2025 VRS Railroad

This software is proprietary and confidential. Unauthorized copying,
transferring or reproduction of the contents of this software, via any
medium is strictly prohibited.

For internal VRS Railroad use only.
```

Or use open source license if applicable (MIT, Apache 2.0, etc.)

## README Badges

Add to top of README.md:

```markdown
![Status](https://img.shields.io/badge/status-mvp-yellow)
![Offline](https://img.shields.io/badge/offline-pending-red)
![Platform](https://img.shields.io/badge/platform-iOS%20|%20Android-blue)
![License](https://img.shields.io/badge/license-Proprietary-lightgrey)
```

## Contributing Guidelines

Create CONTRIBUTING.md:

```markdown
# Contributing to VRS Time Wizard

## Getting Started
1. Fork the repository
2. Clone your fork
3. Create a feature branch
4. Make your changes
5. Test thoroughly
6. Submit a pull request

## Code Style
- TypeScript for frontend
- ESLint/Prettier for formatting
- Python type hints for backend
- Follow existing patterns

## Testing Requirements
- Test on physical device
- Verify offline functionality
- Check multiple screen sizes

## Pull Request Process
1. Update documentation
2. Add tests if applicable
3. Update CHANGELOG.md
4. Request review from maintainers
```

## Maintenance Plan

### Weekly:
- Review open issues
- Respond to user feedback
- Monitor crash reports

### Monthly:
- Update dependencies
- Security patches
- Performance optimization review

### Quarterly:
- Major feature releases
- Comprehensive testing
- Documentation review

---

## Initial Git Commands

```bash
# Initialize repository
cd /app
git init

# Add all files
git add .

# Initial commit
git commit -m "feat: initial commit - VRS Time Wizard MVP

- Complete mobile timesheet app for railroad MOW crews
- Weekly grid with ST/OT tracking
- Pay week detection and calculations
- Dashboard, history, and settings screens
- Backend API with SQLite (to be deprecated)
- CRITICAL: Requires offline conversion before release

See NEXT_STEPS.md for critical offline conversion requirement."

# Add remote (replace with your GitHub repo URL)
git remote add origin https://github.com/yourusername/vrs-time-wizard.git

# Push to GitHub
git branch -M main
git push -u origin main

# Create develop branch
git checkout -b develop
git push -u origin develop

# Create feature branch for critical offline work
git checkout -b feature/offline-conversion
```

## GitHub Repository Settings

### Recommended Settings:

1. **Branch Protection**
   - Protect `main` branch
   - Require pull request reviews
   - Require status checks to pass

2. **Issue Labels**
   - `priority-p0`: Blocking release
   - `priority-p1`: Important
   - `priority-p2`: Enhancement
   - `bug`: Something isn't working
   - `feature`: New feature request
   - `documentation`: Documentation updates
   - `offline-conversion`: Related to offline functionality

3. **Project Board**
   - Create project board with columns:
     - To Do
     - In Progress
     - Review
     - Done
   - Add all issues to board

4. **Wiki**
   - Enable wiki for extended documentation
   - Add troubleshooting guides
   - Add FAQs

---

**Remember**: The most critical documentation is in NEXT_STEPS.md - the offline conversion MUST be completed before the app can be released as standalone.
