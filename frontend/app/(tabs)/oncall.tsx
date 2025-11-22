import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../services/databaseWrapper';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSaturday, isSunday, isSameDay } from 'date-fns';

export default function OnCallScreen() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showUserSetup, setShowUserSetup] = useState(false);
  const [userName, setUserName] = useState('');
  const [schedule, setSchedule] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeOnCall();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadSchedule();
    }
  }, [currentMonth, currentUser]);

  const initializeOnCall = async () => {
    try {
      await db.initialize();
      const user = await db.getCurrentUser();
      
      if (!user) {
        setShowUserSetup(true);
      } else {
        setCurrentUser(user);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error initializing on-call:', error);
      Alert.alert('Error', 'Failed to initialize on-call schedule');
      setLoading(false);
    }
  };

  const loadSchedule = async () => {
    try {
      const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      const data = await db.getOnCallSchedule(start, end);
      setSchedule(data);
    } catch (error) {
      console.error('Error loading schedule:', error);
    }
  };

  const handleSaveUserName = async () => {
    if (!userName.trim()) {
      Alert.alert('Required', 'Please enter your name');
      return;
    }

    try {
      await db.addOnCallUser(userName.trim(), true);
      await db.setCurrentUser(userName.trim());
      const user = await db.getCurrentUser();
      setCurrentUser(user);
      setShowUserSetup(false);
      Alert.alert('Success', 'Your name has been saved!');
    } catch (error) {
      console.error('Error saving user name:', error);
      Alert.alert('Error', 'Failed to save your name');
    }
  };

  const getWeekendsInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    
    const weekends: Array<{ start: Date; end: Date }> = [];
    let currentWeekendStart: Date | null = null;

    days.forEach(day => {
      if (isSaturday(day)) {
        currentWeekendStart = day;
      } else if (isSunday(day) && currentWeekendStart) {
        weekends.push({ start: currentWeekendStart, end: day });
        currentWeekendStart = null;
      }
    });

    return weekends;
  };

  const getOnCallForWeekend = (weekendStart: Date, weekendEnd: Date) => {
    const startStr = format(weekendStart, 'yyyy-MM-dd');
    const endStr = format(weekendEnd, 'yyyy-MM-dd');
    
    return schedule.filter(s => s.start_date === startStr && s.end_date === endStr);
  };

  const isUserOnCall = (weekendPeople: any[]) => {
    if (!currentUser) return false;
    return weekendPeople.some(p => p.user_name === currentUser.user_name);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (showUserSetup) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.setupContainer}>
          <Ionicons name="person-circle" size={80} color="#2563eb" />
          <Text style={styles.setupTitle}>Welcome!</Text>
          <Text style={styles.setupText}>What's your name?</Text>
          <Text style={styles.setupSubtext}>This helps identify your on-call shifts</Text>
          
          <View style={styles.inputContainer}>
            <Ionicons name="person" size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              value={userName}
              onChangeText={setUserName}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleSaveUserName}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const weekends = getWeekendsInMonth();
  const myUpcomingShifts = schedule
    .filter(s => s.user_name === currentUser?.user_name && new Date(s.start_date) >= new Date())
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 3);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>On-Call Schedule</Text>
          <Text style={styles.userName}>Logged in as: {currentUser?.user_name}</Text>
        </View>

        {/* My Upcoming Shifts */}
        {myUpcomingShifts.length > 0 && (
          <View style={styles.upcomingSection}>
            <Text style={styles.sectionTitle}>My Upcoming Shifts</Text>
            {myUpcomingShifts.map((shift, index) => (
              <View key={index} style={styles.upcomingShift}>
                <Ionicons name="calendar" size={16} color="#2563eb" />
                <Text style={styles.upcomingShiftText}>
                  {format(new Date(shift.start_date), 'MMM d')} - {format(new Date(shift.end_date), 'd, yyyy')}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Month Navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <Ionicons name="chevron-back" size={24} color="#2563eb" />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{format(currentMonth, 'MMMM yyyy')}</Text>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <Ionicons name="chevron-forward" size="24" color="#2563eb" />
          </TouchableOpacity>
        </View>

        {/* Weekends List */}
        <View style={styles.weekendsList}>
          {weekends.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyStateText}>No weekends to display</Text>
            </View>
          ) : (
            weekends.map((weekend, index) => {
              const people = getOnCallForWeekend(weekend.start, weekend.end);
              const isMyShift = isUserOnCall(people);

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.weekendCard,
                    isMyShift && styles.myShiftCard
                  ]}
                >
                  <View style={styles.weekendHeader}>
                    <Text style={styles.weekendDate}>
                      {format(weekend.start, 'MMM d')} - {format(weekend.end, 'd, yyyy')}
                    </Text>
                    {isMyShift && (
                      <View style={styles.myShiftBadge}>
                        <Text style={styles.myShiftBadgeText}>YOU</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.peopleList}>
                    {people.length === 0 ? (
                      <Text style={styles.noPeople}>No one assigned</Text>
                    ) : (
                      people.map((person, pIndex) => (
                        <View key={pIndex} style={styles.personRow}>
                          <Ionicons name="person" size={16} color="#6b7280" />
                          <Text style={styles.personName}>{person.user_name}</Text>
                          {person.is_swapped === 1 && (
                            <View style={styles.swappedBadge}>
                              <Text style={styles.swappedText}>Swapped</Text>
                            </View>
                          )}
                        </View>
                      ))
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Import Button */}
        <TouchableOpacity
          style={styles.importButton}
          onPress={() => Alert.alert('Coming Soon', 'CSV import feature will be available soon')}
        >
          <Ionicons name="cloud-upload" size={20} color="#ffffff" />
          <Text style={styles.importButtonText}>Import Schedule</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  scrollView: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  setupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  setupTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginTop: 24,
    marginBottom: 8,
  },
  setupText: {
    fontSize: 18,
    color: '#374151',
    marginBottom: 4,
  },
  setupSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: '#111827',
    border: 'none',
    outline: 'none',
  },
  continueButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  userName: {
    fontSize: 14,
    color: '#6b7280',
  },
  upcomingSection: {
    backgroundColor: '#eff6ff',
    padding: 16,
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 12,
  },
  upcomingShift: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  upcomingShiftText: {
    fontSize: 14,
    color: '#1e40af',
    marginLeft: 8,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  weekendsList: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
  },
  weekendCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  myShiftCard: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  weekendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  weekendDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  myShiftBadge: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  myShiftBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  peopleList: {
    gap: 8,
  },
  noPeople: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  personName: {
    fontSize: 14,
    color: '#374151',
  },
  swappedBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  swappedText: {
    fontSize: 11,
    color: '#92400e',
    fontWeight: '600',
  },
  importButton: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  importButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
