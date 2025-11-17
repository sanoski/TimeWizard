// Web version - mock database (SQLite not supported on web preview)
import { format } from 'date-fns';

console.warn('⚠️ Running on web - SQLite is not supported. Please test on iOS/Android device with Expo Go for full offline functionality.');

export const db = {
  initialize: async () => {
    console.log('Mock database initialized for web preview');
  },
  getAllLines: async () => {
    // Return default lines for demo purposes on web
    return [
      { id: 1, line_code: 'VTR', label: 'VTR', is_visible: true, is_project: false, sort_order: 1 },
      { id: 2, line_code: 'GMRC', label: 'GMRC', is_visible: true, is_project: false, sort_order: 2 },
      { id: 3, line_code: 'CLP', label: 'CLP', is_visible: true, is_project: false, sort_order: 3 },
      { id: 4, line_code: 'WACR', label: 'WACR', is_visible: true, is_project: false, sort_order: 4 },
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
    console.warn('⚠️ Cannot save data on web preview. Use native app.');
  },
  addProjectLine: async () => {
    console.warn('⚠️ Cannot add project on web preview. Use native app.');
  },
  toggleLineVisibility: async () => {},
  deleteProjectLine: async () => {},
  exportData: async () => ({
    export_date: new Date().toISOString(),
    time_entries: [],
    line_codes: [],
    settings: [],
  }),
  importData: async () => {},
};
