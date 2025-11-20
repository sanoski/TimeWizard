import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, TextInput, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../services/databaseWrapper';
import type { WorkNote } from '../services/database';

interface DailyNotesSectionProps {
  workDate: string;
  entries: Array<{ work_date: string; line_code: string; st_hours: number; ot_hours: number }>;
}

export default function DailyNotesSection({ workDate, entries }: DailyNotesSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [notes, setNotes] = useState<Record<string, WorkNote>>({});

  // Get entries for this specific date
  const dayEntries = entries.filter(e => e.work_date === workDate && (e.st_hours > 0 || e.ot_hours > 0));

  useEffect(() => {
    console.log('📝 DailyNotesSection rendered:', { workDate, totalEntries: entries.length, dayEntries: dayEntries.length });
    loadNotes();
  }, [workDate]);

  const loadNotes = async () => {
    try {
      const dayNotes = await db.getNotesByDate(workDate);
      const notesMap: Record<string, WorkNote> = {};
      dayNotes.forEach(note => {
        notesMap[note.line_code] = note;
      });
      setNotes(notesMap);
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const handleAddNote = (lineCode: string) => {
    setSelectedLine(lineCode);
    setNoteText(notes[lineCode]?.note_text || '');
    setModalVisible(true);
  };

  const handleSaveNote = async () => {
    if (!selectedLine || !noteText.trim()) {
      Alert.alert('Error', 'Please enter a note');
      return;
    }

    try {
      await db.saveNote(workDate, selectedLine, noteText.trim());
      await loadNotes();
      setModalVisible(false);
      setSelectedLine(null);
      setNoteText('');
    } catch (error) {
      console.error('Error saving note:', error);
      Alert.alert('Error', 'Failed to save note');
    }
  };

  const handleDeleteNote = async (lineCode: string) => {
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

  if (dayEntries.length === 0) {
    return null; // Don't show section if no hours logged this day
  }

  const notesCount = Object.keys(notes).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <Pressable 
        style={styles.header} 
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.headerLeft}>
          <Ionicons 
            name="document-text" 
            size={20} 
            color="#2563eb" 
            style={styles.headerIcon}
          />
          <Text style={styles.headerText}>Daily Notes</Text>
          {notesCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{notesCount}</Text>
            </View>
          )}
        </View>
        <Ionicons 
          name={expanded ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#6b7280" 
        />
      </Pressable>

      {/* Collapsible Content */}
      {expanded && (
        <View style={styles.content}>
          {dayEntries.map((entry) => {
            const hasNote = !!notes[entry.line_code];
            const note = notes[entry.line_code];
            
            return (
              <View key={entry.line_code} style={styles.lineItem}>
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
                      onPress={() => handleAddNote(entry.line_code)}
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
                    onPress={() => handleAddNote(entry.line_code)}
                  >
                    <Text style={styles.noteText} numberOfLines={2}>
                      {note.note_text}
                    </Text>
                    <Pressable 
                      style={styles.deleteButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteNote(entry.line_code);
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </Pressable>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Modal for adding/editing notes */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {notes[selectedLine!] ? 'Edit Note' : 'Add Note'}
              </Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </Pressable>
            </View>
            
            <Text style={styles.modalSubtitle}>
              {selectedLine} - {workDate}
            </Text>

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
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 8,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  badge: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingVertical: 8,
  },
  lineItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
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
    marginTop: 8,
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
