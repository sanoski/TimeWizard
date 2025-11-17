import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Pressable, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTimesheetStore } from '../../store/timesheetStore';
import { format, addDays } from 'date-fns';

export default function TimesheetScreen() {
  const { 
    entries,
    lines,
    weekInfo, 
    weeklySummary,
    loading, 
    fetchWeekInfo, 
    fetchEntries,
    fetchWeeklySummary,
    fetchLines,
    updateEntry,
    changeWeek,
    addProjectLine
  } = useTimesheetStore();

  const [showAddProject, setShowAddProject] = useState(false);
  const [projectNumber, setProjectNumber] = useState('');

  // Refs for synchronized scrolling
  const headerDayScroll = useRef<any>(null);
  const sideLineScroll = useRef<any>(null);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    fetchLines();
    fetchWeekInfo(today).then(() => {
      if (weekInfo) {
        fetchEntries(weekInfo.week_ending_date);
        fetchWeeklySummary(weekInfo.week_ending_date);
      }
    });
  }, []);

  useEffect(() => {
    if (weekInfo) {
      fetchEntries(weekInfo.week_ending_date);
      fetchWeeklySummary(weekInfo.week_ending_date);
    }
  }, [weekInfo]);

  const getEntryHours = (workDate: string, lineCode: string, type: 'st' | 'ot'): number => {
    const entry = entries.find(e => e.work_date === workDate && e.line_code === lineCode);
    return entry ? (type === 'st' ? entry.st_hours : entry.ot_hours) : 0;
  };

  const getDayTotal = (workDate: string, type: 'st' | 'ot'): number => {
    return entries
      .filter(e => e.work_date === workDate)
      .reduce((sum, e) => sum + (type === 'st' ? e.st_hours : e.ot_hours), 0);
  };

  const canIncrementST = (workDate: string, lineCode: string, currentST: number): boolean => {
    // Check if line allows ST only (PTO, HOLIDAY)
    const line = lines.find(l => l.line_code === lineCode);
    
    // ST can't exceed 8 for this line
    if (currentST >= 8) return false;
    
    // Total ST across all lines can't exceed 40
    const totalWeeklyST = weeklySummary?.total_st || 0;
    if (totalWeeklyST >= 40) return false;
    
    return true;
  };

  const canIncrementOT = (lineCode: string): boolean => {
    // PTO and HOLIDAY lines don't allow OT
    const line = lines.find(l => l.line_code === lineCode);
    if (line && (lineCode === 'PTO' || lineCode === 'HOLIDAY')) {
      return false;
    }
    return true;
  };

  const handleIncrement = async (workDate: string, lineCode: string, type: 'st' | 'ot') => {
    const currentST = getEntryHours(workDate, lineCode, 'st');
    const currentOT = getEntryHours(workDate, lineCode, 'ot');
    
    if (type === 'st') {
      if (!canIncrementST(workDate, lineCode, currentST)) {
        if (currentST >= 8) {
          Alert.alert('Maximum Reached', 'ST hours cannot exceed 8 per day per line.');
        } else {
          Alert.alert('Weekly Limit', 'Total ST hours cannot exceed 40 per week.');
        }
        return;
      }
      await updateEntry(workDate, lineCode, currentST + 1, currentOT);
    } else {
      if (!canIncrementOT(lineCode)) {
        Alert.alert('Not Allowed', 'PTO and HOLIDAY lines cannot have overtime hours.');
        return;
      }
      await updateEntry(workDate, lineCode, currentST, currentOT + 1);
    }
  };

  const handleDecrement = async (workDate: string, lineCode: string, type: 'st' | 'ot') => {
    const currentST = getEntryHours(workDate, lineCode, 'st');
    const currentOT = getEntryHours(workDate, lineCode, 'ot');
    
    if (type === 'st' && currentST > 0) {
      await updateEntry(workDate, lineCode, currentST - 1, currentOT);
    } else if (type === 'ot' && currentOT > 0) {
      await updateEntry(workDate, lineCode, currentST, currentOT - 1);
    }
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

  const visibleLines = lines.filter(l => l.is_visible);
  const weekDays = weekInfo ? Array.from({ length: 7 }, (_, i) => {
    const startDate = new Date(weekInfo.week_start + 'T00:00:00');
    const date = addDays(startDate, i);
    return format(date, 'yyyy-MM-dd');
  }) : [];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.stickyHeader}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Weekly Timesheet</Text>
            {weekInfo?.is_pay_week && (
              <View style={styles.payWeekBadge}>
                <Ionicons name="cash" size={14} color="#ffffff" />
                <Text style={styles.payWeekText}>PAY WEEK</Text>
              </View>
            )}
          </View>
          <View style={styles.weekNavigation}>
            <Pressable style={styles.navButton} onPress={() => changeWeek('prev')}>
              <Ionicons name="chevron-back" size={24} color="#2563eb" />
            </Pressable>
            <View style={styles.weekInfo}>
              <Text style={styles.weekText}>
                {weekInfo ? `${format(new Date(weekInfo.week_start + 'T00:00:00'), 'MMM dd')} - ${format(new Date(weekInfo.week_end + 'T00:00:00'), 'MMM dd, yyyy')}` : ''}
              </Text>
            </View>
            <Pressable style={styles.navButton} onPress={() => changeWeek('next')}>
              <Ionicons name="chevron-forward" size={24} color="#2563eb" />
            </Pressable>
          </View>
        </View>

        {/* Summary Bar */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>ST</Text>
            <Text style={styles.summaryValue}>{weeklySummary?.total_st || 0}/40</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>OT</Text>
            <Text style={[styles.summaryValue, { color: '#dc2626' }]}>{weeklySummary?.total_ot || 0}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={[styles.summaryValue, { color: '#2563eb' }]}>{weeklySummary?.total_hours || 0}</Text>
          </View>
        </View>

        {/* Add Project Section */}
        <View style={styles.addProjectContainer}>
          {!showAddProject ? (
            <Pressable 
              style={styles.addProjectButton}
              onPress={() => setShowAddProject(true)}
            >
              <Ionicons name="add-circle" size={20} color="#2563eb" />
              <Text style={styles.addProjectButtonText}>Add Project Line</Text>
            </Pressable>
          ) : (
            <View style={styles.addProjectForm}>
              <TextInput
                style={styles.projectInput}
                placeholder="Enter project number (e.g., 6545)"
                value={projectNumber}
                onChangeText={setProjectNumber}
                keyboardType="numeric"
                autoFocus
              />
              <Pressable 
                style={styles.saveProjectButton}
                onPress={async () => {
                  if (projectNumber.trim()) {
                    try {
                      await addProjectLine(projectNumber.trim());
                      setProjectNumber('');
                      setShowAddProject(false);
                      Alert.alert('Success', `Project ${projectNumber} added`);
                    } catch (error) {
                      Alert.alert('Error', 'Failed to add project');
                    }
                  }
                }}
              >
                <Ionicons name="checkmark" size={20} color="#ffffff" />
              </Pressable>
              <Pressable 
                style={styles.cancelProjectButton}
                onPress={() => {
                  setProjectNumber('');
                  setShowAddProject(false);
                }}
              >
                <Ionicons name="close" size={20} color="#6b7280" />
              </Pressable>
            </View>
          )}
        </View>
      </View>

      {/* Grid with Sticky Headers */}
      <View style={styles.gridContainer}>
        {/* Fixed Day Headers */}
        <View style={styles.dayHeaderContainer}>
          <View style={styles.cornerCell}>
            <Text style={styles.lineHeaderText}>Line</Text>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            scrollEnabled={false}
            ref={(ref) => { headerDayScroll.current = ref; }}
          >
            {weekDays.map((day, index) => {
              const isWeekend = index === 0 || index === 6;
              const dayDate = new Date(day + 'T00:00:00');
              return (
                <View key={day} style={[styles.dayHeaderCell, isWeekend && styles.weekendHeader]}>
                  <Text style={[styles.dayHeaderText, isWeekend && styles.weekendHeaderText]}>
                    {dayNames[index]}
                  </Text>
                  <Text style={[styles.dateText, isWeekend && styles.weekendHeaderText]}>
                    {format(dayDate, 'M/d')}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* Main Content Area */}
        <View style={styles.contentArea}>
          {/* Fixed Line Names Column */}
          <ScrollView 
            style={styles.lineNamesColumn} 
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
            ref={(ref) => { sideLineScroll.current = ref; }}
          >
            {visibleLines.map((line) => (
              <View key={line.line_code} style={styles.lineNameCell}>
                <Text style={styles.lineNameText}>{line.label}</Text>
              </View>
            ))}
            <View style={[styles.lineNameCell, styles.totalsRow]}>
              <Text style={styles.totalLabelText}>Totals</Text>
            </View>
          </ScrollView>

          {/* Scrollable Data Grid */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            scrollEventThrottle={16}
            onScroll={(e) => {
              const offsetX = e.nativeEvent.contentOffset.x;
              if (headerDayScroll.current) {
                headerDayScroll.current.scrollTo({ x: offsetX, animated: false });
              }
            }}
          >
            <ScrollView 
              showsVerticalScrollIndicator={true}
              scrollEventThrottle={16}
              onScroll={(e) => {
                const offsetY = e.nativeEvent.contentOffset.y;
                if (sideLineScroll.current) {
                  sideLineScroll.current.scrollTo({ y: offsetY, animated: false });
                }
              }}
            >
              {visibleLines.map((line) => {
                const isPTOOrHoliday = line.line_code === 'PTO' || line.line_code === 'HOLIDAY';
                
                return (
                  <View key={line.line_code} style={styles.dataRow}>
                    {weekDays.map((day, dayIndex) => {
                    const isWeekend = dayIndex === 0 || dayIndex === 6;
                    const stHours = getEntryHours(day, line.line_code, 'st');
                    const otHours = getEntryHours(day, line.line_code, 'ot');
                    
                    return (
                      <View key={day} style={[styles.entryCell, isWeekend && styles.weekendCell]}>
                        {/* ST Section */}
                        <View style={styles.hoursSection}>
                          <Pressable 
                            style={[styles.controlButton, styles.minusButton]}
                            onPress={() => handleDecrement(day, line.line_code, 'st')}
                            disabled={stHours === 0}
                          >
                            <Text style={styles.controlButtonText}>-</Text>
                          </Pressable>
                          <View style={styles.valueContainer}>
                            <Text style={styles.valueText}>{stHours}</Text>
                            <Text style={styles.typeLabel}>ST</Text>
                          </View>
                          <Pressable 
                            style={[styles.controlButton, styles.plusButton]}
                            onPress={() => handleIncrement(day, line.line_code, 'st')}
                          >
                            <Text style={styles.controlButtonText}>+</Text>
                          </Pressable>
                        </View>
                        
                        {/* OT Section - Hidden for PTO/HOLIDAY */}
                        {!isPTOOrHoliday && (
                          <View style={[styles.hoursSection, { marginTop: 8 }]}>
                            <Pressable 
                              style={[styles.controlButton, styles.minusButton]}
                              onPress={() => handleDecrement(day, line.line_code, 'ot')}
                              disabled={otHours === 0}
                            >
                              <Text style={styles.controlButtonText}>-</Text>
                            </Pressable>
                            <View style={styles.valueContainer}>
                              <Text style={[styles.valueText, { color: '#dc2626' }]}>{otHours}</Text>
                              <Text style={styles.typeLabel}>OT</Text>
                            </View>
                            <Pressable 
                              style={[styles.controlButton, styles.plusButton]}
                              onPress={() => handleIncrement(day, line.line_code, 'ot')}
                            >
                              <Text style={styles.controlButtonText}>+</Text>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })}

              {/* Daily Totals Row */}
              <View style={[styles.dataRow, styles.totalsRow]}>
                {weekDays.map((day, dayIndex) => {
                  const isWeekend = dayIndex === 0 || dayIndex === 6;
                  const dayST = getDayTotal(day, 'st');
                  const dayOT = getDayTotal(day, 'ot');
                  
                  return (
                    <View key={day} style={[styles.totalCell, isWeekend && styles.weekendCell]}>
                      <Text style={styles.totalValue}>ST: {dayST}</Text>
                      <Text style={[styles.totalValue, { color: '#dc2626' }]}>OT: {dayOT}</Text>
                      <Text style={styles.totalValue}>= {dayST + dayOT}</Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </ScrollView>
        </View>
      </View>
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
  stickyHeader: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 100,
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  payWeekBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  payWeekText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  weekNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  weekInfo: {
    flex: 1,
    alignItems: 'center',
  },
  weekText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#ffffff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  gridContainer: {
    flex: 1,
    position: 'relative',
  },
  cornerCell: {
    width: 100,
    height: 60,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  dayHeaderContainer: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
    zIndex: 2,
  },
  mainScroll: {
    flex: 1,
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  lineHeaderCell: {
    width: 100,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  lineHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  dayHeaderCell: {
    width: 140,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  weekendHeader: {
    backgroundColor: '#fef3c7',
  },
  dayHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  weekendHeaderText: {
    color: '#92400e',
  },
  dateText: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  lineRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  totalsRow: {
    backgroundColor: '#f9fafb',
  },
  contentArea: {
    flex: 1,
    flexDirection: 'row',
  },
  lineNamesColumn: {
    width: 100,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  lineNameCell: {
    width: 100,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  lineNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  totalLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  entryCell: {
    width: 140,
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  weekendCell: {
    backgroundColor: '#fffbeb',
  },
  totalCell: {
    width: 140,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  hoursSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  minusButton: {
    backgroundColor: '#fee2e2',
  },
  plusButton: {
    backgroundColor: '#dbeafe',
  },
  controlButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
  },
  valueContainer: {
    alignItems: 'center',
  },
  valueText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  typeLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 2,
  },
  totalValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  addProjectContainer: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  addProjectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 8,
  },
  addProjectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  addProjectForm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  projectInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  saveProjectButton: {
    width: 40,
    height: 40,
    backgroundColor: '#22c55e',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelProjectButton: {
    width: 40,
    height: 40,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
