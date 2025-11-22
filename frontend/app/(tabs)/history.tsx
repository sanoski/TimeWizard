import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Modal, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';
import { useTimesheetStore } from '../../store/timesheetStore';
import { format, parseISO, eachDayOfInterval, isSaturday, isSunday } from 'date-fns';
import { useFocusEffect } from 'expo-router';
import { db } from '../../services/databaseWrapper';

type ViewMode = 'list' | 'calendar';

export default function HistoryScreen() {
  const { weekInfo, fetchWeekInfo, loading } = useTimesheetStore();
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [weekSummaries, setWeekSummaries] = useState<any[]>([]);
  const [loadingSummaries, setLoadingSummaries] = useState(false);
  
  // View mode toggle
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  
  // Calendar state
  const [selectedDate, setSelectedDate] = useState('');
  const [dayDetails, setDayDetails] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    fetchWeekInfo(today);
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (weekInfo) {
        loadRecentWeeks();
      }
      if (viewMode === 'calendar') {
        loadCalendarData();
      }
    }, [weekInfo, viewMode])
  );

  useEffect(() => {
    if (weekInfo) {
      loadRecentWeeks();
    }
  }, [weekInfo]);

  useEffect(() => {
    if (viewMode === 'calendar') {
      loadCalendarData();
    }
  }, [viewMode]);

  const loadRecentWeeks = async () => {
    if (!weekInfo) return;
    
    setLoadingSummaries(true);
    const summaries = [];
    
    // Load last 8 weeks from local database
    for (let i = 0; i < 8; i++) {
      const currentWeekEnd = new Date(weekInfo.week_ending_date + 'T00:00:00');
      currentWeekEnd.setDate(currentWeekEnd.getDate() - (i * 7));
      const weekEnding = format(currentWeekEnd, 'yyyy-MM-dd');
      
      try {
        const summary = await db.getWeeklySummary(weekEnding);
        summaries.push(summary);
      } catch (error) {
        console.error('Error loading week:', error);
      }
    }
    
    setWeekSummaries(summaries);
    setLoadingSummaries(false);
  };

  const loadCalendarData = async () => {
    setLoadingCalendar(true);
    console.log('🚀 loadCalendarData called');
    try {
      await db.initialize();
      console.log('✅ DB initialized');
      
      // Load data for 3 months: previous, current, and next month
      const today = new Date();
      const startOfPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
      
      const startDate = format(startOfPrevMonth, 'yyyy-MM-dd');
      const endDate = format(endOfNextMonth, 'yyyy-MM-dd');
      console.log('📅 Loading calendar for 3 months:', startDate, 'to', endDate);
      
      // Get all dates with hours logged
      const entriesWithHours = await db.database.getAllAsync(
        'SELECT DISTINCT work_date FROM time_entries WHERE work_date >= ? AND work_date <= ? ORDER BY work_date',
        [startDate, endDate]
      );
      
      // Get all dates with notes
      const datesWithNotes = await db.database.getAllAsync(
        'SELECT DISTINCT work_date FROM work_notes WHERE work_date >= ? AND work_date <= ?',
        [startDate, endDate]
      );
      
      // Load on-call schedule
      const onCallSchedule = await db.getOnCallSchedule(startDate, endDate);
      const currentUser = await db.getCurrentUser();
      
      console.log('📅 ========== Calendar Data Loading ==========');
      console.log('  Date range:', startDate, 'to', endDate);
      console.log('  On-call entries found:', onCallSchedule.length);
      console.log('  Current user:', currentUser?.user_name);
      if (onCallSchedule.length > 0) {
        onCallSchedule.forEach((s: any, idx: number) => {
          console.log(`  [${idx}] ${s.user_name}: ${s.start_date} to ${s.end_date}`);
        });
      } else {
        console.log('  ⚠️ NO ON-CALL DATA FOUND FOR THIS MONTH!');
      }
      
      // Build marked dates object
      const marked: any = {};
      
      // Mark dates with hours logged
      entriesWithHours.forEach((entry: any) => {
        if (!marked[entry.work_date]) {
          marked[entry.work_date] = { dots: [] };
        }
        marked[entry.work_date].dots.push({ color: '#2563eb', key: 'hours' });
      });
      
      // Mark dates with notes
      datesWithNotes.forEach((note: any) => {
        if (!marked[note.work_date]) {
          marked[note.work_date] = { dots: [] };
        }
        if (!marked[note.work_date].dots.find((d: any) => d.key === 'notes')) {
          marked[note.work_date].dots.push({ color: '#f59e0b', key: 'notes' });
        }
      });
      
      // Mark weekends and on-call days
      const monthDays = eachDayOfInterval({ start: startOfMonth, end: endOfMonth });
      monthDays.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const isWeekend = isSaturday(day) || isSunday(day);
        
        if (isWeekend) {
          // Initialize date entry if needed
          if (!marked[dateStr]) {
            marked[dateStr] = { dots: [] };
          }
          
          // Check if user is on-call this weekend
          const onCall = onCallSchedule.find((s: any) => 
            s.start_date <= dateStr && s.end_date >= dateStr && s.user_name === currentUser?.user_name
          );
          
          if (onCall) {
            console.log(`🟢 Marking ${dateStr} as ON-CALL for ${currentUser?.user_name}`);
            // Add green dot for on-call
            if (!marked[dateStr].dots.find((d: any) => d.key === 'oncall')) {
              marked[dateStr].dots.push({ color: '#10b981', key: 'oncall' });
            }
          }
        }
      });
      
      console.log('📊 Final marked dates:', Object.keys(marked).length, 'dates marked');
      console.log('📊 Sample marked dates:', JSON.stringify(Object.entries(marked).slice(0, 5), null, 2));
      
      setMarkedDates(marked);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setLoadingCalendar(false);
    }
  };

  const handleDayPress = async (day: DateData) => {
    console.log('🔵 DAY PRESSED!', day.dateString);
    setSelectedDate(day.dateString);
    
    // Show modal immediately with loading state
    setDayDetails({
      date: day.dateString,
      entries: [],
      notes: [],
      onCallInfo: [],
      currentUser: null,
      totalST: 0,
      totalOT: 0,
      totalHours: 0,
      loading: true
    });
    setShowDetailModal(true);
    
    try {
      console.log('📅 Loading details for:', day.dateString);
      
      // Get hours/lines for this day
      const entries = await db.database.getAllAsync(
        'SELECT * FROM time_entries WHERE work_date = ? ORDER BY line_code',
        [day.dateString]
      );
      console.log('✅ Entries found:', entries.length);
      
      // Get notes for this day
      const notes = await db.database.getAllAsync(
        'SELECT * FROM work_notes WHERE work_date = ? ORDER BY line_code',
        [day.dateString]
      );
      console.log('✅ Notes found:', notes.length);
      
      // Get on-call info for this day
      const onCallInfo = await db.getOnCallForDate(day.dateString);
      console.log('✅ On-call info found:', onCallInfo.length);
      
      const currentUser = await db.getCurrentUser();
      console.log('✅ Current user:', currentUser?.user_name);
      
      // Calculate totals
      let totalST = 0;
      let totalOT = 0;
      entries.forEach((e: any) => {
        totalST += e.st_hours || 0;
        totalOT += e.ot_hours || 0;
      });
      
      const details = {
        date: day.dateString,
        entries: entries || [],
        notes: notes || [],
        onCallInfo: onCallInfo || [],
        currentUser,
        totalST,
        totalOT,
        totalHours: totalST + totalOT,
        loading: false
      };
      
      console.log('📊 Day details prepared:', {
        hasEntries: details.entries.length > 0,
        hasNotes: details.notes.length > 0,
        hasOnCall: details.onCallInfo.length > 0,
        totalHours: details.totalHours
      });
      
      console.log('📊 Full details object:', JSON.stringify(details, null, 2));
      
      // Force update by setting state twice
      setDayDetails(null);
      setTimeout(() => {
        setDayDetails(details);
        console.log('✅ Modal should now show data');
      }, 10);
    } catch (error) {
      console.error('❌ Error loading day details:', error);
      Alert.alert('Error', 'Failed to load day details');
    }
  };

  const getWeekLabel = (weekEndingDate: string): string => {
    const endDate = new Date(weekEndingDate + 'T00:00:00');
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6);
    return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
  };

  if (loading && !weekInfo) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>History</Text>
          <Text style={styles.headerSubtitle}>
            {viewMode === 'list' ? 'View past timesheets' : 'Calendar view'}
          </Text>
        </View>
        <Ionicons name={viewMode === 'list' ? 'time-outline' : 'calendar-outline'} size={32} color="#2563eb" />
      </View>

      {/* View Toggle */}
      <View style={styles.toggleContainer}>
        <Pressable
          style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
          onPress={() => setViewMode('list')}
        >
          <Ionicons name="list" size={20} color={viewMode === 'list' ? '#ffffff' : '#6b7280'} />
          <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>List View</Text>
        </Pressable>
        <Pressable
          style={[styles.toggleButton, viewMode === 'calendar' && styles.toggleButtonActive]}
          onPress={() => setViewMode('calendar')}
        >
          <Ionicons name="calendar" size={20} color={viewMode === 'calendar' ? '#ffffff' : '#6b7280'} />
          <Text style={[styles.toggleText, viewMode === 'calendar' && styles.toggleTextActive]}>Calendar</Text>
        </Pressable>
      </View>

      {/* List View */}
      {viewMode === 'list' && (
        <ScrollView style={styles.scrollView}>
          {loadingSummaries ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.loadingText}>Loading history...</Text>
            </View>
          ) : (
            <View style={styles.weeksList}>
              {weekSummaries.map((summary, index) => (
                <Pressable
                  key={summary.week_ending_date}
                  style={styles.weekCard}
                  onPress={() => setSelectedWeek(
                    selectedWeek === summary.week_ending_date ? '' : summary.week_ending_date
                  )}
                >
                  <View style={styles.weekCardHeader}>
                    <View style={styles.weekCardLeft}>
                      <Text style={styles.weekLabel}>
                        {getWeekLabel(summary.week_ending_date)}
                      </Text>
                      {summary.is_pay_week && (
                        <View style={styles.payWeekBadge}>
                          <Ionicons name="cash" size={12} color="#ffffff" />
                          <Text style={styles.payWeekText}>PAY</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.weekCardRight}>
                      <Text style={styles.totalHoursText}>{summary.total_hours}h</Text>
                      <Ionicons 
                        name={selectedWeek === summary.week_ending_date ? 'chevron-up' : 'chevron-down'} 
                        size={20} 
                        color="#6b7280" 
                      />
                    </View>
                  </View>

                  {/* Quick Stats */}
                  <View style={styles.quickStats}>
                    <View style={styles.statPill}>
                      <Text style={styles.statPillLabel}>ST:</Text>
                      <Text style={styles.statPillValue}>{summary.total_st}h</Text>
                    </View>
                    <View style={[styles.statPill, { backgroundColor: '#fee2e2' }]}>
                      <Text style={styles.statPillLabel}>OT:</Text>
                      <Text style={[styles.statPillValue, { color: '#dc2626' }]}>{summary.total_ot}h</Text>
                    </View>
                    <View style={[styles.statPill, { backgroundColor: '#e0e7ff' }]}>
                      <Text style={styles.statPillLabel}>Lines:</Text>
                      <Text style={[styles.statPillValue, { color: '#4f46e5' }]}>{summary.lines_used.length}</Text>
                    </View>
                  </View>

                  {/* Expanded Details */}
                  {selectedWeek === summary.week_ending_date && (
                    <View style={styles.expandedDetails}>
                      <View style={styles.divider} />
                      
                      {summary.lines_used.length > 0 && (
                        <View style={styles.detailSection}>
                          <Text style={styles.detailSectionTitle}>Lines Worked:</Text>
                          <View style={styles.linesContainer}>
                            {summary.lines_used.map((line: string) => (
                              <View key={line} style={styles.lineChip}>
                                <Text style={styles.lineChipText}>{line}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}

                      {Object.keys(summary.line_totals).length > 0 && (
                        <View style={styles.detailSection}>
                          <Text style={styles.detailSectionTitle}>Hours by Line:</Text>
                          {Object.entries(summary.line_totals).map(([lineCode, totals]: [string, any]) => (
                            <View key={lineCode} style={styles.lineBreakdownRow}>
                              <Text style={styles.lineBreakdownLabel}>{lineCode}</Text>
                              <View style={styles.lineBreakdownValues}>
                                <Text style={styles.lineBreakdownValue}>ST: {totals.st}</Text>
                                <Text style={[styles.lineBreakdownValue, { color: '#dc2626' }]}>OT: {totals.ot}</Text>
                                <Text style={[styles.lineBreakdownValue, { fontWeight: '600' }]}>= {totals.total}</Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle" size={20} color="#2563eb" />
              <Text style={styles.infoTitle}>About History</Text>
            </View>
            <Text style={styles.infoText}>
              View your timesheet history for the past 8 weeks. Tap any week to see detailed breakdown by line code.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <ScrollView style={styles.scrollView}>
          {/* Legend */}
          <View style={styles.legend}>
            <Text style={styles.legendTitle}>Calendar Legend:</Text>
            <View style={styles.legendItems}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#2563eb' }]} />
                <Text style={styles.legendText}>Hours Logged</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
                <Text style={styles.legendText}>Notes</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                <Text style={styles.legendText}>On-Call (You)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, { backgroundColor: '#f3f4f6' }]} />
                <Text style={styles.legendText}>Weekend</Text>
              </View>
            </View>
          </View>

          {/* Calendar */}
          <View style={styles.calendarContainer}>
            {loadingCalendar ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
              </View>
            ) : (
              <Calendar
                markingType={'multi-dot'}
                markedDates={markedDates}
                onDayPress={handleDayPress}
                theme={{
                  backgroundColor: '#ffffff',
                  calendarBackground: '#ffffff',
                  textSectionTitleColor: '#6b7280',
                  selectedDayBackgroundColor: '#2563eb',
                  selectedDayTextColor: '#ffffff',
                  todayTextColor: '#2563eb',
                  dayTextColor: '#111827',
                  textDisabledColor: '#d1d5db',
                  dotColor: '#2563eb',
                  selectedDotColor: '#ffffff',
                  arrowColor: '#2563eb',
                  monthTextColor: '#111827',
                  textDayFontWeight: '400',
                  textMonthFontWeight: '600',
                  textDayHeaderFontWeight: '600',
                  textDayFontSize: 14,
                  textMonthFontSize: 18,
                  textDayHeaderFontSize: 12,
                  'stylesheet.day.basic': {
                    base: {
                      width: 32,
                      height: 32,
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                    text: {
                      marginTop: 4,
                      fontSize: 14,
                      fontWeight: '400',
                      color: '#111827',
                    },
                  },
                  'stylesheet.calendar.main': {
                    week: {
                      marginTop: 2,
                      marginBottom: 2,
                      flexDirection: 'row',
                      justifyContent: 'space-around',
                    }
                  }
                }}
              />
            )}
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle" size={20} color="#2563eb" />
              <Text style={styles.infoTitle}>How to Use</Text>
            </View>
            <Text style={styles.infoText}>
              Tap any date to view detailed information including hours worked, lines used, notes, and on-call assignments. Weekends are highlighted in gray, and your on-call weekends have a green background.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Day Details Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {dayDetails && format(parseISO(dayDetails.date), 'EEEE, MMM d, yyyy')}
              </Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close-circle" size={32} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={{ padding: 20 }}>
              {!dayDetails ? (
                <Text style={{ fontSize: 16, color: '#000' }}>Loading...</Text>
              ) : (
                <View>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>
                    Data for {dayDetails.date}
                  </Text>
                  
                  {/* Simple hours display */}
                  <View style={{ marginBottom: 20, backgroundColor: '#f0f0f0', padding: 15, borderRadius: 8 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 10 }}>Hours:</Text>
                    <Text style={{ fontSize: 14 }}>ST: {dayDetails.totalST}h</Text>
                    <Text style={{ fontSize: 14 }}>OT: {dayDetails.totalOT}h</Text>
                    <Text style={{ fontSize: 14, fontWeight: 'bold' }}>Total: {dayDetails.totalHours}h</Text>
                  </View>

                  {/* Lines */}
                  {dayDetails.entries && dayDetails.entries.length > 0 && (
                    <View style={{ marginBottom: 20, backgroundColor: '#e3f2fd', padding: 15, borderRadius: 8 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 10 }}>
                        Lines ({dayDetails.entries.length}):
                      </Text>
                      {dayDetails.entries.map((entry: any, idx: number) => (
                        <Text key={idx} style={{ fontSize: 14, marginBottom: 5 }}>
                          • {entry.line_code}: ST {entry.st_hours}h, OT {entry.ot_hours}h
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Notes */}
                  {dayDetails.notes && dayDetails.notes.length > 0 && (
                    <View style={{ marginBottom: 20, backgroundColor: '#fff3e0', padding: 15, borderRadius: 8 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 10 }}>
                        Notes ({dayDetails.notes.length}):
                      </Text>
                      {dayDetails.notes.map((note: any, idx: number) => (
                        <View key={idx} style={{ marginBottom: 10 }}>
                          <Text style={{ fontSize: 14, fontWeight: '500' }}>{note.line_code}:</Text>
                          <Text style={{ fontSize: 14 }}>{note.note_text}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* On-Call */}
                  {dayDetails.onCallInfo && dayDetails.onCallInfo.length > 0 && (
                    <View style={{ marginBottom: 20, backgroundColor: '#e8f5e9', padding: 15, borderRadius: 8 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 10 }}>On-Call:</Text>
                      {dayDetails.onCallInfo.map((person: any, idx: number) => (
                        <Text key={idx} style={{ fontSize: 14 }}>• {person.user_name}</Text>
                      ))}
                    </View>
                  )}

                  {/* Debug info */}
                  <View style={{ marginTop: 20, padding: 10, backgroundColor: '#fff9c4', borderRadius: 8 }}>
                    <Text style={{ fontSize: 12, fontFamily: 'monospace' }}>
                      Debug: {dayDetails.entries?.length || 0} entries, {dayDetails.notes?.length || 0} notes
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 8,
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  toggleButtonActive: {
    backgroundColor: '#2563eb',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  toggleTextActive: {
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  weeksList: {
    padding: 16,
  },
  weekCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  weekCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  weekCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  weekCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weekLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  payWeekBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  payWeekText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  totalHoursText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
  },
  quickStats: {
    flexDirection: 'row',
    gap: 8,
  },
  statPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#dbeafe',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  statPillLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
  },
  statPillValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e40af',
  },
  expandedDetails: {
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginBottom: 12,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  linesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  lineChip: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  lineChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4f46e5',
  },
  lineBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  lineBreakdownLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  lineBreakdownValues: {
    flexDirection: 'row',
    gap: 12,
  },
  lineBreakdownValue: {
    fontSize: 13,
    color: '#6b7280',
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
  },
  infoText: {
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  // Calendar styles
  legend: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginTop: 8,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#6b7280',
  },
  calendarContainer: {
    backgroundColor: '#ffffff',
    marginTop: 8,
    paddingBottom: 16,
    minHeight: 350,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '85%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalScroll: {
    flex: 1,
  },
  modalSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  emptySection: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9ca3af',
  },
  hoursGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  hoursStat: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  hoursStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  hoursStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  lineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  lineCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  lineHours: {
    flexDirection: 'row',
    gap: 16,
  },
  lineHoursText: {
    fontSize: 13,
    color: '#6b7280',
  },
  noteCard: {
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  noteLineCode: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
  },
  noteText: {
    fontSize: 13,
    color: '#78350f',
    lineHeight: 18,
  },
  onCallCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginBottom: 8,
  },
  onCallCardYou: {
    backgroundColor: '#d1fae5',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  onCallName: {
    fontSize: 14,
    color: '#374151',
  },
  onCallNameYou: {
    fontWeight: '600',
    color: '#065f46',
  },
  swappedBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  swappedText: {
    fontSize: 11,
    color: '#92400e',
    fontWeight: '600',
  },
});
