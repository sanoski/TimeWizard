import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, Alert, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTimesheetStore } from '../../store/timesheetStore';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

import { db } from '../../services/databaseWrapper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isAutoSyncEnabled, setAutoSyncEnabled, getLastSyncTime } from '../../services/autoSync';
import { DEFAULT_ONCALL_SCHEDULE_URL, APP_VERSION, APP_NAME } from '../../constants/config';

export default function SettingsScreen() {
  const { lines, fetchLines, toggleLineVisibility, addProjectLine, deleteProjectLine, exportData, importData } = useTimesheetStore();
  const [projectNumber, setProjectNumber] = useState('');
  const [loading, setLoading] = useState(false);
  
  // On-Call Sync state
  const [scheduleUrl, setScheduleUrl] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabledState] = useState(true);
  
  // Developer menu state
  const [versionTaps, setVersionTaps] = useState(0);
  const [showDevMenu, setShowDevMenu] = useState(false);

  useEffect(() => {
    fetchLines();
    loadSyncSettings();
    loadAutoSyncSettings();
  }, []);
  
  const loadAutoSyncSettings = async () => {
    const enabled = await isAutoSyncEnabled();
    setAutoSyncEnabledState(enabled);
    
    const lastSync = await getLastSyncTime();
    if (lastSync) {
      setLastSyncTime(lastSync.toISOString());
    }
  };
  
  const handleAutoSyncToggle = async (value: boolean) => {
    setAutoSyncEnabledState(value);
    await setAutoSyncEnabled(value);
    Alert.alert(
      value ? 'Auto-Sync Enabled' : 'Auto-Sync Disabled',
      value 
        ? 'Your schedule will automatically sync once per week when the app opens.' 
        : 'You will need to manually sync your schedule.'
    );
  };

  const loadSyncSettings = async () => {
    try {
      const savedUrl = await AsyncStorage.getItem('oncall_schedule_url');
      const savedTime = await AsyncStorage.getItem('oncall_last_sync');
      if (savedUrl) setScheduleUrl(savedUrl);
      if (savedTime) setLastSyncTime(savedTime);
    } catch (error) {
      console.error('Error loading sync settings:', error);
    }
  };

  const handleSyncSchedule = async () => {
    // Use custom URL if set, otherwise use default
    const urlToSync = scheduleUrl.trim() || DEFAULT_ONCALL_SCHEDULE_URL;

    setSyncing(true);
    try {
      console.log('📥 Syncing schedule from:', urlToSync);
      
      // Download CSV from URL
      const response = await fetch(urlToSync);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const csvText = await response.text();
      console.log('✅ Downloaded CSV:', csvText.substring(0, 200) + '...');
      
      // Parse CSV
      const lines = csvText.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      // Validate headers
      const requiredHeaders = ['start_date', 'end_date', 'user'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
      }
      
      // Parse data rows
      const scheduleData = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < 3 || !values[0]) continue; // Skip empty rows
        
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        
        scheduleData.push({
          start_date: row.start_date,
          end_date: row.end_date,
          user: row.user,
          notes: row.notes || ''
        });
      }
      
      console.log(`📅 Parsed ${scheduleData.length} schedule entries`);
      
      // Import into database
      await db.initialize();
      
      // Clear existing schedule before importing (replace, don't add)
      console.log('🗑️ Clearing existing on-call schedule...');
      await db.clearOnCallSchedule();
      
      await db.importOnCallSchedule(scheduleData);
      
      // Extract unique users and add them
      const uniqueUsers = [...new Set(scheduleData.map(s => s.user))];
      for (const user of uniqueUsers) {
        await db.addOnCallUser(user, false);
      }
      
      // Save URL and sync time
      await AsyncStorage.setItem('oncall_schedule_url', scheduleUrl.trim());
      const now = new Date().toISOString();
      await AsyncStorage.setItem('oncall_last_sync', now);
      setLastSyncTime(now);
      
      Alert.alert(
        'Sync Complete!',
        `Successfully imported ${scheduleData.length} schedule entries with ${uniqueUsers.length} users.`
      );
      
      console.log('✅ Sync complete');
    } catch (error: any) {
      console.error('❌ Sync error:', error);
      Alert.alert(
        'Sync Failed',
        error.message || 'Failed to sync schedule. Check the URL and try again.'
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleAddProject = async () => {
    if (!projectNumber.trim()) {
      Alert.alert('Error', 'Please enter a project number');
      return;
    }
    
    try {
      setLoading(true);
      await addProjectLine(projectNumber.trim());
      setProjectNumber('');
      Alert.alert('Success', `Project ${projectNumber} added successfully`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add project');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = (lineCode: string) => {
    Alert.alert(
      'Delete Project',
      `Are you sure you want to delete ${lineCode}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProjectLine(lineCode);
              Alert.alert('Success', 'Project deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete project');
            }
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    try {
      setLoading(true);
      const data = await exportData();
      const fileName = `vrs-timesheet-export-${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data, null, 2));
      
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri);
        Alert.alert('Success', 'Data exported successfully! You can now save or share the backup file.');
      } else {
        Alert.alert('Success', `Data exported to: ${fileUri}`);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  const handleImportData = async () => {
    Alert.alert(
      'Import Backup',
      'You will be asked to select a backup file. This will replace all current data with the data from the backup file. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Select File',
          style: 'default',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Pick a JSON file
              const result = await DocumentPicker.getDocumentAsync({
                type: 'application/json',
                copyToCacheDirectory: true,
              });

              if (result.canceled) {
                setLoading(false);
                return;
              }

              // Read the file content
              const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
              const importedData = JSON.parse(fileContent);

              // Validate the data structure
              if (!importedData.time_entries || !importedData.line_codes || !importedData.settings) {
                throw new Error('Invalid backup file format');
              }

              // Import the data
              await importData(importedData);

              Alert.alert(
                'Success', 
                `Imported ${importedData.time_entries.length} time entries successfully!`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Refresh the lines
                      fetchLines();
                    }
                  }
                ]
              );
            } catch (error: any) {
              console.error('Import error:', error);
              Alert.alert('Error', error.message || 'Failed to import data. Please ensure you selected a valid backup file.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const standardLines = lines.filter(l => !l.is_project);
  const projectLines = lines.filter(l => l.is_project);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Manage lines and preferences</Text>
        </View>
        <Ionicons name="settings-outline" size={32} color="#2563eb" />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Standard Lines */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="list" size={20} color="#374151" />
            <Text style={styles.sectionTitle}>Standard Lines</Text>
          </View>
          <View style={styles.card}>
            {standardLines.map((line) => (
              <View key={line.line_code} style={styles.lineRow}>
                <View style={styles.lineInfo}>
                  <Text style={styles.lineName}>{line.label}</Text>
                  {(line.line_code === 'PTO' || line.line_code === 'HOLIDAY') && (
                    <Text style={styles.lineNote}>(ST only)</Text>
                  )}
                </View>
                <Switch
                  value={line.is_visible}
                  onValueChange={(value) => toggleLineVisibility(line.line_code, value)}
                  trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                  thumbColor={line.is_visible ? '#2563eb' : '#f3f4f6'}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Project Lines */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="briefcase" size={20} color="#374151" />
            <Text style={styles.sectionTitle}>Project Lines</Text>
          </View>
          
          {/* Add Project Form */}
          <View style={styles.card}>
            <Text style={styles.formLabel}>Add New Project</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Enter project number (e.g., 6545)"
                value={projectNumber}
                onChangeText={setProjectNumber}
                keyboardType="numeric"
              />
              <Pressable 
                style={styles.addButton}
                onPress={handleAddProject}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="add" size={24} color="#ffffff" />
                )}
              </Pressable>
            </View>
          </View>

          {/* Project List */}
          {projectLines.length > 0 && (
            <View style={styles.card}>
              {projectLines.map((line) => (
                <View key={line.line_code} style={styles.projectRow}>
                  <View style={styles.projectInfo}>
                    <Text style={styles.projectName}>{line.label}</Text>
                    <Switch
                      value={line.is_visible}
                      onValueChange={(value) => toggleLineVisibility(line.line_code, value)}
                      trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                      thumbColor={line.is_visible ? '#2563eb' : '#f3f4f6'}
                    />
                  </View>
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => handleDeleteProject(line.line_code)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#dc2626" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* On-Call Schedule Sync */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="sync" size={20} color="#374151" />
            <Text style={styles.sectionTitle}>On-Call Schedule</Text>
          </View>
          <View style={styles.card}>
            {/* Auto-Sync Toggle */}
            <View style={styles.autoSyncRow}>
              <View style={styles.autoSyncInfo}>
                <Text style={styles.autoSyncLabel}>Auto-Sync (Weekly)</Text>
                <Text style={styles.autoSyncDesc}>Automatically sync when app opens (once per week)</Text>
              </View>
              <Switch
                value={autoSyncEnabled}
                onValueChange={handleAutoSyncToggle}
                trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                thumbColor={autoSyncEnabled ? '#2563eb' : '#f3f4f6'}
              />
            </View>
            
            {/* Manual Sync Button */}
            <Pressable 
              style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
              onPress={handleSyncSchedule}
              disabled={syncing}
            >
              {syncing ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="sync" size={20} color="#ffffff" />
              )}
              <Text style={styles.syncButtonText}>
                {syncing ? 'Syncing...' : 'Sync Now (Manual)'}
              </Text>
            </Pressable>
            {lastSyncTime && (
              <Text style={styles.lastSyncText}>
                Last synced: {new Date(lastSyncTime).toLocaleString()}
              </Text>
            )}
            <Text style={styles.urlInfoText}>
              📌 Using master schedule (hardcoded for all users)
            </Text>
          </View>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cloud-download" size={20} color="#374151" />
            <Text style={styles.sectionTitle}>Backup & Restore</Text>
          </View>
          <View style={styles.card}>
            {/* Export Button */}
            <Pressable 
              style={styles.actionButton}
              onPress={handleExportData}
              disabled={loading}
            >
              <View style={styles.actionButtonContent}>
                <Ionicons name="download-outline" size={24} color="#2563eb" />
                <View style={styles.actionButtonText}>
                  <Text style={styles.actionButtonTitle}>Export Backup</Text>
                  <Text style={styles.actionButtonSubtitle}>Save all timesheet data to a file</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </Pressable>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Import Button */}
            <Pressable 
              style={styles.actionButton}
              onPress={handleImportData}
              disabled={loading}
            >
              <View style={styles.actionButtonContent}>
                <Ionicons name="cloud-upload-outline" size={24} color="#10b981" />
                <View style={styles.actionButtonText}>
                  <Text style={styles.actionButtonTitle}>Import Backup</Text>
                  <Text style={styles.actionButtonSubtitle}>Restore data from backup file</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </Pressable>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.aboutContent}>
              <View style={styles.logoContainer}>
                <Ionicons name="train" size={40} color="#2563eb" />
              </View>
              <Text style={styles.appName}>{APP_NAME}</Text>
              <Pressable
                onPress={async () => {
                  const newTaps = versionTaps + 1;
                  setVersionTaps(newTaps);
                  if (newTaps >= 5) {
                    setShowDevMenu(true);
                    setVersionTaps(0);
                    await AsyncStorage.setItem('dev_menu_enabled', 'true');
                    Alert.alert('Developer Menu', 'Developer menu unlocked!');
                  }
                }}
              >
                <Text style={styles.appVersion}>Version {APP_VERSION}</Text>
              </Pressable>
              <Text style={styles.appDescription}>
                Railroad timesheet tracking for MOW crews
              </Text>
            </View>
          </View>
        </View>
        
        {/* Developer Menu */}
        {showDevMenu && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="code" size={20} color="#dc2626" />
              <Text style={[styles.sectionTitle, { color: '#dc2626' }]}>Developer Menu</Text>
            </View>
            <View style={[styles.card, { borderColor: '#dc2626', borderWidth: 2 }]}>
              <Text style={styles.inputLabel}>Master Schedule URL</Text>
              <TextInput
                style={styles.urlInput}
                placeholder="https://docs.google.com/spreadsheets/.../export?format=csv"
                value={scheduleUrl}
                onChangeText={setScheduleUrl}
                autoCapitalize="none"
                autoCorrect={false}
                multiline
              />
              <Pressable
                style={[styles.actionButton, { backgroundColor: '#dc2626' }]}
                onPress={async () => {
                  if (scheduleUrl.trim()) {
                    await AsyncStorage.setItem('oncall_schedule_url', scheduleUrl.trim());
                    Alert.alert('Saved', 'Master schedule URL saved successfully');
                  }
                }}
              >
                <Ionicons name="save" size={20} color="#ffffff" />
                <Text style={styles.actionButtonText}>Save URL</Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, { backgroundColor: '#f59e0b', marginTop: 12 }]}
                onPress={async () => {
                  Alert.alert(
                    'Clear All On-Call Data?',
                    'This will delete all on-call schedule data. Are you sure?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Clear',
                        style: 'destructive',
                        onPress: async () => {
                          await db.initialize();
                          await db.clearOnCallSchedule();
                          Alert.alert('Cleared', 'All on-call data has been cleared');
                        }
                      }
                    ]
                  );
                }}
              >
                <Ionicons name="trash" size={20} color="#ffffff" />
                <Text style={styles.actionButtonText}>Clear On-Call Data</Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, { backgroundColor: '#6b7280', marginTop: 12 }]}
                onPress={async () => {
                  setShowDevMenu(false);
                  await AsyncStorage.setItem('dev_menu_enabled', 'false');
                }}
              >
                <Ionicons name="close" size={20} color="#ffffff" />
                <Text style={styles.actionButtonText}>Close Developer Menu</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Debug Button */}
        <View style={styles.section}>
          <View style={styles.card}>
            <Pressable 
              style={styles.actionButton}
              onPress={() => require('expo-router').router.push('/debug-info')}
            >
              <View style={styles.actionButtonContent}>
                <Ionicons name="bug-outline" size={24} color="#f59e0b" />
                <View style={styles.actionButtonText}>
                  <Text style={styles.actionButtonTitle}>Debug Information</Text>
                  <Text style={styles.actionButtonSubtitle}>View technical details and diagnostics</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </Pressable>
          </View>
        </View>

        {/* Info */}
        <View style={[styles.card, { backgroundColor: '#eff6ff', marginHorizontal: 16, marginBottom: 16 }]}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color="#2563eb" />
            <Text style={styles.infoTitle}>About Settings</Text>
          </View>
          <Text style={styles.infoText}>
            {'\u2022'} Toggle line visibility to show/hide in timesheet{'\n'}
            {'\u2022'} Add project numbers as needed{'\n'}
            {'\u2022'} Export backup to save or share your data{'\n'}
            {'\u2022'} Import backup to restore from a previous export{'\n'}
            {'\u2022'} All data stored locally on your device
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
  section: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  lineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lineName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  lineNote: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#111827',
  },
  addButton: {
    width: 48,
    height: 48,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  projectInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: 12,
  },
  projectName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  deleteButton: {
    padding: 8,
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  actionButtonText: {
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  actionButtonSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  aboutContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  appDescription: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
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
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  urlInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  syncButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  syncButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  lastSyncText: {
    marginTop: 12,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  autoSyncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 16,
  },
  autoSyncInfo: {
    flex: 1,
    marginRight: 12,
  },
  autoSyncLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  autoSyncDesc: {
    fontSize: 12,
    color: '#6b7280',
  },
  urlInfoText: {
    marginTop: 12,
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  noUrlText: {
    marginTop: 12,
    fontSize: 12,
    color: '#dc2626',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
