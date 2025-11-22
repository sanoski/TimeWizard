/**
 * Database Migration System for VRS Time Wizard
 * 
 * CRITICAL: This file handles database schema changes without losing user data
 * All migrations must be thoroughly tested before deployment
 */

import * as SQLite from 'expo-sqlite';

export interface Migration {
  version: number;
  name: string;
  up: (db: SQLite.SQLiteDatabase) => Promise<void>;
  down: (db: SQLite.SQLiteDatabase) => Promise<void>;
}

/**
 * Get current schema version from database
 */
export async function getCurrentVersion(db: SQLite.SQLiteDatabase): Promise<number> {
  try {
    // Check if schema_version table exists
    const tables = await db.getAllAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'"
    );
    
    if (tables.length === 0) {
      // No version table = version 1.0 (initial schema)
      console.log('📊 No schema_version table found, assuming v1.0');
      return 1;
    }
    
    // Get current version
    const result = await db.getAllAsync('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1');
    const version = result.length > 0 ? result[0].version : 1;
    console.log(`📊 Current schema version: ${version}`);
    return version;
  } catch (error) {
    console.error('❌ Error getting schema version:', error);
    return 1; // Default to version 1 on error
  }
}

/**
 * Set schema version in database
 */
async function setVersion(db: SQLite.SQLiteDatabase, version: number, name: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO schema_version (version, name, applied_at) VALUES (?, ?, ?)',
    [version, name, new Date().toISOString()]
  );
  console.log(`✅ Schema version set to ${version}: ${name}`);
}

/**
 * Validate that a table exists and has expected structure
 */
async function validateTable(db: SQLite.SQLiteDatabase, tableName: string, expectedColumns: string[]): Promise<boolean> {
  try {
    const tableInfo = await db.getAllAsync(`PRAGMA table_info(${tableName})`);
    const actualColumns = tableInfo.map((col: any) => col.name);
    
    const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.warn(`⚠️ Table ${tableName} missing columns:`, missingColumns);
      return false;
    }
    
    console.log(`✅ Table ${tableName} validated`);
    return true;
  } catch (error) {
    console.error(`❌ Error validating table ${tableName}:`, error);
    return false;
  }
}

/**
 * Count rows in a table (for data preservation verification)
 */
async function countRows(db: SQLite.SQLiteDatabase, tableName: string): Promise<number> {
  try {
    const result = await db.getAllAsync(`SELECT COUNT(*) as count FROM ${tableName}`);
    return result[0].count;
  } catch (error) {
    console.error(`❌ Error counting rows in ${tableName}:`, error);
    return 0;
  }
}

// ============================================================================
// MIGRATION: v1.0 to v2.0 - Add On-Call Schedule Feature
// ============================================================================

const migration_v2: Migration = {
  version: 2,
  name: 'Add On-Call Schedule Tables',
  
  up: async (db: SQLite.SQLiteDatabase) => {
    console.log('🔄 Starting migration to v2.0: On-Call Schedule');
    
    // ========================================================================
    // STEP 1: Verify existing data integrity
    // ========================================================================
    console.log('📊 Step 1: Verifying existing data...');
    const timeEntriesCount = await countRows(db, 'time_entries');
    const lineCodesCount = await countRows(db, 'line_codes');
    const workNotesCount = await countRows(db, 'work_notes');
    
    console.log(`📊 Existing data counts:`);
    console.log(`   - time_entries: ${timeEntriesCount}`);
    console.log(`   - line_codes: ${lineCodesCount}`);
    console.log(`   - work_notes: ${workNotesCount}`);
    
    // ========================================================================
    // STEP 2: Create schema_version table if it doesn't exist
    // ========================================================================
    console.log('📊 Step 2: Creating schema_version table...');
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS schema_version (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER NOT NULL,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      )
    `);
    
    // If this is the first migration, record v1.0
    const versionCount = await countRows(db, 'schema_version');
    if (versionCount === 0) {
      await db.runAsync(
        'INSERT INTO schema_version (version, name, applied_at) VALUES (?, ?, ?)',
        [1, 'Initial Schema', new Date().toISOString()]
      );
      console.log('✅ Recorded initial schema version (v1.0)');
    }
    
    // ========================================================================
    // STEP 3: Create on_call_users table
    // ========================================================================
    console.log('📊 Step 3: Creating on_call_users table...');
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS on_call_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_name TEXT UNIQUE NOT NULL,
        is_current_user INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ on_call_users table created');
    
    // ========================================================================
    // STEP 4: Create on_call_schedule table
    // ========================================================================
    console.log('📊 Step 4: Creating on_call_schedule table...');
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS on_call_schedule (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        user_name TEXT NOT NULL,
        location TEXT NOT NULL,
        notes TEXT,
        is_swapped INTEGER DEFAULT 0,
        original_user_name TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(start_date, end_date, user_name, location)
      )
    `);
    console.log('✅ on_call_schedule table created');
    
    // ========================================================================
    // STEP 5: Validate all new tables
    // ========================================================================
    console.log('📊 Step 5: Validating new tables...');
    const usersValid = await validateTable(db, 'on_call_users', ['id', 'user_name', 'is_current_user']);
    const scheduleValid = await validateTable(db, 'on_call_schedule', ['id', 'schedule_date', 'user_name', 'shift_type']);
    
    if (!usersValid || !scheduleValid) {
      throw new Error('New table validation failed');
    }
    
    // ========================================================================
    // STEP 6: Verify existing data was NOT affected
    // ========================================================================
    console.log('📊 Step 6: Verifying existing data preservation...');
    const timeEntriesAfter = await countRows(db, 'time_entries');
    const lineCodesAfter = await countRows(db, 'line_codes');
    const workNotesAfter = await countRows(db, 'work_notes');
    
    if (timeEntriesAfter !== timeEntriesCount ||
        lineCodesAfter !== lineCodesCount ||
        workNotesAfter !== workNotesCount) {
      throw new Error('CRITICAL: Existing data was modified during migration!');
    }
    
    console.log('✅ Existing data preserved:');
    console.log(`   - time_entries: ${timeEntriesAfter} (unchanged)`);
    console.log(`   - line_codes: ${lineCodesAfter} (unchanged)`);
    console.log(`   - work_notes: ${workNotesAfter} (unchanged)`);
    
    // ========================================================================
    // STEP 7: Record migration completion
    // ========================================================================
    await setVersion(db, 2, 'Add On-Call Schedule Tables');
    console.log('✅ Migration to v2.0 completed successfully');
  },
  
  down: async (db: SQLite.SQLiteDatabase) => {
    console.log('🔄 Rolling back migration v2.0...');
    
    // Verify existing data before rollback
    const timeEntriesCount = await countRows(db, 'time_entries');
    const lineCodesCount = await countRows(db, 'line_codes');
    const workNotesCount = await countRows(db, 'work_notes');
    
    // Drop new tables
    await db.runAsync('DROP TABLE IF EXISTS on_call_schedule');
    await db.runAsync('DROP TABLE IF EXISTS on_call_users');
    
    // Verify existing data still intact
    const timeEntriesAfter = await countRows(db, 'time_entries');
    const lineCodesAfter = await countRows(db, 'line_codes');
    const workNotesAfter = await countRows(db, 'work_notes');
    
    if (timeEntriesAfter !== timeEntriesCount ||
        lineCodesAfter !== lineCodesCount ||
        workNotesAfter !== workNotesCount) {
      throw new Error('CRITICAL: Data lost during rollback!');
    }
    
    // Remove version record
    await db.runAsync('DELETE FROM schema_version WHERE version = 2');
    
    console.log('✅ Rollback completed, v2.0 tables removed');
  }
};

// ============================================================================
// All Migrations Registry
// ============================================================================

export const migrations: Migration[] = [
  migration_v2,
  // Future migrations will be added here
];

/**
 * Run all pending migrations
 */
export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    console.log('🔄 Checking for pending migrations...');
    
    const currentVersion = await getCurrentVersion(db);
    const pendingMigrations = migrations.filter(m => m.version > currentVersion);
    
    if (pendingMigrations.length === 0) {
      console.log('✅ Database is up to date');
      return;
    }
    
    console.log(`📊 Found ${pendingMigrations.length} pending migration(s)`);
    
    // Sort migrations by version
    pendingMigrations.sort((a, b) => a.version - b.version);
    
    // Run each migration in order
    for (const migration of pendingMigrations) {
      console.log(`\n🔄 Running migration v${migration.version}: ${migration.name}`);
      
      try {
        await migration.up(db);
        console.log(`✅ Migration v${migration.version} completed\n`);
      } catch (error) {
        console.error(`❌ Migration v${migration.version} failed:`, error);
        throw new Error(`Migration v${migration.version} failed: ${error}`);
      }
    }
    
    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration process failed:', error);
    throw error;
  }
}

/**
 * Rollback to a specific version
 */
export async function rollbackTo(db: SQLite.SQLiteDatabase, targetVersion: number): Promise<void> {
  try {
    console.log(`🔄 Rolling back to version ${targetVersion}...`);
    
    const currentVersion = await getCurrentVersion(db);
    
    if (targetVersion >= currentVersion) {
      console.log('✅ Already at or below target version');
      return;
    }
    
    // Get migrations to rollback (in reverse order)
    const migrationsToRollback = migrations
      .filter(m => m.version > targetVersion && m.version <= currentVersion)
      .sort((a, b) => b.version - a.version); // Descending order
    
    for (const migration of migrationsToRollback) {
      console.log(`🔄 Rolling back v${migration.version}: ${migration.name}`);
      await migration.down(db);
      console.log(`✅ Rollback v${migration.version} completed`);
    }
    
    console.log(`✅ Rolled back to version ${targetVersion}`);
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}
