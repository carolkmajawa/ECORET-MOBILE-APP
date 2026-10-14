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
  Share,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../theme/colors';
import { groupAPI } from '../api/endpoints';
import { reportAPI, Report } from '../api/reportService';

type ReportPeriod = 'this_cycle' | 'last_cycle' | 'this_month' | 'last_month' | 'custom' | 'all_time';

const SECTIONS = [
  { id: 'group_info', label: 'Group Information', icon: 'business-outline' },
  { id: 'cycle_info', label: 'Cycle Details', icon: 'calendar-outline' },
  { id: 'members', label: 'Member List', icon: 'people-outline' },
  { id: 'contributions', label: 'Contributions', icon: 'cash-outline' },
  { id: 'loans', label: 'Loan Summary', icon: 'file-tray-outline' },
  { id: 'transactions', label: 'Transactions', icon: 'receipt-outline' },
  { id: 'attendance', label: 'Attendance', icon: 'calendar-number-outline' },
  { id: 'performance', label: 'Member Performance', icon: 'stats-chart-outline' },
  { id: 'financial_summary', label: 'Financial Summary', icon: 'calculator-outline' },
];

const PERIOD_OPTIONS = [
  { id: 'this_cycle', label: 'This Cycle' },
  { id: 'last_cycle', label: 'Last Cycle' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'custom', label: 'Custom Range' },
  { id: 'all_time', label: 'All Time' },
];

const FORMAT_OPTIONS = [
  { id: 'pdf', label: 'PDF', icon: 'document-text-outline' },
  { id: 'excel', label: 'Excel', icon: 'grid-outline' },
  { id: 'both', label: 'Both', icon: 'documents-outline' },
];

// Alert.alert does nothing on react-native-web, so use window.alert there.
const notify = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function ReportGenerationScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [groupName, setGroupName] = useState<string>('');
  const [period, setPeriod] = useState<ReportPeriod>('this_cycle');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [includeMembers, setIncludeMembers] = useState<string[]>([]);
  const [includeSections, setIncludeSections] = useState<string[]>(SECTIONS.map(s => s.id));
  const [reportFormat, setReportFormat] = useState<'pdf' | 'excel' | 'both'>('pdf');

  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [showSectionSelector, setShowSectionSelector] = useState(false);
  const [showFormatSelector, setShowFormatSelector] = useState(false);
  const [showGroupSelector, setShowGroupSelector] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // While any report is still generating, re-check every 3 seconds.
  // Stops by itself once nothing is generating.
  useEffect(() => {
    if (!selectedGroup || !reports.some((r) => r.status === 'generating')) return;
    const t = setTimeout(() => loadReports(selectedGroup), 3000);
    return () => clearTimeout(t);
  }, [reports, selectedGroup]);

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
      notify('Error', 'Failed to load data');
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
      setReports(reportsData.filter((r: Report) => r.group === groupId));
    } catch (error) {
      console.error('Error loading reports:', error);
      setReports([]);
    }
  };

  const handleGroupChange = (groupId: string) => {
    setSelectedGroup(groupId);
    const group = groups.find(g => g.id === groupId);
    setGroupName(group?.group_name || '');
    loadReports(groupId);
    setShowGroupSelector(false);
  };

  const handlePeriodChange = (selectedPeriod: ReportPeriod) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (selectedPeriod) {
      case 'this_cycle': {
        const group = groups.find(g => g.id === selectedGroup);
        if (group?.cycle_start_date && group?.cycle_end_date) {
          start = new Date(group.cycle_start_date);
          end = new Date(group.cycle_end_date);
        }
        break;
      }
      case 'this_month': {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      }
      case 'last_month': {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      }
      case 'all_time': {
        start = new Date(2020, 0, 1);
        end = now;
        break;
      }
      default:
        break;
    }

    setPeriod(selectedPeriod);
    setStartDate(start);
    setEndDate(end);
    setShowPeriodDropdown(false);
  };

  const toggleSection = (sectionId: string) => {
    setIncludeSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleDownloadReport = async (report: Report) => {
    try {
      const response = await reportAPI.downloadReport(report.id);

      const isExcel = report.format === 'excel';
      const ext = isExcel ? 'xlsx' : 'pdf';
      const mime = isExcel
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';

      // Prefer the server-provided filename if the header is exposed,
      // otherwise fall back to a format-based name.
      const disposition = response.headers?.['content-disposition'] || '';
      const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
      const filename = match
        ? decodeURIComponent(match[1])
        : `report_${report.id}.${ext}`;

      if (Platform.OS === 'web') {
        const url = window.URL.createObjectURL(new Blob([response.data], { type: mime }));
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
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
      console.error('Download report failed:', error);
      notify('Error', 'Failed to download report');
    }
  };

  const handleDeleteReport = (reportId: string) => {
    const doDelete = async () => {
      try {
        await reportAPI.deleteReport(reportId);
        notify('Success', 'Report deleted successfully');
        await loadReports(selectedGroup);
      } catch (error: any) {
        notify('Error', error?.response?.data?.error || 'Failed to delete report');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this report?')) {
        doDelete();
      }
      return;
    }

    Alert.alert('Delete Report', 'Are you sure you want to delete this report?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doDelete },
    ]);
  };

  const handleRegenerateReport = (reportId: string) => {
    const doRegenerate = async () => {
      try {
        await reportAPI.regenerateReport(reportId);
        notify('Success', 'Report regeneration started');
        await loadReports(selectedGroup);
      } catch (error: any) {
        notify('Error', error?.response?.data?.error || 'Failed to regenerate report');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('This will create a new version of the report with updated data. Continue?')) {
        doRegenerate();
      }
      return;
    }

    Alert.alert('Regenerate Report', 'This will create a new version of the report with updated data.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Regenerate', onPress: doRegenerate },
    ]);
  };

  const handleGenerateReport = async () => {
    if (!selectedGroup) {
      notify('Error', 'Please select a group');
      return;
    }

    if (startDate > endDate) {
      notify('Error', 'Start date must be before end date');
      return;
    }

    setGenerating(true);
    try {
      const payload = {
        group_id: selectedGroup,
        period: period,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        include_members: includeMembers,
        include_sections: includeSections,
        format: reportFormat,
      };

      await reportAPI.generateReport(payload);
      await loadReports(selectedGroup);
      notify('Report generation started', 'It will appear under Recent Reports when ready.');
    } catch (error: any) {
      console.error('Generate report failed:', error?.response?.data || error);
      const data = error?.response?.data;
      const msg =
        data?.error ||
        data?.detail ||
        (typeof data === 'string' ? data.slice(0, 200) : '') ||
        error?.message ||
        'Failed to generate report';
      notify('Error', msg);
    } finally {
      // Always runs, even where the alert never shows (web)
      setGenerating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#16a34a';
      case 'generating': return '#d97706';
      case 'failed': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return 'checkmark-circle';
      case 'generating': return 'refresh';
      case 'failed': return 'alert-circle';
      default: return 'time';
    }
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>📊 Generate Report</Text>
          <TouchableOpacity
            style={styles.viewReportsButton}
            onPress={() => navigation.navigate('ReportsList')}
          >
            <Icon name="folder-open-outline" size={22} color={colors.primary || '#C50982'} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Select Group</Text>
          <TouchableOpacity
            style={styles.selectorButton}
            onPress={() => setShowGroupSelector(!showGroupSelector)}
          >
            <Text style={styles.selectorText}>
              {groups.find(g => g.id === selectedGroup)?.group_name || 'Select a group'}
            </Text>
            <Icon name="chevron-down" size={20} color="#6b7280" />
          </TouchableOpacity>

          {showGroupSelector && (
            <View style={styles.dropdown}>
              {groups.map((group) => (
                <TouchableOpacity
                  key={group.id}
                  style={[
                    styles.dropdownItem,
                    selectedGroup === group.id && styles.dropdownItemActive,
                  ]}
                  onPress={() => handleGroupChange(group.id)}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    selectedGroup === group.id && styles.dropdownItemTextActive,
                  ]}>
                    {group.group_name}
                  </Text>
                  {selectedGroup === group.id && (
                    <Icon name="checkmark" size={18} color={colors.primary || '#C50982'} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Report Period</Text>

          <TouchableOpacity
            style={styles.selectorButton}
            onPress={() => setShowPeriodDropdown(!showPeriodDropdown)}
          >
            <Icon name="calendar-outline" size={20} color="#6b7280" />
            <Text style={styles.selectorText}>
              {PERIOD_OPTIONS.find(p => p.id === period)?.label || 'Select period'}
            </Text>
            <Icon name="chevron-down" size={20} color="#6b7280" />
          </TouchableOpacity>

          {showPeriodDropdown && (
            <View style={styles.dropdown}>
              {PERIOD_OPTIONS.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.dropdownItem,
                    period === p.id && styles.dropdownItemActive,
                  ]}
                  onPress={() => handlePeriodChange(p.id as ReportPeriod)}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    period === p.id && styles.dropdownItemTextActive,
                  ]}>
                    {p.label}
                  </Text>
                  {period === p.id && (
                    <Icon name="checkmark" size={18} color={colors.primary || '#C50982'} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionToggle}
            onPress={() => setShowSectionSelector(!showSectionSelector)}
          >
            <Text style={styles.sectionLabel}>Sections to Include</Text>
            <Text style={styles.sectionCount}>
              {includeSections.length} / {SECTIONS.length}
            </Text>
            <Icon name={showSectionSelector ? 'chevron-up' : 'chevron-down'} size={20} color="#6b7280" />
          </TouchableOpacity>

          {showSectionSelector && (
            <View style={styles.sectionGrid}>
              {SECTIONS.map((section) => (
                <TouchableOpacity
                  key={section.id}
                  style={[
                    styles.sectionOption,
                    includeSections.includes(section.id) && styles.sectionOptionActive,
                  ]}
                  onPress={() => toggleSection(section.id)}
                >
                  <Icon
                    name={section.icon as any}
                    size={18}
                    color={includeSections.includes(section.id) ? (colors.primary || '#C50982') : '#6b7280'}
                  />
                  <Text style={[
                    styles.sectionOptionText,
                    includeSections.includes(section.id) && styles.sectionOptionTextActive,
                  ]}>
                    {section.label}
                  </Text>
                  {includeSections.includes(section.id) && (
                    <Icon name="checkmark-circle" size={14} color={colors.primary || '#C50982'} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Report Format</Text>
          <View style={styles.formatSelector}>
            {FORMAT_OPTIONS.map((format) => (
              <TouchableOpacity
                key={format.id}
                style={[
                  styles.formatOption,
                  reportFormat === format.id && styles.formatOptionActive,
                ]}
                onPress={() => setReportFormat(format.id as any)}
              >
                <Icon
                  name={format.icon as any}
                  size={24}
                  color={reportFormat === format.id ? (colors.primary || '#C50982') : '#6b7280'}
                />
                <Text style={[
                  styles.formatOptionText,
                  reportFormat === format.id && styles.formatOptionTextActive,
                ]}>
                  {format.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.generateButton, generating && styles.generateButtonDisabled]}
          onPress={handleGenerateReport}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Icon name="document-text" size={20} color="#fff" />
              <Text style={styles.generateButtonText}>Generate Report</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.reportsSection}>
          <Text style={styles.sectionTitle}>📄 Recent Reports</Text>

          {reports.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="document-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyText}>No reports generated yet</Text>
            </View>
          ) : (
            reports.map((report) => (
              <View key={report.id} style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <View style={styles.reportInfo}>
                    <Icon
                      name={getStatusIcon(report.status)}
                      size={20}
                      color={getStatusColor(report.status)}
                    />
                    <Text style={styles.reportTitle}>
                      {report.report_type?.replace('_', ' ').toUpperCase() || 'Report'}
                    </Text>
                  </View>
                  <Text style={[styles.reportStatus, { color: getStatusColor(report.status) }]}>
                    {report.status?.charAt(0).toUpperCase() + report.status?.slice(1) || 'Unknown'}
                  </Text>
                </View>

                <View style={styles.reportDetails}>
                  <Text style={styles.reportDate}>
                    📅 {report.start_date ? new Date(report.start_date).toLocaleDateString() : 'N/A'} - {report.end_date ? new Date(report.end_date).toLocaleDateString() : 'N/A'}
                  </Text>
                  <Text style={styles.reportDate}>
                    🕐 Generated: {report.created_at ? new Date(report.created_at).toLocaleString() : 'N/A'}
                  </Text>
                </View>

                {report.status === 'completed' && report.file_exists && (
                  <TouchableOpacity
                    style={styles.downloadButton}
                    onPress={() => handleDownloadReport(report)}
                  >
                    <Icon name="download" size={16} color="#fff" />
                    <Text style={styles.downloadButtonText}>Download</Text>
                  </TouchableOpacity>
                )}

                {report.status === 'failed' && (
                  <TouchableOpacity
                    style={[styles.downloadButton, styles.retryButton]}
                    onPress={() => handleRegenerateReport(report.id)}
                  >
                    <Icon name="refresh" size={16} color="#fff" />
                    <Text style={styles.downloadButtonText}>Retry</Text>
                  </TouchableOpacity>
                )}

                {report.status === 'generating' && (
                  <View style={styles.generatingContainer}>
                    <ActivityIndicator size="small" color={colors.primary || '#C50982'} />
                    <Text style={styles.generatingText}>Generating...</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteReport(report.id)}
                >
                  <Icon name="trash-outline" size={14} color="#dc2626" />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity
          style={styles.viewAllLink}
          onPress={() => navigation.navigate('ReportsList')}
        >
          <Icon name="arrow-forward-circle-outline" size={18} color={colors.primary || '#C50982'} />
          <Text style={styles.viewAllLinkText}>View All Completed Reports</Text>
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
  viewReportsButton: {
    padding: 8,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  sectionCount: {
    fontSize: 12,
    color: '#6b7280',
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  selectorText: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    marginHorizontal: 8,
  },
  dropdown: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dropdownItemActive: {
    backgroundColor: '#f5f0ff',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#111827',
  },
  dropdownItemTextActive: {
    color: colors.primary || '#C50982',
    fontWeight: '600',
  },
  sectionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  sectionGrid: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sectionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  sectionOptionActive: {
    borderColor: colors.primary || '#C50982',
    backgroundColor: '#f5f0ff',
  },
  sectionOptionText: {
    fontSize: 11,
    color: '#111827',
  },
  sectionOptionTextActive: {
    color: colors.primary || '#C50982',
    fontWeight: '500',
  },
  formatSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  formatOption: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  formatOptionActive: {
    borderColor: colors.primary || '#C50982',
    backgroundColor: '#f5f0ff',
  },
  formatOptionText: {
    fontSize: 11,
    color: '#111827',
    marginTop: 4,
  },
  formatOptionTextActive: {
    color: colors.primary || '#C50982',
    fontWeight: '600',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary || '#C50982',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  reportsSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
  },
  reportCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reportInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  reportStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  reportDetails: {
    marginBottom: 12,
  },
  reportDate: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary || '#C50982',
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  retryButton: {
    backgroundColor: '#d97706',
  },
  generatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#fef3c7',
    borderRadius: 6,
    marginBottom: 8,
  },
  generatingText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#92400e',
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
  viewAllLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 12,
  },
  viewAllLinkText: {
    fontSize: 14,
    color: colors.primary || '#C50982',
    fontWeight: '500',
    marginLeft: 8,
  },
});