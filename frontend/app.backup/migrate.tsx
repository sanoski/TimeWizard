import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { db } from '../services/databaseWrapper';
import { migrateDataFromBackend } from '../services/migration';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MigrationScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<'initializing' | 'migrating' | 'success' | 'error' | 'skip'>('initializing');
  const [message, setMessage] = useState('Initializing local database...');

  useEffect(() => {
    initializeDatabase();
  }, []);

  const initializeDatabase = async () => {
    try {
      // Initialize the local database
      await db.initialize();
      setMessage('Database initialized successfully');
      
      // Check if migration has already been done
      const migrated = await AsyncStorage.getItem('migration_completed');
      
      if (migrated === 'true') {
        setMessage('Already migrated. Redirecting...');
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 1000);
        return;
      }

      // Show ready to migrate status
      setStatus('skip');
      setMessage('Ready to migrate data from server');
    } catch (error) {
      console.error('Database initialization error:', error);
      setStatus('error');
      setMessage(`Initialization failed: ${error.message}`);
    }
  };

  const handleMigrate = async () => {
    try {
      setStatus('migrating');
      setMessage('Fetching data from server...');

      const result = await migrateDataFromBackend();

      if (result.success) {
        // Mark migration as completed
        await AsyncStorage.setItem('migration_completed', 'true');
        
        setStatus('success');
        setMessage(result.message);
        
        // Redirect to main app after 2 seconds
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 2000);
      } else {
        setStatus('error');
        setMessage(result.message);
      }
    } catch (error) {
      setStatus('error');
      setMessage(`Migration error: ${error.message}`);
    }
  };

  const handleSkip = async () => {
    try {
      // Mark migration as completed (skipped)
      await AsyncStorage.setItem('migration_completed', 'true');
      setMessage('Starting with fresh database...');
      
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 500);
    } catch (error) {
      console.error('Error skipping migration:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          {status === 'initializing' && <ActivityIndicator size="large" color="#2563eb" />}
          {status === 'migrating' && <ActivityIndicator size="large" color="#2563eb" />}
          {status === 'success' && <Ionicons name="checkmark-circle" size={80} color="#22c55e" />}
          {status === 'error' && <Ionicons name="alert-circle" size={80} color="#dc2626" />}
          {status === 'skip' && <Ionicons name="cloud-download" size={80} color="#2563eb" />}
        </View>

        {/* Title */}
        <Text style={styles.title}>
          {status === 'initializing' && 'Setting Up'}
          {status === 'migrating' && 'Migrating Data'}
          {status === 'success' && 'Migration Complete!'}
          {status === 'error' && 'Migration Failed'}
          {status === 'skip' && 'Data Migration'}
        </Text>

        {/* Message */}
        <Text style={styles.message}>{message}</Text>

        {/* Description for skip status */}
        {status === 'skip' && (
          <View style={styles.descriptionBox}>
            <Text style={styles.description}>
              This app now stores data locally on your device for offline access.
              {'\n\n'}
              If you have existing timesheets on the server, click "Migrate Data" to transfer them to your device.
              {'\n\n'}
              Otherwise, click "Start Fresh" to begin with a clean database.
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        {status === 'skip' && (
          <View style={styles.buttonContainer}>
            <Pressable style={styles.primaryButton} onPress={handleMigrate}>
              <Ionicons name="download" size={20} color="#ffffff" />
              <Text style={styles.primaryButtonText}>Migrate Data</Text>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={handleSkip}>
              <Text style={styles.secondaryButtonText}>Start Fresh</Text>
            </Pressable>
          </View>
        )}

        {/* Retry button for errors */}
        {status === 'error' && (
          <View style={styles.buttonContainer}>
            <Pressable style={styles.primaryButton} onPress={handleMigrate}>
              <Ionicons name="refresh" size={20} color="#ffffff" />
              <Text style={styles.primaryButtonText}>Retry Migration</Text>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={handleSkip}>
              <Text style={styles.secondaryButtonText}>Skip & Start Fresh</Text>
            </Pressable>
          </View>
        )}

        {/* Info */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#2563eb" />
          <Text style={styles.infoText}>
            All your data will be stored securely on your device and work offline.
          </Text>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  descriptionBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  description: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    marginTop: 32,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
});
