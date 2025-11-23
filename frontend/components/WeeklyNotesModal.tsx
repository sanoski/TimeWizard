import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../services/databaseWrapper';
import type { WorkNote } from '../services/database';
import { format, addDays } from 'date-fns';

interface WeeklyNotesModalProps {
  visible: boolean;
  onClose: () => void;
  weekEnding: string;
  entries: Array<{ work_date: string; line_code: string; st_hours: number; ot_hours: number }>;
}

export default function WeeklyNotesModal({ visible, onClose, weekEnding, entries }: WeeklyNotesModalProps) {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [notes, setNotes] = useState<Record<string, WorkNote>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  // Calculate week dates
  const weekEnd = new Date(weekEnding + 'T00:00:00');
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekEnd);
    date.setDate(weekEnd.getDate() - (6 - i));
    return format(date, 'yyyy-MM-dd');
  });

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    if (visible) {
      loadNotes();
      // Default to today if it's in the current week
      const today = format(new Date(), 'yyyy-MM-dd');
      const todayIndex = weekDates.indexOf(today);
      if (todayIndex >= 0) {
        setSelectedDayIndex(todayIndex);
      }
    }
  }, [visible, weekEnding]);

  const loadNotes = async () => {
    try {
      const weekNotes = await db.getNotesByWeek(weekEnding);
      const notesMap: Record<string, WorkNote> = {};
      weekNotes.forEach((note: WorkNote) => {
        const key = `${note.work_date}-${note.line_code}`;
        notesMap[key] = note;
      });
      setNotes(notesMap);
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const selectedDate_calc = weekDates[selectedDayIndex];
  const dayEntries = entries.filter(e => e.work_date === selectedDate_calc && (e.st_hours > 0 || e.ot_hours > 0));

  const handleAddNote = (workDate: string, lineCode: string) => {
    const key = `${workDate}-${lineCode}`;
    setSelectedLine(lineCode);
    setSelectedDate(workDate);
    setNoteText(notes[key]?.note_text || '');
    setModalVisible(true);
  };

  const handleSaveNote = async () => {
    if (!selectedLine || !selectedDate || !noteText.trim()) {
      Alert.alert('Error', 'Please enter a note');
      return;
    }

    try {
      await db.saveNote(selectedDate, selectedLine, noteText.trim());
      await loadNotes();
      setModalVisible(false);
      setSelectedLine(null);
      setSelectedDate(null);
      setNoteText('');
    } catch (error) {
      console.error('Error saving note:', error);
      Alert.alert('Error', 'Failed to save note');
    }
  };

  const handleDeleteNote = async (workDate: string, lineCode: string) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await db.deleteNote(workDate, lineCode);
              await loadNotes();
            } catch (error) {
              console.error('Error deleting note:', error);
              Alert.alert('Error', 'Failed to delete note');
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Weekly Notes</Text>
              <Text style={styles.subtitle}>Week ending {format(weekEnd, 'MMM dd, yyyy')}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#6b7280" />
            </Pressable>
          </View>

          {/* Day Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
            {weekDates.map((date, index) => {
              const dateObj = new Date(date + 'T00:00:00');
              const dayName = dayNames[dateObj.getDay()];
              const dayNum = format(dateObj, 'd');
              const isSelected = index === selectedDayIndex;
              const dayHasEntries = entries.some(e => e.work_date === date && (e.st_hours > 0 || e.ot_hours > 0));
              const dayHasNotes = Object.keys(notes).some(key => key.startsWith(date));
              
              return (
                <Pressable
                  key={date}
                  style={[styles.tab, isSelected && styles.tabSelected]}
                  onPress={() => setSelectedDayIndex(index)}
                >
                  <Text style={[styles.tabDay, isSelected && styles.tabDaySelected]}>{dayName}</Text>
                  <Text style={[styles.tabDate, isSelected && styles.tabDateSelected]}>{dayNum}</Text>
                  {dayHasNotes && (
                    <View style={styles.noteDot} />
                  )}
                  {dayHasEntries && !dayHasNotes && (
                    <View style={styles.entryDot} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Content */}
          <ScrollView style={styles.content}>
            {dayEntries.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyText}>No hours logged for this day</Text>
                <Text style={styles.emptySubtext}>Log hours in the timesheet first</Text>
              </View>
            ) : (
              dayEntries.map((entry) => {
                const key = `${entry.work_date}-${entry.line_code}`;
                const hasNote = !!notes[key];
                const note = notes[key];
                
                return (
                  <View key={key} style={styles.lineItem}>
                    <View style={styles.lineHeader}>
                      <View style={styles.lineInfo}>
                        <Text style={styles.lineCode}>{entry.line_code}</Text>
                        <Text style={styles.lineHours}>
                          {entry.st_hours}h ST{entry.ot_hours > 0 ? `, ${entry.ot_hours}h OT` : ''}
                        </Text>
                      </View>
                      <View style={styles.actions}>
                        {hasNote && (
                          <Ionicons 
                            name="checkmark-circle" 
                            size={20} 
                            color="#10b981" 
                            style={styles.noteIndicator}
                          />
                        )}
                        <Pressable 
                          onPress={() => handleAddNote(entry.work_date, entry.line_code)}
                          style={styles.actionButton}
                        >
                          <Ionicons 
                            name={hasNote ? "create" : "add-circle"} 
                            size={24} 
                            color="#2563eb" 
                          />
                        </Pressable>
                      </View>
                    </View>
                    
                    {hasNote && note && (
                      <Pressable 
                        style={styles.notePreview}
                        onPress={() => handleAddNote(entry.work_date, entry.line_code)}
                      >
                        <Text style={styles.noteText} numberOfLines={3}>
                          {note.note_text}
                        </Text>
                        <Pressable 
                          style={styles.deleteButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleDeleteNote(entry.work_date, entry.line_code);
                          }}
                        >
                          <Ionicons name="trash-outline" size={18} color="#ef4444" />
                        </Pressable>
                      </Pressable>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Note Edit Modal */}
     <Modal
  visible={modalVisible}
  transparent
  animationType="slide"
  onRequestClose={() => setModalVisible(false)}
>
  <KeyboardAvoidingView 
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    style={{ flex: 1 }}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {notes[`${selectedDate}-${selectedLine}`] ? 'Edit Note' : 'Add Note'}
          </Text>
          <Pressable onPress={() => setModalVisible(false)}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </Pressable>
        </View>
        
        <Text style={styles.modalSubtitle}>
          {selectedLine} - {selectedDate}
        </Text>

        <ScrollView 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TextInput
            style={styles.textInput}
            value={noteText}
            onChangeText={setNoteText}
            placeholder="Enter your notes here..."
            multiline
            numberOfLines={10}
            textAlignVertical="top"
            autoFocus
          />
        </ScrollView>

        <View style={styles.modalActions}>
          <Pressable 
            style={[styles.button, styles.cancelButton]}
            onPress={() => setModalVisible(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable 
            style={[styles.button, styles.saveButton]}
            onPress={handleSaveNote}
          >
            <Text style={styles.saveButtonText}>Save Note</Text>
          </Pressable>
        </View>
      </View>
    </View>
  </KeyboardAvoidingView>
</Modal>
    </>
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
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
  },
  tabsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    position: 'relative',
  },
  tabSelected: {
    borderBottomColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  tabDay: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  tabDaySelected: {
    color: '#2563eb',
  },
  tabDate: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  tabDateSelected: {
    color: '#2563eb',
  },
  noteDot: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  entryDot: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d1d5db',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  lineItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  lineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lineInfo: {
    flex: 1,
  },
  lineCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  lineHours: {
    fontSize: 14,
    color: '#6b7280',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noteIndicator: {
    marginRight: 8,
  },
  actionButton: {
    padding: 4,
  },
  notePreview: {
    marginTop: 12,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  deleteButton: {
    marginLeft: 12,
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 200,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#2563eb',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
