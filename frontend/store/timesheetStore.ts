import { create } from 'zustand';
import { db } from '../services/databaseWrapper';
import { format, addDays } from 'date-fns';

interface TimeEntry {
  id?: number;
  work_date: string;
  week_ending_date: string;
  line_code: string;
  st_hours: number;
  ot_hours: number;
  is_pay_week: boolean;
}

interface LineCode {
  line_code: string;
  label: string;
  is_project: boolean;
  is_visible: boolean;
  sort_order: number;
}

interface WeekInfo {
  week_ending_date: string;
  is_pay_week: boolean;
  week_start: string;
  week_end: string;
}

interface WeeklySummary {
  week_ending_date: string;
  is_pay_week: boolean;
  total_st: number;
  total_ot: number;
  total_hours: number;
  lines_used: string[];
  daily_totals: Record<string, { st: number; ot: number; total: number }>;
  line_totals: Record<string, { st: number; ot: number; total: number }>;
}

interface TimesheetState {
  entries: TimeEntry[];
  lines: LineCode[];
  currentWeekEnding: string;
  weekInfo: WeekInfo | null;
  weeklySummary: WeeklySummary | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchLines: () => Promise<void>;
  fetchWeekInfo: (date: string) => Promise<void>;
  fetchEntries: (weekEnding: string) => Promise<void>;
  fetchWeeklySummary: (weekEnding: string) => Promise<void>;
  updateEntry: (workDate: string, lineCode: string, stHours: number, otHours: number) => Promise<void>;
  addProjectLine: (projectNumber: string) => Promise<void>;
  toggleLineVisibility: (lineCode: string, visible: boolean) => Promise<void>;
  deleteProjectLine: (lineCode: string) => Promise<void>;
  exportData: () => Promise<any>;
  importData: (data: any) => Promise<void>;
  changeWeek: (direction: 'next' | 'prev') => void;
}

export const useTimesheetStore = create<TimesheetState>((set, get) => ({
  entries: [],
  lines: [],
  currentWeekEnding: '',
  weekInfo: null,
  weeklySummary: null,
  loading: false,
  error: null,

  fetchLines: async () => {
    try {
      set({ loading: true, error: null });
      const lines = await db.getAllLines();
      set({ lines, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      console.error('Error fetching lines:', error);
    }
  },

  fetchWeekInfo: async (date: string) => {
    try {
      set({ loading: true, error: null });
      
      // Calculate week ending (Saturday) from work date
      const weekEnding = db.getWeekEnding(date);
      const isPay = await db.isPayWeek(weekEnding);
      
      // Calculate week start (Sunday)
      const weekEnd = new Date(weekEnding + 'T00:00:00');
      const weekStart = addDays(weekEnd, -6);
      
      const weekInfo = {
        week_ending_date: weekEnding,
        is_pay_week: isPay,
        week_start: format(weekStart, 'yyyy-MM-dd'),
        week_end: weekEnding,
      };
      
      set({ weekInfo, currentWeekEnding: weekInfo.week_ending_date, loading: false });
      return weekInfo;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      console.error('Error fetching week info:', error);
    }
  },

  fetchEntries: async (weekEnding: string) => {
    try {
      set({ loading: true, error: null });
      const entries = await db.getEntriesByWeek(weekEnding);
      set({ entries, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      console.error('Error fetching entries:', error);
    }
  },

  fetchWeeklySummary: async (weekEnding: string) => {
    try {
      set({ loading: true, error: null });
      const weeklySummary = await db.getWeeklySummary(weekEnding);
      set({ weeklySummary, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      console.error('Error fetching weekly summary:', error);
    }
  },

  updateEntry: async (workDate: string, lineCode: string, stHours: number, otHours: number) => {
    try {
      set({ error: null });
      
      // Update local database
      await db.upsertEntry({
        work_date: workDate,
        line_code: lineCode,
        st_hours: stHours,
        ot_hours: otHours,
        week_ending_date: '', // Will be calculated by db.upsertEntry
        is_pay_week: false,  // Will be calculated by db.upsertEntry
      });
      
      // Refresh entries and summary
      const { currentWeekEnding } = get();
      if (currentWeekEnding) {
        await get().fetchEntries(currentWeekEnding);
        await get().fetchWeeklySummary(currentWeekEnding);
      }
    } catch (error: any) {
      set({ error: error.message });
      console.error('Error updating entry:', error);
      throw error;
    }
  },

  addProjectLine: async (projectNumber: string) => {
    try {
      set({ error: null });
      await db.addProjectLine(projectNumber);
      await get().fetchLines();
    } catch (error: any) {
      set({ error: error.message });
      console.error('Error adding project line:', error);
      throw error;
    }
  },

  toggleLineVisibility: async (lineCode: string, visible: boolean) => {
    try {
      set({ error: null });
      await db.toggleLineVisibility(lineCode);
      await get().fetchLines();
    } catch (error: any) {
      set({ error: error.message });
      console.error('Error toggling line visibility:', error);
      throw error;
    }
  },

  deleteProjectLine: async (lineCode: string) => {
    try {
      set({ error: null });
      await db.deleteProjectLine(lineCode);
      await get().fetchLines();
    } catch (error: any) {
      set({ error: error.message });
      console.error('Error deleting project line:', error);
      throw error;
    }
  },

  exportData: async () => {
    try {
      set({ error: null });
      return await db.exportData();
    } catch (error: any) {
      set({ error: error.message });
      console.error('Error exporting data:', error);
      throw error;
    }
  },

  importData: async (data: any) => {
    try {
      set({ error: null });
      await db.importData(data);
      await get().fetchLines();
      const { currentWeekEnding } = get();
      if (currentWeekEnding) {
        await get().fetchEntries(currentWeekEnding);
        await get().fetchWeeklySummary(currentWeekEnding);
      }
    } catch (error: any) {
      set({ error: error.message });
      console.error('Error importing data:', error);
      throw error;
    }
  },

  changeWeek: (direction: 'next' | 'prev') => {
    const { currentWeekEnding } = get();
    if (!currentWeekEnding) return;
    
    const currentDate = new Date(currentWeekEnding);
    const offset = direction === 'next' ? 7 : -7;
    currentDate.setDate(currentDate.getDate() + offset);
    
    const newWeekEnding = currentDate.toISOString().split('T')[0];
    get().fetchWeekInfo(newWeekEnding).then(() => {
      get().fetchEntries(newWeekEnding);
      get().fetchWeeklySummary(newWeekEnding);
    });
  },
}));
