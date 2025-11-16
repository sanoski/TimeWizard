import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTimesheetStore } from '../../store/timesheetStore';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';

export default function DashboardScreen() {
  const router = useRouter();
  const { 
    weekInfo, 
    weeklySummary, 
    loading, 
    fetchWeekInfo, 
    fetchWeeklySummary,
    fetchLines,
    fetchEntries
  } = useTimesheetStore();

  const [prevWeekSummary, setPrevWeekSummary] = React.useState<any>(null);
  const [payCycleTotals, setPayCycleTotals] = React.useState<any>(null);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    fetchLines();
    fetchWeekInfo(today).then(() => {
      if (weekInfo) {
        fetchWeeklySummary(weekInfo.week_ending_date);
      }
    });
  }, []);

  useEffect(() => {
    if (weekInfo) {
      fetchWeeklySummary(weekInfo.week_ending_date);
      
      // If it's a pay week, also fetch previous week's data
      if (weekInfo.is_pay_week) {
        const prevWeekEnd = new Date(weekInfo.week_ending_date + 'T00:00:00');
        prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);
        const prevWeekEndStr = format(prevWeekEnd, 'yyyy-MM-dd');
        
        fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/weekly-summary?week_ending=${prevWeekEndStr}`)
          .then(res => res.json())
          .then(data => {
            setPrevWeekSummary(data);
          });
      }
    }
  }, [weekInfo]);

  useEffect(() => {
    // Calculate pay cycle totals if it's a pay week
    if (weekInfo?.is_pay_week && weeklySummary && prevWeekSummary) {
      const totalST = weeklySummary.total_st + prevWeekSummary.total_st;
      const totalOT = weeklySummary.total_ot + prevWeekSummary.total_ot;
      const allLines = [...new Set([...weeklySummary.lines_used, ...prevWeekSummary.lines_used])];
      
      setPayCycleTotals({
        total_st: totalST,
        total_ot: totalOT,
        total_hours: totalST + totalOT,
        lines_used: allLines
      });
    }
  }, [weekInfo, weeklySummary, prevWeekSummary]);

  if (loading && !weekInfo) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  const stProgress = weeklySummary ? (weeklySummary.total_st / 40) * 100 : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>VRS Time Wizard</Text>
            <Text style={styles.headerSubtitle}>Track your railroad hours</Text>
          </View>
          <View style={styles.logoContainer}>
            <Ionicons name="train" size={32} color="#2563eb" />
          </View>
        </View>

        {/* Current Week / Pay Cycle Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>{weekInfo?.is_pay_week ? 'This Pay Cycle' : 'This Week'}</Text>
              <Text style={styles.weekEnding}>
                {weekInfo?.is_pay_week && payCycleTotals ? (
                  'Current + Previous Week'
                ) : (
                  `Week Ending: ${weekInfo ? format(new Date(weekInfo.week_ending_date + 'T00:00:00'), 'MMM dd, yyyy') : '-'}`
                )}
              </Text>
            </View>
            {weekInfo?.is_pay_week && (
              <View style={styles.payWeekBadge}>
                <Ionicons name="cash" size={16} color="#ffffff" />
                <Text style={styles.payWeekText}>PAY WEEK</Text>
              </View>
            )}
          </View>

          {/* Hours Summary */}
          <View style={styles.hoursContainer}>
            <View style={styles.hourBox}>
              <Text style={styles.hourLabel}>ST Hours</Text>
              <Text style={styles.hourValue}>
                {weekInfo?.is_pay_week && payCycleTotals ? payCycleTotals.total_st : (weeklySummary?.total_st || 0)}
              </Text>
              <Text style={styles.hourSubtext}>{weekInfo?.is_pay_week ? '2 weeks' : '/ 40 max'}</Text>
            </View>
            <View style={styles.hourBox}>
              <Text style={styles.hourLabel}>OT Hours</Text>
              <Text style={[styles.hourValue, { color: '#dc2626' }]}>
                {weekInfo?.is_pay_week && payCycleTotals ? payCycleTotals.total_ot : (weeklySummary?.total_ot || 0)}
              </Text>
              <Text style={styles.hourSubtext}>Overtime</Text>
            </View>
            <View style={styles.hourBox}>
              <Text style={styles.hourLabel}>Total</Text>
              <Text style={[styles.hourValue, { color: '#2563eb' }]}>
                {weekInfo?.is_pay_week && payCycleTotals ? payCycleTotals.total_hours : (weeklySummary?.total_hours || 0)}
              </Text>
              <Text style={styles.hourSubtext}>{weekInfo?.is_pay_week ? 'Pay cycle' : 'This week'}</Text>
            </View>
          </View>

          {/* Progress Bar - Only for current week ST */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>ST Progress {weekInfo?.is_pay_week ? '(This Week)' : ''}</Text>
              <Text style={styles.progressPercent}>{Math.min(stProgress, 100).toFixed(0)}%</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar, 
                  { 
                    width: `${Math.min(stProgress, 100)}%`,
                    backgroundColor: stProgress >= 100 ? '#22c55e' : '#2563eb'
                  }
                ]} 
              />
            </View>
            {stProgress >= 100 && (
              <View style={styles.warningBox}>
                <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                <Text style={styles.warningText}>40 hours ST reached! Additional hours will be OT.</Text>
              </View>
            )}
          </View>

          {/* Lines Used */}
          {weeklySummary && weeklySummary.lines_used.length > 0 && (
            <View style={styles.linesSection}>
              <Text style={styles.linesTitle}>Lines Worked This Week:</Text>
              <View style={styles.linesContainer}>
                {weeklySummary.lines_used.map((line) => (
                  <View key={line} style={styles.lineChip}>
                    <Text style={styles.lineChipText}>{line}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Go to Timesheet Button */}
          <Pressable 
            style={styles.primaryButton}
            onPress={() => router.push('/(tabs)/timesheet')}
          >
            <Ionicons name="calendar" size={20} color="#ffffff" />
            <Text style={styles.primaryButtonText}>Open Timesheet</Text>
          </Pressable>
        </View>

        {/* Quick Stats */}
        {weeklySummary && Object.keys(weeklySummary.line_totals).length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Hours by Line</Text>
            <View style={styles.statsContainer}>
              {Object.entries(weeklySummary.line_totals).map(([lineCode, totals]) => (
                <View key={lineCode} style={styles.statRow}>
                  <Text style={styles.statLabel}>{lineCode}</Text>
                  <View style={styles.statValues}>
                    <Text style={styles.statValue}>ST: {totals.st}</Text>
                    <Text style={[styles.statValue, { color: '#dc2626' }]}>OT: {totals.ot}</Text>
                    <Text style={[styles.statValue, { fontWeight: '600' }]}>Total: {totals.total}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Info Card */}
        <View style={[styles.card, { backgroundColor: '#eff6ff' }]}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={24} color="#2563eb" />
            <Text style={styles.infoTitle}>How It Works</Text>
          </View>
          <Text style={styles.infoText}>
            {'\u2022'} Work week: Sunday to Saturday{'\n'}
            {'\u2022'} ST hours max: 8/day, 40/week{'\n'}
            {'\u2022'} All hours beyond 40 ST are OT{'\n'}
            {'\u2022'} Pay weeks are every 2 weeks
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
  scrollView: {
    flex: 1,
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
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  weekEnding: {
    fontSize: 14,
    color: '#6b7280',
  },
  payWeekBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  payWeekText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  hoursContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  hourBox: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  hourLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  hourValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  hourSubtext: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
  },
  progressSection: {
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#15803d',
  },
  linesSection: {
    marginBottom: 16,
  },
  linesTitle: {
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
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  lineChipText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '500',
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    marginTop: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  statValues: {
    flexDirection: 'row',
    gap: 12,
  },
  statValue: {
    fontSize: 12,
    color: '#6b7280',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
});
