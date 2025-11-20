# Button Performance Fix - November 20, 2025

## Issue Reported
- Buttons for hour input weren't working in Expo web preview
- Buttons were sluggish/unresponsive in standalone app

## Root Causes Identified

### 1. Web Preview Issue
The web preview uses a mock database (`database.web.ts`) that doesn't actually persist data. The `upsertEntry` function only logs a warning. This is **by design** - the app requires native SQLite which is only available on iOS/Android devices.

### 2. Standalone App Sluggishness
Multiple performance issues were affecting button responsiveness:
- No immediate tactile feedback
- Async database operations with no visual indication
- Risk of duplicate taps causing multiple database writes
- Small touch targets in complex nested ScrollViews
- No visual feedback when buttons were pressed

## Fixes Implemented

### 1. Haptic Feedback (Native Only)
```typescript
import * as Haptics from 'expo-haptics';

// Light haptic when button is pressed
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// Warning haptic for validation errors
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

// Success haptic after update
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
```

### 2. Debouncing to Prevent Duplicate Taps
```typescript
const processingRef = useRef<Set<string>>(new Set());

// Create unique key for each operation
const operationKey = `${workDate}-${lineCode}-${type}-inc`;

// Prevent duplicate taps
if (processingRef.current.has(operationKey)) return;
processingRef.current.add(operationKey);

// Remove from set after 300ms
setTimeout(() => {
  processingRef.current.delete(operationKey);
}, 300);
```

### 3. Visual Pressed States
```typescript
<Pressable 
  style={({ pressed }) => [
    styles.controlButton, 
    styles.plusButton,
    pressed && styles.buttonPressed  // Opacity 0.6 + scale 0.95
  ]}
>
```

### 4. Increased Touch Area
```typescript
<Pressable 
  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
>
```
This expands the touchable area by 8 pixels in all directions, making it easier to tap.

### 5. Better Disabled States
```typescript
// Visual feedback for disabled buttons
disabled={stHours === 0}
style={[
  styles.controlButton,
  stHours === 0 && styles.buttonDisabled  // Opacity 0.3
]}
```

### 6. Performance Optimization with useCallback
```typescript
const handleIncrement = useCallback(async (workDate, lineCode, type) => {
  // Handler logic
}, [getEntryHours, canIncrementST, canIncrementOT, updateEntry]);
```

## Expected Results

### Native App (iOS/Android via Expo Go or Standalone Build)
- ✅ Instant haptic feedback when tapping buttons
- ✅ Visual feedback (button scales down and becomes slightly transparent)
- ✅ Larger touch area makes buttons easier to tap
- ✅ Prevention of duplicate taps
- ✅ Smooth, responsive interactions

### Web Preview
- ⚠️ Buttons will still not save data (by design - requires native SQLite)
- ✅ Visual feedback will work
- ✅ Touch area improvements will work
- ℹ️ Haptics are silently ignored on web (no errors)

## Testing Instructions

1. **Test on Native Device (Recommended)**
   - Scan QR code with Expo Go
   - Navigate to Timesheet tab
   - Tap + and - buttons to adjust hours
   - Should feel immediate haptic feedback
   - Should see button scale/opacity change when pressed

2. **Test Rapid Tapping**
   - Rapidly tap a + button multiple times
   - Should not create duplicate entries
   - Should feel consistent haptic feedback

3. **Test Touch Areas**
   - Tap slightly outside the visible button boundary
   - Should still register the tap (8px hitSlop buffer)

## Files Modified
- `/app/frontend/app/(tabs)/timesheet.tsx`
  - Added `expo-haptics` import
  - Added `useCallback` import
  - Added `processingRef` for debouncing
  - Wrapped handlers in `useCallback`
  - Added haptic feedback to handlers
  - Added debouncing logic
  - Added `hitSlop` to all buttons
  - Added visual pressed states
  - Added new styles: `buttonPressed`, `buttonDisabled`, `buttonTextDisabled`

## Notes
- Haptic feedback only works on physical devices (iOS/Android)
- Web preview will continue to show mock data only
- For production use, always test on actual devices
- The 300ms debounce window prevents accidental double-taps while allowing rapid intentional taps
