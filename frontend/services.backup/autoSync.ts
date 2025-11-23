/**
 * Auto-Sync Service for On-Call Schedule
 * Automatically syncs schedule from Google Sheets when app opens
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './databaseWrapper';
import { DEFAULT_ONCALL_SCHEDULE_URL } from '../constants/config';

const LAST_SYNC_KEY = 'last_oncall_sync';
const AUTO_SYNC_ENABLED_KEY = 'auto_sync_enabled';
const SYNC_INTERVAL_DAYS = 7; // Sync once per week

interface SyncResult {
  success: boolean;
  newEntriesCount: number;
  userShiftsChanged: boolean;
  error?: string;
}

/**
 * Check if auto-sync is enabled
 */
export async function isAutoSyncEnabled(): Promise<boolean> {
  try {
    const enabled = await AsyncStorage.getItem(AUTO_SYNC_ENABLED_KEY);
    return enabled === 'true';
  } catch (error) {
    console.error('Error checking auto-sync status:', error);
    return true; // Default to enabled
  }
}

/**
 * Enable or disable auto-sync
 */
export async function setAutoSyncEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(AUTO_SYNC_ENABLED_KEY, enabled ? 'true' : 'false');
    console.log(`Auto-sync ${enabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    console.error('Error setting auto-sync status:', error);
  }
}

/**
 * Get last sync timestamp
 */
export async function getLastSyncTime(): Promise<Date | null> {
  try {
    const timestamp = await AsyncStorage.getItem(LAST_SYNC_KEY);
    return timestamp ? new Date(timestamp) : null;
  } catch (error) {
    console.error('Error getting last sync time:', error);
    return null;
  }
}

/**
 * Check if sync is needed (> 7 days since last sync)
 */
export async function isSyncNeeded(): Promise<boolean> {
  const lastSync = await getLastSyncTime();
  
  if (!lastSync) {
    console.log('⏰ No previous sync found, sync needed');
    return true;
  }
  
  const daysSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60 * 24);
  const needed = daysSinceSync >= SYNC_INTERVAL_DAYS;
  
  console.log(`⏰ Last sync: ${daysSinceSync.toFixed(1)} days ago, sync ${needed ? 'needed' : 'not needed'}`);
  return needed;
}

/**
 * Get user's current shifts before sync
 */
async function getUserShiftsBeforeSync(userName: string): Promise<string[]> {
  try {
    await db.initialize();
    
    const now = new Date();
    const futureDate = new Date(now.getFullYear() + 1, 11, 31); // End of next year
    
    const shifts = await db.getOnCallSchedule(
      now.toISOString().split('T')[0],
      futureDate.toISOString().split('T')[0]
    );
    
    const userShifts = shifts
      .filter((s: any) => s.user_name === userName)
      .map((s: any) => `${s.start_date}_${s.end_date}`);
    
    return userShifts;
  } catch (error) {
    console.error('Error getting user shifts:', error);
    return [];
  }
}

/**
 * Compare shifts to detect changes
 */
function shiftsChanged(before: string[], after: string[]): boolean {
  if (before.length !== after.length) return true;
  
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  
  // Check if any shift was added or removed
  for (const shift of before) {
    if (!afterSet.has(shift)) return true;
  }
  
  for (const shift of after) {
    if (!beforeSet.has(shift)) return true;
  }
  
  return false;
}

/**
 * Perform the actual sync
 */
async function performSync(): Promise<SyncResult> {
  try {
    console.log('🔄 Starting auto-sync...');
    
    await db.initialize();
    
    // Get current user
    const currentUser = await db.getCurrentUser();
    if (!currentUser) {
      console.log('⚠️ No current user found, skipping sync');
      return { success: false, newEntriesCount: 0, userShiftsChanged: false, error: 'No user configured' };
    }
    
    // Get sync URL (use custom URL if set, otherwise use default)
    let syncUrl = await AsyncStorage.getItem('oncall_schedule_url');
    if (!syncUrl || syncUrl.trim() === '') {
      syncUrl = DEFAULT_ONCALL_SCHEDULE_URL;
      console.log('📌 Using default master schedule URL');
    } else {
      console.log('📌 Using custom schedule URL from dev menu');
    }
    
    // Get user's shifts before sync
    const shiftsBefore = await getUserShiftsBeforeSync(currentUser.user_name);
    console.log(`📊 User has ${shiftsBefore.length} shifts before sync`);
    
    // Fetch CSV from URL
    console.log('📥 Fetching schedule from URL...');
    const response = await fetch(syncUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const csvText = await response.text();
    console.log('✅ CSV fetched successfully');
    
    // Parse CSV
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const scheduleData: any[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      if (row.start_date && row.end_date && row.user) {
        scheduleData.push({
          start_date: row.start_date,
          end_date: row.end_date,
          user: row.user,
          notes: row.notes || ''
        });
      }
    }
    
    console.log(`📅 Parsed ${scheduleData.length} schedule entries`);
    
    // Clear and import
    console.log('🗑️ Clearing existing schedule...');
    await db.clearOnCallSchedule();
    
    await db.importOnCallSchedule(scheduleData);
    
    // Extract and add unique users
    const uniqueUsers = [...new Set(scheduleData.map(s => s.user))];
    for (const user of uniqueUsers) {
      await db.addOnCallUser(user, false);
    }
    
    console.log('✅ Schedule imported successfully');
    
    // Get user's shifts after sync
    const shiftsAfter = await getUserShiftsBeforeSync(currentUser.user_name);
    console.log(`📊 User has ${shiftsAfter.length} shifts after sync`);
    
    const userShiftsChanged = shiftsChanged(shiftsBefore, shiftsAfter);
    
    if (userShiftsChanged) {
      console.log('⚠️ User\'s shifts have changed!');
    } else {
      console.log('✅ User\'s shifts unchanged');
    }
    
    // Update last sync time
    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    
    return {
      success: true,
      newEntriesCount: scheduleData.length,
      userShiftsChanged,
    };
    
  } catch (error: any) {
    console.error('❌ Auto-sync failed:', error);
    return {
      success: false,
      newEntriesCount: 0,
      userShiftsChanged: false,
      error: error.message,
    };
  }
}

/**
 * Show notification badge if user's shifts changed
 * Note: Badge notifications disabled in Expo Go. Will work in standalone builds.
 */
async function notifyUserShiftsChanged(): Promise<void> {
  // Badge notifications require a standalone build
  // This is a placeholder for future implementation
  console.log('📬 User shifts changed (badge notifications disabled in Expo Go)');
}

/**
 * Main auto-sync function to call on app open
 */
export async function checkAndSync(): Promise<SyncResult | null> {
  try {
    // Check if auto-sync is enabled
    const enabled = await isAutoSyncEnabled();
    if (!enabled) {
      console.log('⏸️ Auto-sync is disabled');
      return null;
    }
    
    // Check if sync is needed
    const needed = await isSyncNeeded();
    if (!needed) {
      console.log('⏸️ Sync not needed yet');
      return null;
    }
    
    // Perform sync
    console.log('🔄 Auto-sync triggered');
    const result = await performSync();
    
    // Show badge if user's shifts changed
    if (result.success && result.userShiftsChanged) {
      await notifyUserShiftsChanged();
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Auto-sync check failed:', error);
    return null;
  }
}

/**
 * Clear notification badge
 * Note: Badge notifications disabled in Expo Go. Will work in standalone builds.
 */
export async function clearSyncBadge(): Promise<void> {
  // Badge notifications require a standalone build
  console.log('✅ Badge cleared (disabled in Expo Go)');
}
