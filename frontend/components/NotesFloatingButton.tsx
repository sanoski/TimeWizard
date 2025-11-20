import React, { useState, useEffect } from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../services/databaseWrapper';
import WeeklyNotesModal from './WeeklyNotesModal';

interface NotesFloatingButtonProps {
  weekEnding: string;
  entries: Array<{ work_date: string; line_code: string; st_hours: number; ot_hours: number }>;
}

export default function NotesFloatingButton({ workDate, entries }: NotesFloatingButtonProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [notesCount, setNotesCount] = useState(0);

  useEffect(() => {
    console.log('🔍 NotesFloatingButton:', { 
      workDate, 
      totalEntries: entries.length,
      entriesForDate: entries.filter(e => e.work_date === workDate).length,
      firstFewEntries: entries.slice(0, 3).map(e => ({ date: e.work_date, line: e.line_code, st: e.st_hours, ot: e.ot_hours }))
    });
    loadNotesCount();
  }, [workDate, entries]);

  const loadNotesCount = async () => {
    try {
      const dayNotes = await db.getNotesByDate(workDate);
      setNotesCount(dayNotes.length);
    } catch (error) {
      console.error('Error loading notes count:', error);
    }
  };

  const dayEntries = entries.filter(e => e.work_date === workDate && (e.st_hours > 0 || e.ot_hours > 0));

  console.log('📝 NotesButton render:', { dayEntriesCount: dayEntries.length, willShow: dayEntries.length > 0 });

  // ALWAYS show the button - let users add notes even before logging hours
  // if (dayEntries.length === 0) {
  //   return null;
  // }

  return (
    <>
      {/* Floating Button */}
      <Pressable 
        style={styles.floatingButton}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="document-text" size={24} color="#fff" />
        {notesCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{notesCount}</Text>
          </View>
        )}
      </Pressable>

      {/* Modal with Notes */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Daily Notes</Text>
              <Text style={styles.modalSubtitle}>{workDate}</Text>
            </View>
            <Pressable onPress={() => setModalVisible(false)} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#6b7280" />
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <DailyNotesSection 
              workDate={workDate}
              entries={entries}
            />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
});
