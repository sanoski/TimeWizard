import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { format } from 'date-fns';
import { db } from '../services/database';

// Line order matching the paper timesheet
const LINE_ORDER = ['VTR', 'GMRC', 'CLP', 'WACR', 'WACR-CRD', 'NEGS', 'NHC', 'NYOG', 'PTO', 'HOLIDAY'];

export default function WeeklySummaryScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const weekEnding = params.weekEnding as string;
  
  const [summary, setSummary] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (weekEnding) {
      loadWeekData();
    }
  }, [weekEnding]);

  const loadWeekData = async () => {
    try {
      setLoading(true);
      
      // Load from local database
      const summaryData = await db.getWeeklySummary(weekEnding);
      const entriesData = await db.getEntriesByWeek(weekEnding);
      
      setSummary(summaryData);
      setEntries(entriesData);
    } catch (error) {
      console.error('Error loading week data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLineTotal = (lineCode: string, type: 'st' | 'ot') => {
    return entries
      .filter(e => e.line_code === lineCode)
      .reduce((sum, e) => sum + (type === 'st' ? e.st_hours : e.ot_hours), 0);
  };

  const getDayTotal = (date: string, type: 'st' | 'ot') => {
    return entries
      .filter(e => e.work_date === date)
      .reduce((sum, e) => sum + (type === 'st' ? e.st_hours : e.ot_hours), 0);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  if (!summary || summary.total_hours === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#2563eb" />
          </Pressable>
          <Text style={styles.headerTitle}>No Hours Logged</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="document-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyText}>No hours logged for this week</Text>
          <Text style={styles.emptySubtext}>Week ending {format(new Date(weekEnding + 'T00:00:00'), 'MMM dd, yyyy')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Get sorted lines that have hours
  const sortedLines = LINE_ORDER.filter(lineCode => {
    const total = getLineTotal(lineCode, 'st') + getLineTotal(lineCode, 'ot');
    return total > 0;
  });

  // Add any project lines not in the standard order
  const projectLines = summary.lines_used.filter((line: string) => !LINE_ORDER.includes(line));
  const allLines = [...sortedLines, ...projectLines];

  // Get all dates for the week
  const weekStart = new Date(summary.week_ending_date + 'T00:00:00');
  weekStart.setDate(weekStart.getDate() - 6);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return format(d, 'yyyy-MM-dd');
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Weekly Summary</Text>
          <Text style={styles.headerSubtitle}>
            {format(weekStart, 'MMM dd')} - {format(new Date(summary.week_ending_date + 'T00:00:00'), 'MMM dd, yyyy')}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Week Totals</Text>
          <View style={styles.totalsRow}>
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Straight Time</Text>
              <Text style={styles.totalValue}>{summary.total_st} hrs</Text>
            </View>
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Overtime</Text>
              <Text style={[styles.totalValue, { color: '#dc2626' }]}>{summary.total_ot} hrs</Text>
            </View>
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Total Hours</Text>
              <Text style={[styles.totalValue, { color: '#2563eb' }]}>{summary.total_hours} hrs</Text>
            </View>
          </View>
        </View>

        {/* Paper Timesheet Helper */}
        <View style={styles.card}>
          <View style={styles.timesheetHeader}>
            <Ionicons name="clipboard-outline" size={24} color="#2563eb" />
            <Text style={styles.sectionTitle}>Paper Timesheet Helper</Text>
          </View>
          <Text style={styles.helperSubtitle}>Copy these values to your paper timesheet</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.timesheetScroll}>
            <View style={styles.timesheetTable}>
              {/* Header Row */}
              <View style={styles.timesheetRow}>
                <View style={styles.lineNameCell}>
                  <Text style={styles.headerText}></Text>
                </View>
                {weekDates.map((date) => {
                  const dateObj = new Date(date + 'T00:00:00');
                  const dayName = format(dateObj, 'EEE');
                  const dateStr = format(dateObj, 'M/d');
                  
                  return (
                    <View key={date} style={styles.dayHeaderCell}>
                      <Text style={styles.dayHeaderText}>{dayName}</Text>
                      <Text style={styles.dateHeaderText}>{dateStr}</Text>
                    </View>
                  );
                })}
                <View style={styles.totalHeaderCell}>
                  <Text style={styles.headerText}>ST</Text>
                </View>
                <View style={styles.totalHeaderCell}>
                  <Text style={styles.headerText}>OT</Text>
                </View>
              </View>

              {/* Data Rows - One row per line */}
              {allLines.map((lineCode) => {
                const stHours = getLineTotal(lineCode, 'st');
                const otHours = getLineTotal(lineCode, 'ot');
                
                return (
                  <View key={lineCode} style={styles.timesheetRow}>
                    <View style={styles.lineNameCell}>
                      <Text style={styles.lineNameText}>{lineCode}</Text>
                    </View>
                    {weekDates.map((date) => {
                      const dayEntries = entries.filter(e => e.work_date === date && e.line_code === lineCode);
                      const dayST = dayEntries.reduce((sum, e) => sum + e.st_hours, 0);
                      const dayOT = dayEntries.reduce((sum, e) => sum + e.ot_hours, 0);
                      
                      return (
                        <View key={date} style={styles.dataCell}>
                          {dayST > 0 && <Text style={styles.stText}>{dayST}</Text>}
                          {dayOT > 0 && <Text style={styles.otText}>{dayOT} OT</Text>}
                          {dayST === 0 && dayOT === 0 && <Text style={styles.emptyCell}>-</Text>}
                        </View>
                      );
                    })}
                    <View style={styles.totalCell}>
                      <Text style={styles.totalCellText}>{stHours}</Text>
                    </View>
                    <View style={styles.totalCell}>
                      <Text style={styles.totalCellText}>{otHours}</Text>
                    </View>
                  </View>
                );
              })}

              {/* Totals Row */}
              <View style={[styles.timesheetRow, styles.totalsRowBorder]}>
                <View style={styles.lineNameCell}>
                  <Text style={styles.totalRowLabel}>TOTALS</Text>
                </View>
                {weekDates.map((date) => {
                  const dayST = getDayTotal(date, 'st');
                  const dayOT = getDayTotal(date, 'ot');
                  
                  return (
                    <View key={date} style={styles.dataCell}>
                      {dayST > 0 && <Text style={styles.stText}>{dayST}</Text>}
                      {dayOT > 0 && <Text style={styles.otText}>{dayOT} OT</Text>}
                      {dayST === 0 && dayOT === 0 && <Text style={styles.emptyCell}>-</Text>}
                    </View>
                  );
                })}
                <View style={styles.totalCell}>
                  <Text style={styles.grandTotalText}>{summary.total_st}</Text>
                </View>
                <View style={styles.totalCell}>
                  <Text style={styles.grandTotalText}>{summary.total_ot}</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Hours by Line */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Hours by Line Code</Text>
          {allLines.map((lineCode) => {
            const stHours = getLineTotal(lineCode, 'st');
            const otHours = getLineTotal(lineCode, 'ot');
            const total = stHours + otHours;
            
            return (
              <View key={lineCode} style={styles.lineRow}>
                <Text style={styles.lineCode}>{lineCode}</Text>
                <View style={styles.lineHours}>
                  <Text style={styles.lineHourText}>ST: {stHours}</Text>
                  <Text style={[styles.lineHourText, { color: '#dc2626' }]}>OT: {otHours}</Text>
                  <Text style={[styles.lineHourText, { fontWeight: '700' }]}>Total: {total}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Daily Breakdown */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Daily Breakdown</Text>
          {weekDates.map((date) => {
            const stHours = getDayTotal(date, 'st');
            const otHours = getDayTotal(date, 'ot');
            const total = stHours + otHours;
            
            if (total === 0) return null;
            
            const dateObj = new Date(date + 'T00:00:00');
            const dayName = format(dateObj, 'EEEE');
            const dateStr = format(dateObj, 'MMM dd');
            
            return (
              <View key={date} style={styles.dayRow}>
                <View style={styles.dayInfo}>
                  <Text style={styles.dayName}>{dayName}</Text>
                  <Text style={styles.dateStr}>{dateStr}</Text>
                </View>
                <View style={styles.dayHours}>
                  <Text style={styles.dayHourText}>ST: {stHours}</Text>
                  <Text style={[styles.dayHourText, { color: '#dc2626' }]}>OT: {otHours}</Text>
                  <Text style={[styles.dayHourText, { fontWeight: '700' }]}>= {total}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#2563eb" />
          <Text style={styles.infoText}>
            Use this summary to fill out your paper timesheet. All hours are organized by line code in the same order as your official form.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalBox: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  totalLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    textAlign: 'center',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  lineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  lineCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  lineHours: {
    flexDirection: 'row',
    gap: 16,
  },
  lineHourText: {
    fontSize: 14,
    color: '#6b7280',
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dayInfo: {
    flex: 1,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  dateStr: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  dayHours: {
    flexDirection: 'row',
    gap: 12,
  },
  dayHourText: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  // Paper Timesheet Helper Styles
  timesheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  helperSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 16,
  },
  timesheetScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  timesheetTable: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    overflow: 'hidden',
  },
  timesheetRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    minHeight: 52,
  },
  totalsRowBorder: {
    borderTopWidth: 2,
    borderTopColor: '#374151',
    backgroundColor: '#f9fafb',
  },
  lineNameCell: {
    width: 100,
    padding: 8,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  lineNameText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  dayHeaderCell: {
    width: 70,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRightWidth: 1,
    borderRightColor: '#d1d5db',
  },
  dayHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e40af',
  },
  dateHeaderText: {
    fontSize: 11,
    color: '#3b82f6',
    marginTop: 2,
  },
  dataCell: {
    width: 70,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  stText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  otText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
    marginTop: 2,
  },
  emptyCell: {
    fontSize: 14,
    color: '#d1d5db',
  },
  totalHeaderCell: {
    width: 60,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRightWidth: 1,
    borderRightColor: '#d1d5db',
  },
  headerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e40af',
  },
  totalCell: {
    width: 60,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  totalCellText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563eb',
  },
  totalRowLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  grandTotalText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
  },
});
