import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Platform, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, subMonths, subDays, startOfYear, startOfMonth, endOfMonth, differenceInDays, eachMonthOfInterval, parseISO } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { db } from '../services/databaseWrapper';

interface ReportsViewProps {
  currentUser?: any;
}

export default function ReportsView({ currentUser }: ReportsViewProps) {
  const [startDate, setStartDate] = useState(new Date(subMonths(new Date(), 1)));
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (currentUser) {
      setUserName(currentUser.user_name || '');
    }
  }, [currentUser]);

  const generateReport = async () => {
    setLoading(true);
    try {
      await db.initialize();
      
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');
      
      // Get all entries in date range
      const entries = await db.database.getAllAsync(
        'SELECT * FROM time_entries WHERE work_date >= ? AND work_date <= ? ORDER BY work_date, line_code',
        [startDateStr, endDateStr]
      );
      
      // Get all notes in date range
      const notes = await db.database.getAllAsync(
        'SELECT * FROM work_notes WHERE work_date >= ? AND work_date <= ? ORDER BY work_date, line_code',
        [startDateStr, endDateStr]
      );
      
      // Calculate totals
      let totalST = 0;
      let totalOT = 0;
      const lineCodeTotals: any = {};
      const uniqueDates = new Set();
      
      entries.forEach((entry: any) => {
        totalST += entry.st_hours || 0;
        totalOT += entry.ot_hours || 0;
        uniqueDates.add(entry.work_date);
        
        if (!lineCodeTotals[entry.line_code]) {
          lineCodeTotals[entry.line_code] = { st: 0, ot: 0, total: 0 };
        }
        lineCodeTotals[entry.line_code].st += entry.st_hours || 0;
        lineCodeTotals[entry.line_code].ot += entry.ot_hours || 0;
        lineCodeTotals[entry.line_code].total += (entry.st_hours || 0) + (entry.ot_hours || 0);
      });
      
      const totalHours = totalST + totalOT;
      const daysWorked = uniqueDates.size;
      const avgHoursPerDay = daysWorked > 0 ? (totalHours / daysWorked).toFixed(2) : 0;
      
      setReportData({
        entries,
        notes,
        totalST,
        totalOT,
        totalHours,
        daysWorked,
        avgHoursPerDay,
        lineCodeTotals,
        startDate: startDateStr,
        endDate: endDateStr,
      });
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Error', 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const setQuickRange = (rangeType: string) => {
    const today = new Date();
    let start = new Date();
    
    switch (rangeType) {
      case 'last30':
        start = subDays(today, 30);
        break;
      case 'last3months':
        start = subMonths(today, 3);
        break;
      case 'last6months':
        start = subMonths(today, 6);
        break;
      case 'lastyear':
        start = subMonths(today, 12);
        break;
      case 'ytd':
        start = startOfYear(today);
        break;
      case 'alltime':
        start = new Date(2020, 0, 1); // arbitrary early date
        break;
    }
    
    setStartDate(start);
    setEndDate(today);
  };

  const exportCSV = async () => {
    if (!reportData) return;
    
    try {
      // Build CSV content
      let csv = 'Date,Line Code,ST Hours,OT Hours,Total Hours,Notes\n';
      
      const entriesMap = new Map();
      reportData.entries.forEach((entry: any) => {
        const key = `${entry.work_date}_${entry.line_code}`;
        entriesMap.set(key, entry);
      });
      
      const notesMap = new Map();
      reportData.notes.forEach((note: any) => {
        const key = `${note.work_date}_${note.line_code}`;
        notesMap.set(key, note.note_text || '');
      });
      
      reportData.entries.forEach((entry: any) => {
        const key = `${entry.work_date}_${entry.line_code}`;
        const note = notesMap.get(key) || '';
        const cleanNote = note.replace(/"/g, '""'); // Escape quotes
        
        csv += `${entry.work_date},${entry.line_code},${entry.st_hours || 0},${entry.ot_hours || 0},${(entry.st_hours || 0) + (entry.ot_hours || 0)},"${cleanNote}"\n`;
      });
      
      // Save to file using cacheDirectory for sharing
      const fileName = `work_hours_report_${reportData.startDate}_to_${reportData.endDate}.csv`;
      const fileUri = FileSystem.cacheDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      console.log('CSV file created:', fileUri);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Share Work Hours Report CSV',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert('Success', `CSV saved to ${fileUri}`);
      }
    } catch (error: any) {
      console.error('Error exporting CSV:', error);
      Alert.alert('Error', `Failed to export CSV: ${error.message}`);
    }
  };

  const exportPDF = async () => {
    if (!reportData) return;
    
    try {
      const daysDiff = differenceInDays(endDate, startDate);
      const useMonthlyFormat = daysDiff > 90;
      
      let htmlContent = '';
      
      if (useMonthlyFormat) {
        // Monthly summary format
        htmlContent = generateMonthlySummaryHTML();
      } else {
        // Detailed daily format
        htmlContent = generateDetailedDailyHTML();
      }
      
      // Generate PDF using expo-print
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      
      console.log('PDF file created:', uri);
      
      // Share the PDF directly
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Work Hours Report',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Success', `PDF saved to ${uri}`);
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      Alert.alert('Error', 'Failed to export PDF');
    }
  };

  const generateMonthlySummaryHTML = () => {
    const months = eachMonthOfInterval({ start: startDate, end: endDate });
    
    let html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; margin-bottom: 10px; }
            .subtitle { text-align: center; color: #666; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f0f0f0; font-weight: bold; }
            .total-row { background-color: #f9f9f9; font-weight: bold; }
            .summary-box { background-color: #f0f0f0; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <h1>Work Hours Report - Monthly Summary</h1>
          <div class="subtitle">${format(startDate, 'MMM d, yyyy')} to ${format(endDate, 'MMM d, yyyy')}</div>
          ${userName ? `<div class="subtitle">Employee: ${userName}</div>` : ''}
          
          <div class="summary-box">
            <strong>Report Period Summary:</strong><br/>
            Total Hours: ${reportData.totalHours.toFixed(2)}<br/>
            Standard Time: ${reportData.totalST.toFixed(2)}<br/>
            Overtime: ${reportData.totalOT.toFixed(2)}<br/>
            Days Worked: ${reportData.daysWorked}<br/>
            Average Hours/Day: ${reportData.avgHoursPerDay}
          </div>
          
          <table>
            <tr>
              <th>Month</th>
              <th>Total Hours</th>
              <th>ST Hours</th>
              <th>OT Hours</th>
              <th>Days Worked</th>
            </tr>
    `;
    
    months.forEach(month => {
      const monthStart = format(startOfMonth(month), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(month), 'yyyy-MM-dd');
      
      let monthST = 0;
      let monthOT = 0;
      const monthDates = new Set();
      
      reportData.entries.forEach((entry: any) => {
        if (entry.work_date >= monthStart && entry.work_date <= monthEnd) {
          monthST += entry.st_hours || 0;
          monthOT += entry.ot_hours || 0;
          monthDates.add(entry.work_date);
        }
      });
      
      const monthTotal = monthST + monthOT;
      
      html += `
        <tr>
          <td>${format(month, 'MMMM yyyy')}</td>
          <td>${monthTotal.toFixed(2)}</td>
          <td>${monthST.toFixed(2)}</td>
          <td>${monthOT.toFixed(2)}</td>
          <td>${monthDates.size}</td>
        </tr>
      `;
    });
    
    html += `
            <tr class="total-row">
              <td>TOTAL</td>
              <td>${reportData.totalHours.toFixed(2)}</td>
              <td>${reportData.totalST.toFixed(2)}</td>
              <td>${reportData.totalOT.toFixed(2)}</td>
              <td>${reportData.daysWorked}</td>
            </tr>
          </table>
          
          <h3>Lines Worked Summary</h3>
          <table>
            <tr>
              <th>Line Code</th>
              <th>Total Hours</th>
              <th>ST Hours</th>
              <th>OT Hours</th>
            </tr>
    `;
    
    Object.entries(reportData.lineCodeTotals).forEach(([lineCode, totals]: [string, any]) => {
      html += `
        <tr>
          <td>${lineCode}</td>
          <td>${totals.total.toFixed(2)}</td>
          <td>${totals.st.toFixed(2)}</td>
          <td>${totals.ot.toFixed(2)}</td>
        </tr>
      `;
    });
    
    html += `
          </table>
        </body>
      </html>
    `;
    
    return html;
  };

  const generateDetailedDailyHTML = () => {
    // Group entries by date
    const dateGroups = new Map();
    
    reportData.entries.forEach((entry: any) => {
      if (!dateGroups.has(entry.work_date)) {
        dateGroups.set(entry.work_date, { entries: [], notes: [] });
      }
      dateGroups.get(entry.work_date).entries.push(entry);
    });
    
    reportData.notes.forEach((note: any) => {
      if (dateGroups.has(note.work_date)) {
        dateGroups.get(note.work_date).notes.push(note);
      }
    });
    
    let html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; font-size: 11px; }
            h1 { text-align: center; margin-bottom: 10px; font-size: 18px; }
            .subtitle { text-align: center; color: #666; margin-bottom: 20px; font-size: 12px; }
            .summary-box { background-color: #f0f0f0; padding: 10px; margin-bottom: 15px; border-radius: 5px; }
            .date-section { margin-bottom: 20px; page-break-inside: avoid; }
            .date-header { background-color: #e0e0e0; padding: 8px; font-weight: bold; margin-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
            th { background-color: #f0f0f0; font-weight: bold; }
            .notes { background-color: #fffbea; padding: 8px; margin-top: 5px; border-left: 3px solid #f59e0b; }
            .total-row { background-color: #f9f9f9; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Work Hours Report - Detailed</h1>
          <div class="subtitle">${format(startDate, 'MMM d, yyyy')} to ${format(endDate, 'MMM d, yyyy')}</div>
          ${userName ? `<div class="subtitle">Employee: ${userName}</div>` : ''}
          
          <div class="summary-box">
            <strong>Total Hours: ${reportData.totalHours.toFixed(2)}</strong> | 
            ST: ${reportData.totalST.toFixed(2)} | 
            OT: ${reportData.totalOT.toFixed(2)} | 
            Days: ${reportData.daysWorked} | 
            Avg/Day: ${reportData.avgHoursPerDay}
          </div>
    `;
    
    const sortedDates = Array.from(dateGroups.keys()).sort();
    
    sortedDates.forEach(date => {
      const dayData = dateGroups.get(date);
      let dayST = 0;
      let dayOT = 0;
      
      html += `
        <div class="date-section">
          <div class="date-header">${format(parseISO(date), 'EEEE, MMMM d, yyyy')}</div>
          <table>
            <tr>
              <th>Line Code</th>
              <th>ST Hours</th>
              <th>OT Hours</th>
              <th>Total</th>
            </tr>
      `;
      
      dayData.entries.forEach((entry: any) => {
        dayST += entry.st_hours || 0;
        dayOT += entry.ot_hours || 0;
        
        html += `
          <tr>
            <td>${entry.line_code}</td>
            <td>${(entry.st_hours || 0).toFixed(2)}</td>
            <td>${(entry.ot_hours || 0).toFixed(2)}</td>
            <td>${((entry.st_hours || 0) + (entry.ot_hours || 0)).toFixed(2)}</td>
          </tr>
        `;
      });
      
      html += `
            <tr class="total-row">
              <td>Day Total</td>
              <td>${dayST.toFixed(2)}</td>
              <td>${dayOT.toFixed(2)}</td>
              <td>${(dayST + dayOT).toFixed(2)}</td>
            </tr>
          </table>
      `;
      
      if (dayData.notes.length > 0) {
        html += '<div class="notes"><strong>Notes:</strong><br/>';
        dayData.notes.forEach((note: any) => {
          html += `${note.line_code}: ${note.note_text}<br/>`;
        });
        html += '</div>';
      }
      
      html += '</div>';
    });
    
    html += `
        </body>
      </html>
    `;
    
    return html;
  };

  return (
    <ScrollView style={styles.container}>
      {/* Date Range Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Date Range</Text>
        
        {/* Quick Presets */}
        <View style={styles.presetsContainer}>
          <TouchableOpacity style={styles.presetButton} onPress={() => setQuickRange('last30')}>
            <Text style={styles.presetButtonText}>Last 30 Days</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.presetButton} onPress={() => setQuickRange('last3months')}>
            <Text style={styles.presetButtonText}>Last 3 Months</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.presetButton} onPress={() => setQuickRange('last6months')}>
            <Text style={styles.presetButtonText}>Last 6 Months</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.presetButton} onPress={() => setQuickRange('lastyear')}>
            <Text style={styles.presetButtonText}>Last Year</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.presetButton} onPress={() => setQuickRange('ytd')}>
            <Text style={styles.presetButtonText}>Year to Date</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.presetButton} onPress={() => setQuickRange('alltime')}>
            <Text style={styles.presetButtonText}>All Time</Text>
          </TouchableOpacity>
        </View>
        
        {/* Custom Date Selection */}
        <View style={styles.customDatesContainer}>
          <View style={styles.datePickerRow}>
            <Text style={styles.dateLabel}>Start Date:</Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowStartPicker(true)}
            >
              <Text style={styles.dateButtonText}>{format(startDate, 'MMM d, yyyy')}</Text>
              <Ionicons name="calendar-outline" size={20} color="#2563eb" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.datePickerRow}>
            <Text style={styles.dateLabel}>End Date:</Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowEndPicker(true)}
            >
              <Text style={styles.dateButtonText}>{format(endDate, 'MMM d, yyyy')}</Text>
              <Ionicons name="calendar-outline" size={20} color="#2563eb" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Date Pickers */}
        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowStartPicker(false);
              if (selectedDate) setStartDate(selectedDate);
            }}
          />
        )}
        
        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowEndPicker(false);
              if (selectedDate) setEndDate(selectedDate);
            }}
          />
        )}
        
        {/* Optional Name Input for PDF */}
        <View style={styles.nameInputContainer}>
          <Text style={styles.inputLabel}>Employee Name (optional for PDF):</Text>
          <TextInput
            style={styles.nameInput}
            placeholder="Your name"
            value={userName}
            onChangeText={setUserName}
            autoCapitalize="words"
          />
        </View>
        
        {/* Generate Button */}
        <TouchableOpacity 
          style={styles.generateButton}
          onPress={generateReport}
          disabled={loading}
        >
          <Ionicons name="bar-chart" size={20} color="#ffffff" />
          <Text style={styles.generateButtonText}>
            {loading ? 'Generating...' : 'Generate Report'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Report Results */}
      {reportData && (
        <>
          {/* Summary Cards */}
          <View style={styles.summarySection}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Hours</Text>
              <Text style={styles.summaryValue}>{reportData.totalHours.toFixed(2)}</Text>
            </View>
            
            <View style={[styles.summaryCard, { backgroundColor: '#dbeafe' }]}>
              <Text style={styles.summaryLabel}>Standard Time</Text>
              <Text style={[styles.summaryValue, { color: '#1e40af' }]}>{reportData.totalST.toFixed(2)}</Text>
            </View>
            
            <View style={[styles.summaryCard, { backgroundColor: '#fee2e2' }]}>
              <Text style={styles.summaryLabel}>Overtime</Text>
              <Text style={[styles.summaryValue, { color: '#dc2626' }]}>{reportData.totalOT.toFixed(2)}</Text>
            </View>
            
            <View style={[styles.summaryCard, { backgroundColor: '#e0e7ff' }]}>
              <Text style={styles.summaryLabel}>Days Worked</Text>
              <Text style={[styles.summaryValue, { color: '#4f46e5' }]}>{reportData.daysWorked}</Text>
            </View>
            
            <View style={[styles.summaryCard, { backgroundColor: '#d1fae5' }]}>
              <Text style={styles.summaryLabel}>Avg Hours/Day</Text>
              <Text style={[styles.summaryValue, { color: '#065f46' }]}>{reportData.avgHoursPerDay}</Text>
            </View>
          </View>
          
          {/* Export Buttons */}
          <View style={styles.exportSection}>
            <TouchableOpacity style={styles.exportButton} onPress={exportCSV}>
              <Ionicons name="document-text" size={20} color="#ffffff" />
              <Text style={styles.exportButtonText}>Export CSV</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.exportButton, { backgroundColor: '#dc2626' }]} onPress={exportPDF}>
              <Ionicons name="document" size={20} color="#ffffff" />
              <Text style={styles.exportButtonText}>Export PDF</Text>
            </TouchableOpacity>
          </View>
          
          {/* Line Code Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hours by Line Code</Text>
            {Object.entries(reportData.lineCodeTotals)
              .sort(([, a]: any, [, b]: any) => b.total - a.total)
              .map(([lineCode, totals]: [string, any]) => (
                <View key={lineCode} style={styles.lineCard}>
                  <View style={styles.lineHeader}>
                    <Text style={styles.lineName}>{lineCode}</Text>
                    <Text style={styles.lineTotal}>{totals.total.toFixed(2)}h</Text>
                  </View>
                  <View style={styles.lineDetails}>
                    <Text style={styles.lineDetailText}>ST: {totals.st.toFixed(2)}h</Text>
                    <Text style={styles.lineDetailText}>OT: {totals.ot.toFixed(2)}h</Text>
                  </View>
                </View>
              ))}
          </View>
          
          {/* Notes Section */}
          {reportData.notes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Work Notes ({reportData.notes.length})</Text>
              {reportData.notes.slice(0, 10).map((note: any, index: number) => (
                <View key={index} style={styles.noteCard}>
                  <Text style={styles.noteDate}>{format(parseISO(note.work_date), 'MMM d, yyyy')} - {note.line_code}</Text>
                  <Text style={styles.noteText}>{note.note_text}</Text>
                </View>
              ))}
              {reportData.notes.length > 10 && (
                <Text style={styles.moreNotesText}>
                  + {reportData.notes.length - 10} more notes (included in exports)
                </Text>
              )}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  section: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  presetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetButton: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  presetButtonText: {
    color: '#1e40af',
    fontSize: 12,
    fontWeight: '600',
  },
  customDatesContainer: {
    gap: 12,
    marginBottom: 16,
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#111827',
  },
  nameInputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  nameInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
  },
  generateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  summarySection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  exportSection: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
  },
  exportButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  lineCard: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  lineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  lineName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  lineTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
  },
  lineDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  lineDetailText: {
    fontSize: 12,
    color: '#6b7280',
  },
  noteCard: {
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  noteDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 13,
    color: '#78350f',
  },
  moreNotesText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
});
