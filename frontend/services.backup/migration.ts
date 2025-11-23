import { db } from './databaseWrapper';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || '';

export async function migrateDataFromBackend(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('🔄 Starting data migration from backend...');

    // Fetch all data from backend
    const response = await fetch(`${BACKEND_URL}/api/export`);
    
    if (!response.ok) {
      throw new Error(`Backend export failed: ${response.statusText}`);
    }

    const backendData = await response.json();
    
    console.log(`📦 Fetched ${backendData.time_entries?.length || 0} time entries`);
    console.log(`📦 Fetched ${backendData.line_codes?.length || 0} line codes`);
    console.log(`📦 Fetched ${backendData.settings?.length || 0} settings`);

    // Import data into local database
    await db.importData(backendData);

    console.log('✅ Migration completed successfully');
    
    return {
      success: true,
      message: `Migrated ${backendData.time_entries?.length || 0} time entries from server`,
    };
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return {
      success: false,
      message: `Migration failed: ${error.message}`,
    };
  }
}

export async function checkMigrationNeeded(): Promise<boolean> {
  try {
    // Check if local database has any time entries
    const entries = await db.getAllLines();
    
    // If we have default lines but no custom data, migration might be needed
    // This is a simple check - you might want to add more sophisticated logic
    return entries.length <= 10; // Only default lines exist
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
}
