import { Platform } from 'react-native';

// Conditionally import database only on native platforms
let db: any = null;

if (Platform.OS !== 'web') {
  // Only import on native platforms
  db = require('./database').db;
} else {
  // Mock database for web
  console.warn('⚠️ Running on web - SQLite not available. Use Expo Go on iOS/Android for full functionality.');
  
  db = {
    initialize: async () => {
      console.log('Mock database initialized for web');
    },
    getAllLines: async () => [],
    getWeekEnding: (date: string) => date,
    isPayWeek: async () => false,
    getEntriesByWeek: async () => [],
    getWeeklySummary: async () => ({
      week_ending_date: '',
      is_pay_week: false,
      total_st: 0,
      total_ot: 0,
      total_hours: 0,
      lines_used: [],
      line_totals: {},
      daily_totals: {},
    }),
    upsertEntry: async () => {},
    addProjectLine: async () => {},
    toggleLineVisibility: async () => {},
    deleteProjectLine: async () => {},
    exportData: async () => ({}),
    importData: async () => {},
  };
}

export { db };
