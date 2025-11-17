import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTimesheetStore } from '../../store/timesheetStore';
import { format, subWeeks } from 'date-fns';
import { useFocusEffect } from 'expo-router';
import { db } from '../../services/database';

export default function HistoryScreen() {
  const { weekInfo, fetchWeekInfo, loading } = useTimesheetStore();
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [weekSummaries, setWeekSummaries] = useState<any[]>([]);
  const [loadingSummaries, setLoadingSummaries] = useState(false);

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
    }, [weekInfo])
  );

  useEffect(() => {
    if (weekInfo) {
      loadRecentWeeks();
    }
  }, [weekInfo]);

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

  const getWeekLabel = (weekEndingDate: string): string => {
    // Add time component to prevent timezone shifting
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
          <Text style={styles.headerSubtitle}>View past timesheets</Text>
        </View>
        <Ionicons name="time-outline" size={32} color="#2563eb" />
      </View>

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
                    
                    {/* Lines Used */}
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

                    {/* Line Breakdown */}
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

        {/* Info Card */}
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
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  payWeekBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  payWeekText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  totalHoursText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563eb',
  },
  quickStats: {
    flexDirection: 'row',
    gap: 8,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statPillLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  statPillValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
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
    marginBottom: 12,
  },
  detailSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  linesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  lineChip: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lineChipText: {
    fontSize: 11,
    color: '#2563eb',
    fontWeight: '500',
  },
  lineBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  lineBreakdownLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  lineBreakdownValues: {
    flexDirection: 'row',
    gap: 10,
  },
  lineBreakdownValue: {
    fontSize: 12,
    color: '#6b7280',
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563eb',
  },
  infoText: {
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
});
