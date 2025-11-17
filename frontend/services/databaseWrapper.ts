import { Platform } from 'react-native';
import { format } from 'date-fns';

// Mock database for web platform
const mockDb = {
  initialize: async () => {
    console.warn('⚠️ SQLite unavailable on web. Please use Expo Go on iOS/Android device for full offline functionality.');
  },
  getAllLines: async () => {
    // Return default lines for demo on web
    return [
      { id: 1, line_code: 'VTR', label: 'VTR', is_visible: true, is_project: false, sort_order: 1 },
      { id: 2, line_code: 'GMRC', label: 'GMRC', is_visible: true, is_project: false, sort_order: 2 },
      { id: 3, line_code: 'CLP', label: 'CLP', is_visible: true, is_project: false, sort_order: 3 },
      { id: 9, line_code: 'PTO', label: 'PTO', is_visible: true, is_project: false, sort_order: 9 },
      { id: 10, line_code: 'HOLIDAY', label: 'HOLIDAY', is_visible: true, is_project: false, sort_order: 10 },
    ];
  },
  getWeekEnding: (date: string) => {
    const dateObj = new Date(date + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
    const saturday = new Date(dateObj);
    saturday.setDate(dateObj.getDate() + daysUntilSaturday);
    return format(saturday, 'yyyy-MM-dd');
  },
  isPayWeek: async () => false,
  getEntriesByWeek: async () => [],
  getWeeklySummary: async (weekEnding: string) => ({
    week_ending_date: weekEnding,
    is_pay_week: false,
    total_st: 0,
    total_ot: 0,
    total_hours: 0,
    lines_used: [],
    line_totals: {},
    daily_totals: {},
  }),
  upsertEntry: async () => {
    console.warn('⚠️ Cannot save data on web. Use native app for full functionality.');
  },
  addProjectLine: async () => {
    console.warn('⚠️ Cannot add project lines on web. Use native app for full functionality.');
  },
  toggleLineVisibility: async () => {
    console.warn('⚠️ Cannot toggle visibility on web. Use native app for full functionality.');
  },
  deleteProjectLine: async () => {
    console.warn('⚠️ Cannot delete lines on web. Use native app for full functionality.');
  },
  exportData: async () => ({
    export_date: new Date().toISOString(),
    time_entries: [],
    line_codes: [],
    settings: [],
  }),
  importData: async () => {
    console.warn('⚠️ Cannot import data on web. Use native app for full functionality.');
  },
};

// Export the appropriate database based on platform
export const db = Platform.OS === 'web' ? mockDb : require('./database').db;
