import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';
import { useTimesheetStore } from '../../store/timesheetStore';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isSaturday, isSunday } from 'date-fns';
import { useFocusEffect } from 'expo-router';
import { db } from '../../services/databaseWrapper';

export default function HistoryScreen() {
  const [selectedDate, setSelectedDate] = useState('');
  const [dayDetails, setDayDetails] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCalendarData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadCalendarData();
    }, [])
  );

  const loadCalendarData = async () => {
    setLoading(true);
    try {
      await db.initialize();
      
      // Get current month range
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      // Load all entries for the month
      const startDate = format(startOfMonth, 'yyyy-MM-dd');
      const endDate = format(endOfMonth, 'yyyy-MM-dd');
      
      const entries = await db.getAllAsync(
        'SELECT DISTINCT work_date FROM time_entries WHERE work_date >= ? AND work_date <= ? ORDER BY work_date',
        [startDate, endDate]
      );
      
      // Load notes
      const notes = await db.getAllAsync(
        'SELECT DISTINCT work_date FROM work_notes WHERE work_date >= ? AND work_date <= ?',
        [startDate, endDate]
      );
      
      // Load on-call schedule
      const onCallSchedule = await db.getOnCallSchedule(startDate, endDate);
      const currentUser = await db.getCurrentUser();
      
      // Build marked dates object
      const marked: any = {};
      
      // Mark dates with hours logged
      entries.forEach((entry: any) => {
        if (!marked[entry.work_date]) {
          marked[entry.work_date] = { dots: [] };
        }
        marked[entry.work_date].dots.push({ color: '#2563eb', key: 'hours' });
      });
      
      // Mark dates with notes
      notes.forEach((note: any) => {
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
          // Check if user is on-call this weekend
          const onCall = onCallSchedule.find((s: any) => 
            s.start_date <= dateStr && s.end_date >= dateStr && s.user_name === currentUser?.user_name
          );
          
          if (onCall) {
            if (!marked[dateStr]) {
              marked[dateStr] = { dots: [] };
            }
            marked[dateStr].dots.push({ color: '#10b981', key: 'oncall' });
            marked[dateStr].customStyles = {
              container: { backgroundColor: '#d1fae5' },
              text: { color: '#065f46', fontWeight: '700' }
            };
          } else {
            // Regular weekend (not on-call)
            marked[dateStr] = {
              ...marked[dateStr],
              customStyles: {
                container: { backgroundColor: '#f3f4f6' },
                text: { color: '#6b7280' }
              }
            };
          }
        }
      });
      
      setMarkedDates(marked);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDayPress = async (day: DateData) => {
    setSelectedDate(day.dateString);
    setLoading(true);
    
    try {
      // Get hours/lines for this day
      const entries = await db.getAllAsync(
        'SELECT * FROM time_entries WHERE work_date = ? ORDER BY line_code',
        [day.dateString]
      );
      
      // Get notes for this day
      const notes = await db.getAllAsync(
        'SELECT * FROM work_notes WHERE work_date = ? ORDER BY line_code',
        [day.dateString]
      );
      
      // Get on-call info for this day
      const onCallInfo = await db.getOnCallForDate(day.dateString);
      const currentUser = await db.getCurrentUser();
      
      // Calculate totals
      let totalST = 0;
      let totalOT = 0;
      entries.forEach((e: any) => {
        totalST += e.st_hours || 0;
        totalOT += e.ot_hours || 0;
      });
      
      setDayDetails({
        date: day.dateString,
        entries,
        notes,
        onCallInfo,
        currentUser,
        totalST,
        totalOT,
        totalHours: totalST + totalOT
      });
      
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error loading day details:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>History & Calendar</Text>
          <Text style={styles.headerSubtitle}>View your work history</Text>
        </View>
        <Ionicons name="calendar-outline" size={32} color="#2563eb" />
      </View>

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
              textDayFontFamily: 'System',
              textMonthFontFamily: 'System',
              textDayHeaderFontFamily: 'System',
              textDayFontWeight: '400',
              textMonthFontWeight: '600',
              textDayHeaderFontWeight: '600',
              textDayFontSize: 14,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 12,
            }}
          />
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color="#2563eb" />
            <Text style={styles.infoTitle}>How to Use</Text>
          </View>
          <Text style={styles.infoText}>
            Tap any date to view detailed information including hours worked, lines used, notes, and on-call assignments. Weekends are highlighted, and your on-call weekends have a green background.
          </Text>
        </View>
      </ScrollView>

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

            <ScrollView style={styles.modalScroll}>
              {dayDetails && (
                <>
                  {/* Hours Summary */}
                  {dayDetails.totalHours > 0 ? (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Hours Worked</Text>
                      <View style={styles.hoursGrid}>
                        <View style={styles.hoursStat}>
                          <Text style={styles.hoursStatLabel}>ST</Text>
                          <Text style={styles.hoursStatValue}>{dayDetails.totalST}h</Text>
                        </View>
                        <View style={styles.hoursStat}>
                          <Text style={[styles.hoursStatLabel, { color: '#dc2626' }]}>OT</Text>
                          <Text style={[styles.hoursStatValue, { color: '#dc2626' }]}>{dayDetails.totalOT}h</Text>
                        </View>
                        <View style={styles.hoursStat}>
                          <Text style={styles.hoursStatLabel}>Total</Text>
                          <Text style={[styles.hoursStatValue, { color: '#2563eb' }]}>{dayDetails.totalHours}h</Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.emptySection}>
                      <Ionicons name="time-outline" size={48} color="#d1d5db" />
                      <Text style={styles.emptyText}>No hours logged this day</Text>
                    </View>
                  )}

                  {/* Lines Worked */}
                  {dayDetails.entries.length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Lines Worked</Text>
                      {dayDetails.entries.map((entry: any, index: number) => (
                        <View key={index} style={styles.lineRow}>
                          <Text style={styles.lineCode}>{entry.line_code}</Text>
                          <View style={styles.lineHours}>
                            <Text style={styles.lineHoursText}>ST: {entry.st_hours}h</Text>
                            <Text style={[styles.lineHoursText, { color: '#dc2626' }]}>OT: {entry.ot_hours}h</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Notes */}
                  {dayDetails.notes.length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Notes</Text>
                      {dayDetails.notes.map((note: any, index: number) => (
                        <View key={index} style={styles.noteCard}>
                          <View style={styles.noteHeader}>
                            <Ionicons name="document-text" size={16} color="#f59e0b" />
                            <Text style={styles.noteLineCode}>{note.line_code}</Text>
                          </View>
                          <Text style={styles.noteText}>{note.note_text}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* On-Call Info */}
                  {dayDetails.onCallInfo.length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>On-Call This Weekend</Text>
                      {dayDetails.onCallInfo.map((person: any, index: number) => {
                        const isYou = person.user_name === dayDetails.currentUser?.user_name;
                        return (
                          <View key={index} style={[styles.onCallCard, isYou && styles.onCallCardYou]}>
                            <Ionicons name="person" size={16} color={isYou ? '#10b981' : '#6b7280'} />
                            <Text style={[styles.onCallName, isYou && styles.onCallNameYou]}>
                              {person.user_name} {isYou && '(You)'}
                            </Text>
                            {person.is_swapped === 1 && (
                              <View style={styles.swappedBadge}>
                                <Text style={styles.swappedText}>Swapped</Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </>
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
  scrollView: {
    flex: 1,
  },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
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
