import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { db } from '../services/databaseWrapper';

export default function DebugInfoScreen() {
  const router = useRouter();
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDebugInfo();
  }, []);

  const loadDebugInfo = async () => {
    try {
      const info: any = {};

      // Get settings
      const settings = await db['db'].getAllAsync('SELECT * FROM settings');
      info.settings = settings;

      // Get all entries
      const entries = await db['db'].getAllAsync(
        'SELECT work_date, line_code, st_hours, ot_hours, week_ending_date, is_pay_week FROM time_entries ORDER BY work_date DESC LIMIT 20'
      );
      info.entries = entries;

      // Test week calculations
      const testDates = ['2025-11-17', '2025-11-10', '2025-11-03', '2025-10-27'];
      info.weekCalculations = [];
      
      for (const date of testDates) {
        const weekEnding = db.getWeekEnding(date);
        const isPay = await db.isPayWeek(weekEnding);
        
        // Calculate days diff manually to show
        const basePayWeek = settings.find((s: any) => s.key === 'base_pay_week_ending')?.value || '2025-11-29';
        const baseDate = new Date(basePayWeek + 'T00:00:00');
        const checkDate = new Date(weekEnding + 'T00:00:00');
        const daysDiff = Math.floor((checkDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
        
        info.weekCalculations.push({
          testDate: date,
          weekEnding,
          isPay,
          daysDiff,
          baseDate: basePayWeek
        });
      }

      // Test specific weeks that should be pay weeks
      info.payWeekTests = [];
      const payWeeks = ['2025-11-29', '2025-11-15', '2025-11-01', '2025-10-18'];
      for (const week of payWeeks) {
        const isPay = await db.isPayWeek(week);
        const basePayWeek = settings.find((s: any) => s.key === 'base_pay_week_ending')?.value || '2025-11-29';
        const baseDate = new Date(basePayWeek + 'T00:00:00');
        const checkDate = new Date(week + 'T00:00:00');
        const daysDiff = Math.floor((checkDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
        
        info.payWeekTests.push({
          week,
          isPay,
          daysDiff,
          shouldBePay: daysDiff % 14 === 0
        });
      }

      setDebugData(info);
    } catch (error) {
      console.error('Debug info error:', error);
      setDebugData({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </Pressable>
        <Text style={styles.title}>Debug Information</Text>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <Text style={styles.loading}>Loading debug info...</Text>
        ) : debugData?.error ? (
          <Text style={styles.error}>Error: {debugData.error}</Text>
        ) : (
          <>
            {/* Settings */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Database Settings</Text>
              {debugData?.settings?.map((setting: any, i: number) => (
                <Text key={i} style={styles.debugText}>
                  {setting.key}: {setting.value}
                </Text>
              ))}
            </View>

            {/* Week Calculations */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Week Ending Calculations</Text>
              {debugData?.weekCalculations?.map((calc: any, i: number) => (
                <View key={i} style={styles.calcItem}>
                  <Text style={styles.debugText}>
                    Date: {calc.testDate} → Week Ends: {calc.weekEnding}
                  </Text>
                  <Text style={styles.debugText}>
                    Days from base: {calc.daysDiff} | Pay Week: {calc.isPay ? 'YES' : 'NO'}
                  </Text>
                </View>
              ))}
            </View>

            {/* Pay Week Tests */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pay Week Tests (Should all be YES)</Text>
              {debugData?.payWeekTests?.map((test: any, i: number) => (
                <View key={i} style={[styles.calcItem, !test.isPay && styles.errorItem]}>
                  <Text style={styles.debugText}>
                    {test.week}: Days={test.daysDiff}, Result={test.isPay ? '✅' : '❌'}
                  </Text>
                  {!test.isPay && (
                    <Text style={styles.errorText}>
                      WRONG! Should be pay week (divisible by 14)
                    </Text>
                  )}
                </View>
              ))}
            </View>

            {/* Time Entries */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Time Entries</Text>
              {debugData?.entries?.length === 0 ? (
                <Text style={styles.debugText}>No entries found</Text>
              ) : (
                debugData?.entries?.map((entry: any, i: number) => (
                  <View key={i} style={styles.entryItem}>
                    <Text style={styles.debugText}>
                      {entry.work_date} ({entry.line_code}): {entry.st_hours}h ST, {entry.ot_hours}h OT
                    </Text>
                    <Text style={styles.debugTextSmall}>
                      Week Ending: {entry.week_ending_date} | Pay Week: {entry.is_pay_week ? 'YES' : 'NO'}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.refreshButton} onPress={loadDebugInfo}>
          <Ionicons name="refresh" size={20} color="#fff" />
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      </View>
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
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loading: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 32,
  },
  error: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
    marginTop: 32,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  debugText: {
    fontSize: 13,
    color: '#374151',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  debugTextSmall: {
    fontSize: 11,
    color: '#6b7280',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  calcItem: {
    backgroundColor: '#f9fafb',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  entryItem: {
    backgroundColor: '#f9fafb',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  errorItem: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
    marginTop: 4,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  refreshText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
