import * as SQLite from 'expo-sqlite';
import { format } from 'date-fns';

// Types matching backend schema
export interface TimeEntry {
  id?: number;
  work_date: string;
  line_code: string;
  st_hours: number;
  ot_hours: number;
  week_ending_date: string;
  is_pay_week: boolean;
}

export interface LineCode {
  id?: number;
  line_code: string;
  label: string;
  is_visible: boolean;
  is_project: boolean;
  sort_order: number;
}

export interface Settings {
  id?: number;
  key: string;
  value: string;
}

export interface WorkNote {
  id?: number;
  work_date: string;
  line_code: string;
  note_text: string;
  created_at?: string;
  updated_at?: string;
}

export interface WeeklySummary {
  week_ending_date: string;
  is_pay_week: boolean;
  total_st: number;
  total_ot: number;
  total_hours: number;
  lines_used: string[];
  line_totals: Record<string, { st: number; ot: number; total: number }>;
  daily_totals: Record<string, { st: number; ot: number; total: number }>;
}

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    // Return existing initialization promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }

    // Return immediately if already initialized
    if (this.isInitialized && this.db) {
      console.log('✅ Database already initialized');
      return;
    }

    // Create new initialization promise
    this.initPromise = this.doInitialize();
    
    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  private async doInitialize(): Promise<void> {
    try {
      console.log('🔄 Initializing database...');
      
      // Open or create database
      this.db = await SQLite.openDatabaseAsync('vrs_time_wizard.db');
      console.log('✅ Database connection opened');
      
      // Create base tables (if they don't exist)
      await this.createTables();
      
      // Initialize default data
      await this.initializeDefaultData();
      
      // Run database migrations to add new features
      await this.runMigrations();
      
      this.isInitialized = true;
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      this.db = null;
      this.isInitialized = false;
      throw error;
    }
  }

  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    try {
      console.log('🔄 Running database migrations...');
      const { runMigrations } = await import('./migrations');
      await runMigrations(this.db);
      console.log('✅ Migrations completed');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Create time_entries table
      await this.db.runAsync(`
        CREATE TABLE IF NOT EXISTS time_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          work_date TEXT NOT NULL,
          line_code TEXT NOT NULL,
          st_hours INTEGER DEFAULT 0,
          ot_hours INTEGER DEFAULT 0,
          week_ending_date TEXT NOT NULL,
          is_pay_week INTEGER DEFAULT 0,
          UNIQUE(work_date, line_code)
        )
      `);
      console.log('✅ time_entries table created');

      // Create line_codes table
      await this.db.runAsync(`
        CREATE TABLE IF NOT EXISTS line_codes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          line_code TEXT UNIQUE NOT NULL,
          label TEXT NOT NULL,
          is_visible INTEGER DEFAULT 1,
          is_project INTEGER DEFAULT 0,
          sort_order INTEGER DEFAULT 0
        )
      `);
      console.log('✅ line_codes table created');

      // Create settings table
      await this.db.runAsync(`
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT UNIQUE NOT NULL,
          value TEXT NOT NULL
        )
      `);
      console.log('✅ settings table created');

      // Create notes table
      await this.db.runAsync(`
        CREATE TABLE IF NOT EXISTS work_notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          work_date TEXT NOT NULL,
          line_code TEXT NOT NULL,
          note_text TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(work_date, line_code)
        )
      `);
      console.log('✅ work_notes table created');

      console.log('✅ All tables created');
    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    }
  }

  private async initializeDefaultData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Check if line codes already exist
    const existingLines = await this.db.getAllAsync('SELECT COUNT(*) as count FROM line_codes');
    if (existingLines[0].count > 0) {
      console.log('✅ Default data already exists');
      return;
    }

    // Insert default line codes in the correct order
    const defaultLines = [
      { line_code: 'VTR', label: 'VTR', sort_order: 1 },
      { line_code: 'GMRC', label: 'GMRC', sort_order: 2 },
      { line_code: 'CLP', label: 'CLP', sort_order: 3 },
      { line_code: 'WACR', label: 'WACR', sort_order: 4 },
      { line_code: 'WACR-CRD', label: 'WACR-CRD', sort_order: 5 },
      { line_code: 'NEGS', label: 'NEGS', sort_order: 6 },
      { line_code: 'NHC', label: 'NHC', sort_order: 7 },
      { line_code: 'NYOG', label: 'NYOG', sort_order: 8 },
      { line_code: 'PTO', label: 'PTO', sort_order: 9 },
      { line_code: 'HOLIDAY', label: 'HOLIDAY', sort_order: 10 },
    ];

    for (const line of defaultLines) {
      await this.db.runAsync(
        'INSERT INTO line_codes (line_code, label, is_visible, is_project, sort_order) VALUES (?, ?, 1, 0, ?)',
        [line.line_code, line.label, line.sort_order]
      );
    }

    // Insert default settings
    await this.db.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?)',
      ['base_pay_week_ending', '2025-11-29']
    );
    await this.db.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?)',
      ['pay_frequency_days', '14']
    );

    console.log('✅ Default data initialized');
  }

  // Week calculation functions
  getWeekEnding(workDate: string): string {
    const date = new Date(workDate + 'T00:00:00');
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Calculate days until Saturday
    // If today is Saturday (6), we want this Saturday (0 days)
    // If today is Sunday (0), we want next Saturday (6 days)
    let daysUntilSaturday;
    if (dayOfWeek === 6) {
      daysUntilSaturday = 0; // Already Saturday
    } else {
      daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
    }
    
    const saturday = new Date(date);
    saturday.setDate(date.getDate() + daysUntilSaturday);
    
    return format(saturday, 'yyyy-MM-dd');
  }

  async isPayWeek(weekEndingDate: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    const settings = await this.db.getAllAsync(
      'SELECT key, value FROM settings WHERE key IN (?, ?)',
      ['base_pay_week_ending', 'pay_frequency_days']
    );

    const basePayWeek = settings.find(s => s.key === 'base_pay_week_ending')?.value || '2025-11-29';
    const payFrequency = parseInt(settings.find(s => s.key === 'pay_frequency_days')?.value || '14');

    // Parse dates and use UTC to completely avoid timezone issues
    const [baseYear, baseMonth, baseDay] = basePayWeek.split('-').map(Number);
    const [checkYear, checkMonth, checkDay] = weekEndingDate.split('-').map(Number);
    
    // Use Date.UTC to get milliseconds in UTC, avoiding any local timezone or DST issues
    const baseMs = Date.UTC(baseYear, baseMonth - 1, baseDay);
    const checkMs = Date.UTC(checkYear, checkMonth - 1, checkDay);

    const daysDiff = Math.round((checkMs - baseMs) / (1000 * 60 * 60 * 24));
    const isPay = daysDiff % payFrequency === 0;
    
    // Debug logging
    console.log(`Pay week check: ${weekEndingDate}, base=${basePayWeek}, daysDiff=${daysDiff}, isPay=${isPay}`);
    
    return isPay;
  }

  // Time Entry Operations
  async upsertEntry(entry: TimeEntry): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const weekEnding = this.getWeekEnding(entry.work_date);
    const isPay = await this.isPayWeek(weekEnding);

    await this.db.runAsync(
      `INSERT INTO time_entries (work_date, line_code, st_hours, ot_hours, week_ending_date, is_pay_week)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(work_date, line_code) 
       DO UPDATE SET st_hours=?, ot_hours=?, week_ending_date=?, is_pay_week=?`,
      [
        entry.work_date,
        entry.line_code,
        entry.st_hours,
        entry.ot_hours,
        weekEnding,
        isPay ? 1 : 0,
        entry.st_hours,
        entry.ot_hours,
        weekEnding,
        isPay ? 1 : 0,
      ]
    );
  }

  async getEntriesByWeek(weekEnding: string): Promise<TimeEntry[]> {
    if (!this.db) throw new Error('Database not initialized');

    // First, let's see ALL entries to debug
    const allEntries = await this.db.getAllAsync(
      'SELECT work_date, line_code, week_ending_date FROM time_entries LIMIT 10'
    );
    console.log(`DEBUG: Sample of all entries in DB:`, allEntries);
    
    const entries = await this.db.getAllAsync(
      'SELECT * FROM time_entries WHERE week_ending_date = ? ORDER BY work_date, line_code',
      [weekEnding]
    );
    
    console.log(`getEntriesByWeek(${weekEnding}): found ${entries.length} entries`);

    return entries.map(e => ({
      id: e.id,
      work_date: e.work_date,
      line_code: e.line_code,
      st_hours: e.st_hours,
      ot_hours: e.ot_hours,
      week_ending_date: e.week_ending_date,
      is_pay_week: e.is_pay_week === 1,
    }));
  }

  async getWeeklySummary(weekEnding: string): Promise<WeeklySummary> {
    if (!this.db) throw new Error('Database not initialized');

    const entries = await this.getEntriesByWeek(weekEnding);
    console.log(`getWeeklySummary for ${weekEnding}: found ${entries.length} entries`);
    
    // Always recalculate pay week based on current settings, don't rely on stored value
    const isPay = await this.isPayWeek(weekEnding);

    let totalST = 0;
    let totalOT = 0;
    const linesUsed = new Set<string>();
    const lineTotals: Record<string, { st: number; ot: number; total: number }> = {};
    const dailyTotals: Record<string, { st: number; ot: number; total: number }> = {};

    for (const entry of entries) {
      totalST += entry.st_hours;
      totalOT += entry.ot_hours;
      linesUsed.add(entry.line_code);

      // Line totals
      if (!lineTotals[entry.line_code]) {
        lineTotals[entry.line_code] = { st: 0, ot: 0, total: 0 };
      }
      lineTotals[entry.line_code].st += entry.st_hours;
      lineTotals[entry.line_code].ot += entry.ot_hours;
      lineTotals[entry.line_code].total += entry.st_hours + entry.ot_hours;

      // Daily totals
      if (!dailyTotals[entry.work_date]) {
        dailyTotals[entry.work_date] = { st: 0, ot: 0, total: 0 };
      }
      dailyTotals[entry.work_date].st += entry.st_hours;
      dailyTotals[entry.work_date].ot += entry.ot_hours;
      dailyTotals[entry.work_date].total += entry.st_hours + entry.ot_hours;
    }

    return {
      week_ending_date: weekEnding,
      is_pay_week: isPay,
      total_st: totalST,
      total_ot: totalOT,
      total_hours: totalST + totalOT,
      lines_used: Array.from(linesUsed),
      line_totals: lineTotals,
      daily_totals: dailyTotals,
    };
  }

  // Line Code Operations
  async getAllLines(): Promise<LineCode[]> {
    if (!this.db) throw new Error('Database not initialized');

    const lines = await this.db.getAllAsync(
      'SELECT * FROM line_codes ORDER BY sort_order, line_code'
    );

    return lines.map(l => ({
      id: l.id,
      line_code: l.line_code,
      label: l.label,
      is_visible: l.is_visible === 1,
      is_project: l.is_project === 1,
      sort_order: l.sort_order,
    }));
  }

  async addProjectLine(projectNumber: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const lineCode = `PROJECT ${projectNumber}`;
    const maxOrder = await this.db.getAllAsync('SELECT MAX(sort_order) as max FROM line_codes');
    const nextOrder = (maxOrder[0]?.max || 10) + 1;

    await this.db.runAsync(
      'INSERT INTO line_codes (line_code, label, is_visible, is_project, sort_order) VALUES (?, ?, 1, 1, ?)',
      [lineCode, lineCode, nextOrder]
    );
  }

  async toggleLineVisibility(lineCode: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      'UPDATE line_codes SET is_visible = NOT is_visible WHERE line_code = ?',
      [lineCode]
    );
  }

  async deleteProjectLine(lineCode: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Only allow deletion of project lines
    const line = await this.db.getAllAsync(
      'SELECT is_project FROM line_codes WHERE line_code = ?',
      [lineCode]
    );

    if (line.length === 0 || line[0].is_project !== 1) {
      throw new Error('Can only delete project lines');
    }

    await this.db.runAsync('DELETE FROM line_codes WHERE line_code = ?', [lineCode]);
  }

  // Settings Operations
  async getSetting(key: string): Promise<string | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync(
      'SELECT value FROM settings WHERE key = ?',
      [key]
    );

    return result.length > 0 ? result[0].value : null;
  }

  async updateSetting(key: string, value: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=?',
      [key, value, value]
    );
  }

  // Export all data
  async exportData(): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');

    const entries = await this.db.getAllAsync('SELECT * FROM time_entries');
    const lines = await this.db.getAllAsync('SELECT * FROM line_codes');
    const settings = await this.db.getAllAsync('SELECT * FROM settings');

    return {
      export_date: new Date().toISOString(),
      time_entries: entries,
      line_codes: lines,
      settings: settings,
    };
  }

  // Import data
  async importData(data: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Clear existing data
    await this.db.runAsync('DELETE FROM time_entries');
    await this.db.runAsync('DELETE FROM line_codes');
    await this.db.runAsync('DELETE FROM settings');

    // Import time entries
    for (const entry of data.time_entries || []) {
      await this.db.runAsync(
        'INSERT INTO time_entries (work_date, line_code, st_hours, ot_hours, week_ending_date, is_pay_week) VALUES (?, ?, ?, ?, ?, ?)',
        [entry.work_date, entry.line_code, entry.st_hours, entry.ot_hours, entry.week_ending_date, entry.is_pay_week]
      );
    }

    // Import line codes
    for (const line of data.line_codes || []) {
      await this.db.runAsync(
        'INSERT INTO line_codes (line_code, label, is_visible, is_project, sort_order) VALUES (?, ?, ?, ?, ?)',
        [line.line_code, line.label, line.is_visible, line.is_project, line.sort_order]
      );
    }

    // Import settings
    for (const setting of data.settings || []) {
      await this.db.runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?)',
        [setting.key, setting.value]
      );
    }

    console.log('✅ Data imported successfully');
  }

  // ===== NOTES METHODS =====

  async saveNote(workDate: string, lineCode: string, noteText: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    await this.db.runAsync(
      `INSERT INTO work_notes (work_date, line_code, note_text, updated_at) 
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(work_date, line_code) 
       DO UPDATE SET note_text = ?, updated_at = CURRENT_TIMESTAMP`,
      [workDate, lineCode, noteText, noteText]
    );
  }

  async getNote(workDate: string, lineCode: string): Promise<WorkNote | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    const result = await this.db.getAllAsync(
      'SELECT * FROM work_notes WHERE work_date = ? AND line_code = ?',
      [workDate, lineCode]
    );
    
    return result.length > 0 ? result[0] as WorkNote : null;
  }

  async getNotesByDate(workDate: string): Promise<WorkNote[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const results = await this.db.getAllAsync(
      'SELECT * FROM work_notes WHERE work_date = ? ORDER BY line_code',
      [workDate]
    );
    
    return results as WorkNote[];
  }

  async getNotesByWeek(weekEnding: string): Promise<WorkNote[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    // Calculate week start (Sunday, 6 days before Saturday)
    const weekEnd = new Date(weekEnding + 'T00:00:00');
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);
    
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    
    const results = await this.db.getAllAsync(
      'SELECT * FROM work_notes WHERE work_date >= ? AND work_date <= ? ORDER BY work_date, line_code',
      [weekStartStr, weekEnding]
    );
    
    return results as WorkNote[];
  }

  async deleteNote(workDate: string, lineCode: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    await this.db.runAsync(
      'DELETE FROM work_notes WHERE work_date = ? AND line_code = ?',
      [workDate, lineCode]
    );
  }

  async hasNote(workDate: string, lineCode: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');
    
    const result = await this.db.getAllAsync(
      'SELECT COUNT(*) as count FROM work_notes WHERE work_date = ? AND line_code = ?',
      [workDate, lineCode]
    );
    
    return result[0].count > 0;
  }

  // Expose database instance for direct queries (use with caution)
  get database() {
    if (!this.db) throw new Error('Database not initialized');
    return this.db;
  }

  // ===== ON-CALL USER METHODS =====

  async getAllOnCallUsers(): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const results = await this.db.getAllAsync(
      'SELECT * FROM on_call_users ORDER BY user_name'
    );
    
    return results;
  }

  async getCurrentUser(): Promise<any | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    const results = await this.db.getAllAsync(
      'SELECT * FROM on_call_users WHERE is_current_user = 1 LIMIT 1'
    );
    
    return results.length > 0 ? results[0] : null;
  }

  async setCurrentUser(userName: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    // Clear any existing current user
    await this.db.runAsync('UPDATE on_call_users SET is_current_user = 0');
    
    // Set new current user
    await this.db.runAsync(
      'UPDATE on_call_users SET is_current_user = 1 WHERE user_name = ?',
      [userName]
    );
  }

  async addOnCallUser(userName: string, isCurrentUser: boolean = false): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    await this.db.runAsync(
      'INSERT OR IGNORE INTO on_call_users (user_name, is_current_user) VALUES (?, ?)',
      [userName, isCurrentUser ? 1 : 0]
    );
  }

  async importOnCallUsers(users: string[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    for (const userName of users) {
      await this.addOnCallUser(userName, false);
    }
  }

  // ===== ON-CALL SCHEDULE METHODS =====

  async getOnCallSchedule(startDate: string, endDate: string): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    // Get all entries where the weekend overlaps with the date range
    const results = await this.db.getAllAsync(
      'SELECT * FROM on_call_schedule WHERE start_date >= ? AND start_date <= ? ORDER BY start_date, user_name',
      [startDate, endDate]
    );
    
    return results;
  }

  async getOnCallForDate(date: string): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    // Get all entries where date falls within start_date and end_date range
    const results = await this.db.getAllAsync(
      'SELECT * FROM on_call_schedule WHERE start_date <= ? AND end_date >= ? ORDER BY user_name',
      [date, date]
    );
    
    return results;
  }
  
  async getOnCallForWeekend(startDate: string, endDate: string): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    // Get all people on-call for specific weekend (typically 2 people)
    const results = await this.db.getAllAsync(
      'SELECT * FROM on_call_schedule WHERE start_date = ? AND end_date = ? ORDER BY user_name',
      [startDate, endDate]
    );
    
    return results;
  }

  async getMyOnCallDays(startDate: string, endDate: string): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const currentUser = await this.getCurrentUser();
    if (!currentUser) {
      return [];
    }
    
    const results = await this.db.getAllAsync(
      'SELECT * FROM on_call_schedule WHERE user_name = ? AND schedule_date >= ? AND schedule_date <= ? ORDER BY schedule_date',
      [currentUser.user_name, startDate, endDate]
    );
    
    return results;
  }

  async addOnCallSchedule(startDate: string, endDate: string, userName: string, notes: string = ''): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    await this.db.runAsync(
      `INSERT INTO on_call_schedule (start_date, end_date, user_name, notes)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(start_date, end_date, user_name)
       DO UPDATE SET notes = ?, updated_at = CURRENT_TIMESTAMP`,
      [startDate, endDate, userName, notes, notes]
    );
  }

  async swapOnCallShift(startDate: string, endDate: string, originalUser: string, newUser: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    // Mark as swapped and record original user
    await this.db.runAsync(
      `UPDATE on_call_schedule 
       SET user_name = ?, is_swapped = 1, original_user_name = ?, updated_at = CURRENT_TIMESTAMP
       WHERE start_date = ? AND end_date = ? AND user_name = ?`,
      [newUser, originalUser, startDate, endDate, originalUser]
    );
  }

  async importOnCallSchedule(scheduleData: Array<{ start_date: string; end_date: string; user: string; notes?: string }>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    console.log(`📅 Importing ${scheduleData.length} on-call schedule entries...`);
    
    for (const entry of scheduleData) {
      await this.addOnCallSchedule(
        entry.start_date,
        entry.end_date,
        entry.user,
        entry.notes || ''
      );
    }
    
    console.log('✅ On-call schedule imported successfully');
  }

  async clearOnCallSchedule(startDate?: string, endDate?: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    if (startDate && endDate) {
      await this.db.runAsync(
        'DELETE FROM on_call_schedule WHERE schedule_date >= ? AND schedule_date <= ?',
        [startDate, endDate]
      );
    } else {
      await this.db.runAsync('DELETE FROM on_call_schedule');
    }
  }
}

// Export singleton instance
export const db = new DatabaseService();
