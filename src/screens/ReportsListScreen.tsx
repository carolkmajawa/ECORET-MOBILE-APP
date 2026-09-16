// src/screens/ReportsListScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  Share,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../theme/colors';
import { groupAPI } from '../api/endpoints';
import { reportAPI, Report } from '../api/reportService';

export default function ReportsListScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [groupName, setGroupName] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const groupsResponse = await groupAPI.getGroups();
      const groupsData = Array.isArray(groupsResponse.data) 
        ? groupsResponse.data 
        : groupsResponse.data?.results || [];
      setGroups(groupsData);
      
      if (groupsData.length > 0) {
        setSelectedGroup(groupsData[0].id);
        setGroupName(groupsData[0].group_name);
        await loadReports(groupsData[0].id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async (groupId: string) => {
    try {
      const response = await reportAPI.getReports();
      const reportsData = Array.isArray(response.data) 
        ? response.data 
        : response.data?.results || [];
      
      // ONLY show completed reports in the list
      const completedReports = reportsData.filter((r: Report) => 
        r.group === groupId && r.status === 'completed' && r.file_exists
      );
      setReports(completedReports);
    } catch (error) {
      console.error('Error loading reports:', error);
      setReports([]);
    }
  };

  const handleDownloadReport = async (reportId: string) => {
    try {
      const response = await reportAPI.downloadReport(reportId);
      
      if (Platform.OS === 'web') {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.download = `report_${reportId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        await Share.share({
          url: response.config.url || '',
          title: 'Download Report',
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to download report');
    }
  };

  const handleDeleteReport = (reportId: string, reportName: string) => {
    Alert.alert(
      'Delete Report',
      `Are you sure you want to delete this report?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await reportAPI.deleteReport(reportId);
              Alert.alert('Success', 'Report deleted successfully');
              await loadReports(selectedGroup);
            } catch (error: any) {
              console.error('Delete error:', error);
              Alert.alert('Error', error?.response?.data?.error || 'Failed to delete report');
            }
          }
        }
      ]
    );
  };

  const handleShareToEcoret = (reportId: string) => {
    Alert.alert(
      'Share Report',
      'How would you like to share this report with ECORET?',
      [
        {
          text: '📧 Email',
          onPress: () => {
            const subject = 'ECORET Report';
            const body = 'Please find attached the ECORET report.';
            const url = `mailto:info@ecoret.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            Linking.openURL(url).catch(() => {
              Alert.alert('Error', 'Could not open email app');
            });
          }
        },
        {
          text: '📱 Share Link',
          onPress: () => {
            const reportUrl = `http://192.168.1.103:8000/api/reports/${reportId}/download/`;
            Share.share({
              message: `ECORET Report: ${reportUrl}`,
              title: 'Share Report',
            }).catch(() => {
              Alert.alert('Error', 'Could not share report');
            });
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary || '#C50982'} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>📄 Completed Reports</Text>
          <TouchableOpacity 
            style={styles.newReportButton}
            onPress={() => navigation.navigate('ReportGeneration')}
          >
            <Icon name="add-circle-outline" size={28} color={colors.primary || '#C50982'} />
          </TouchableOpacity>
        </View>

        {/* Group Info */}
        {groupName && (
          <View style={styles.groupCard}>
            <Icon name="business-outline" size={20} color={colors.primary || '#C50982'} />
            <Text style={styles.groupName}>{groupName}</Text>
            <Text style={styles.reportCount}>{reports.length} reports</Text>
          </View>
        )}

        {/* Reports List */}
        {reports.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="document-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No Completed Reports</Text>
            <Text style={styles.emptySubtext}>
              Generate and complete a report to see it here
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('ReportGeneration')}
            >
              <Text style={styles.emptyButtonText}>Generate Report</Text>
            </TouchableOpacity>
          </View>
        ) : (
          reports.map((report) => (
            <View key={report.id} style={styles.reportCard}>
              {/* Report Info */}
              <View style={styles.reportInfo}>
                <View style={styles.reportHeaderRow}>
                  <Text style={styles.reportTitle}>
                    {report.report_type?.replace('_', ' ').toUpperCase() || 'Report'}
                  </Text>
                  <View style={styles.statusBadge}>
                    <Icon name="checkmark-circle" size={16} color="#16a34a" />
                    <Text style={styles.statusText}>✅ Completed</Text>
                  </View>
                </View>
                <Text style={styles.reportDate}>
                  📅 {report.start_date ? new Date(report.start_date).toLocaleDateString() : 'N/A'} - {report.end_date ? new Date(report.end_date).toLocaleDateString() : 'N/A'}
                </Text>
                <Text style={styles.reportMeta}>
                  🕐 Generated: {report.created_at ? new Date(report.created_at).toLocaleString() : 'N/A'}
                </Text>
                {report.download_count > 0 && (
                  <Text style={styles.reportMeta}>
                    📥 Downloads: {report.download_count}
                  </Text>
                )}
                {report.file_size > 0 && (
                  <Text style={styles.reportMeta}>
                    📦 Size: {(report.file_size / 1024).toFixed(1)} KB
                  </Text>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.downloadButton]}
                  onPress={() => handleDownloadReport(report.id)}
                >
                  <Icon name="download" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Download</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.shareButton]}
                  onPress={() => handleShareToEcoret(report.id)}
                >
                  <Icon name="send" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Send to ECORET</Text>
                </TouchableOpacity>
              </View>

              {/* Delete Button */}
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteReport(report.id, report.report_type || 'Report')}
              >
                <Icon name="trash-outline" size={16} color="#dc2626" />
                <Text style={styles.deleteButtonText}>Delete Report</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  newReportButton: {
    padding: 8,
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  groupName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  reportCount: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 20,
    backgroundColor: colors.primary || '#C50982',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  reportCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  reportHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  reportInfo: {
    marginBottom: 12,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16a34a',
    marginLeft: 4,
  },
  reportDate: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 2,
  },
  reportMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    flex: 1,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  downloadButton: {
    backgroundColor: colors.primary || '#C50982',
  },
  shareButton: {
    backgroundColor: '#0B6B80',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 4,
  },
  deleteButtonText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
});