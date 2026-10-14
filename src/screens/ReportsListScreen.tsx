import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../theme/colors';
import { groupAPI } from '../api/endpoints';
import { reportAPI, Report } from '../api/reportService';
import { shareReportFile, saveReportFile } from '../utils/shareReport';
import type { ReportFile } from '../utils/shareReport';

const PRIMARY = colors.primary || '#C50982';

const FORMAT_META = {
  pdf: { label: 'PDF', icon: 'document-text', color: '#dc2626', bg: '#fee2e2' },
  excel: { label: 'Excel', icon: 'grid', color: '#16a34a', bg: '#dcfce7' },
  both: { label: 'PDF + Excel', icon: 'documents', color: '#2563eb', bg: '#dbeafe' },
} as const;

const metaFor = (format?: string) =>
  FORMAT_META[format as keyof typeof FORMAT_META] ?? FORMAT_META.pdf;

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pdf', label: 'PDF' },
  { id: 'excel', label: 'Excel' },
] as const;

type FilterId = (typeof FILTERS)[number]['id'];
type BusyState = { id: string; action: 'share' | 'download' | 'delete' } | null;

// Alert.alert does nothing on react-native-web, so use window.alert there.
const notify = (title: string, message: string) => {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
};

const prettyType = (type?: string) =>
  (type || 'Report')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

const fmtDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'N/A';

const fmtDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'N/A';

// Download the report from the API and describe it as a shareable file
async function fetchReportFile(report: Report, groupName: string): Promise<ReportFile> {
  const response = await reportAPI.downloadReport(report.id);

  const isExcel = report.format === 'excel';
  const ext = isExcel ? 'xlsx' : 'pdf';
  const mime = isExcel
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'application/pdf';

  // Prefer the server-provided filename, fall back to a readable one
  const disposition = response.headers?.['content-disposition'] || '';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  const filename = match
    ? decodeURIComponent(match[1])
    : `${prettyType(report.report_type).replace(/\s+/g, '_')}_${String(report.id).slice(0, 8)}.${ext}`;

  return {
    blob: new Blob([response.data], { type: mime }),
    filename,
    mime,
    title: `${prettyType(report.report_type)}${groupName ? ` - ${groupName}` : ''}`,
  };
}

export function ReportsListScreen({ navigation }: any) {
  const [reports, setReports] = useState<Report[]>([]);
  const [groupNames, setGroupNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterId>('all');
  const [busy, setBusy] = useState<BusyState>(null);

  const load = useCallback(async () => {
    try {
      const [groupsRes, reportsRes] = await Promise.all([
        groupAPI.getGroups(),
        reportAPI.getReports(),
      ]);

      const groupsData = Array.isArray(groupsRes.data)
        ? groupsRes.data
        : groupsRes.data?.results || [];
      const names: Record<string, string> = {};
      groupsData.forEach((g: any) => {
        names[g.id] = g.group_name;
      });
      setGroupNames(names);

      const reportsData = Array.isArray(reportsRes.data)
        ? reportsRes.data
        : reportsRes.data?.results || [];
      setReports(reportsData);
    } catch (error) {
      console.error('Error loading reports:', error);
      notify('Error', 'Failed to load reports');
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const groupNameOf = (report: Report) =>
    (report as any).group_name || groupNames[report.group as any] || 'Unknown group';

  // Only finished reports, newest first
  const completed = useMemo(
    () =>
      reports
        .filter((r) => r.status === 'completed')
        .sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
        ),
    [reports],
  );

  const counts = useMemo(
    () => ({
      total: completed.length,
      pdf: completed.filter((r) => r.format === 'pdf').length,
      excel: completed.filter((r) => r.format === 'excel').length,
    }),
    [completed],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return completed.filter((r) => {
      if (filter !== 'all' && r.format !== filter) return false;
      if (!q) return true;
      return (
        prettyType(r.report_type).toLowerCase().includes(q) ||
        groupNameOf(r).toLowerCase().includes(q) ||
        String(r.format || '').toLowerCase().includes(q)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completed, query, filter, groupNames]);

  const handleShare = async (report: Report) => {
    setBusy({ id: report.id, action: 'share' });
    try {
      const file = await fetchReportFile(report, groupNameOf(report));
      const result = await shareReportFile(file);
      if (result === 'downloaded') {
        notify(
          'File downloaded',
          "Sharing isn't available in this browser (it needs https or a phone), so the file was downloaded instead.",
        );
      }
    } catch (error) {
      console.error('Share report failed:', error);
      notify('Error', 'Could not share this report. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = async (report: Report) => {
    setBusy({ id: report.id, action: 'download' });
    try {
      const file = await fetchReportFile(report, groupNameOf(report));
      await saveReportFile(file);
    } catch (error) {
      console.error('Download report failed:', error);
      notify('Error', 'Could not download this report. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = (report: Report) => {
    const doDelete = async () => {
      setBusy({ id: report.id, action: 'delete' });
      try {
        await reportAPI.deleteReport(report.id);
        setReports((prev) => prev.filter((r) => r.id !== report.id));
      } catch (error: any) {
        notify('Error', error?.response?.data?.error || 'Failed to delete report');
      } finally {
        setBusy(null);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Delete this report? This cannot be undone.')) doDelete();
      return;
    }
    Alert.alert('Delete report', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doDelete },
    ]);
  };

  const renderReport = ({ item }: { item: Report }) => {
    const meta = metaFor(item.format);
    const isBusy = busy?.id === item.id;
    const hasFile = item.file_exists !== false;

    return (
      <View style={styles.card}>
        <View style={[styles.cardAccent, { backgroundColor: meta.color }]} />
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <View style={[styles.formatTile, { backgroundColor: meta.bg }]}>
              <Icon name={meta.icon as any} size={22} color={meta.color} />
            </View>

            <View style={styles.cardTitleWrap}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {prettyType(item.report_type)}
              </Text>
              <Text style={styles.cardGroup} numberOfLines={1}>
                {groupNameOf(item)}
              </Text>
            </View>

            <View style={[styles.badge, { backgroundColor: meta.bg }]}>
              <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Icon name="calendar-outline" size={13} color="#6b7280" />
              <Text style={styles.metaText}>
                {fmtDate(item.start_date)} - {fmtDate(item.end_date)}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Icon name="time-outline" size={13} color="#6b7280" />
              <Text style={styles.metaText}>{fmtDateTime(item.created_at)}</Text>
            </View>
          </View>

          {!hasFile && (
            <View style={styles.missingBanner}>
              <Icon name="alert-circle-outline" size={14} color="#b45309" />
              <Text style={styles.missingText}>File is missing on the server</Text>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.shareButton, (!hasFile || isBusy) && styles.disabled]}
              onPress={() => handleShare(item)}
              disabled={!hasFile || isBusy}
              activeOpacity={0.8}
            >
              {isBusy && busy?.action === 'share' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="share-social-outline" size={16} color="#fff" />
                  <Text style={styles.shareButtonText}>Share</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.outlineButton, (!hasFile || isBusy) && styles.disabled]}
              onPress={() => handleDownload(item)}
              disabled={!hasFile || isBusy}
              activeOpacity={0.8}
            >
              {isBusy && busy?.action === 'download' ? (
                <ActivityIndicator size="small" color={PRIMARY} />
              ) : (
                <>
                  <Icon name="download-outline" size={16} color={PRIMARY} />
                  <Text style={styles.outlineButtonText}>Download</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconButton, isBusy && styles.disabled]}
              onPress={() => handleDelete(item)}
              disabled={isBusy}
              activeOpacity={0.8}
            >
              {isBusy && busy?.action === 'delete' ? (
                <ActivityIndicator size="small" color="#dc2626" />
              ) : (
                <Icon name="trash-outline" size={18} color="#dc2626" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const header = (
    <View>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{counts.total}</Text>
          <Text style={styles.summaryLabel}>Reports</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: '#dc2626' }]}>{counts.pdf}</Text>
          <Text style={styles.summaryLabel}>PDF</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: '#16a34a' }]}>{counts.excel}</Text>
          <Text style={styles.summaryLabel}>Excel</Text>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Icon name="search-outline" size={18} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by type or group"
          placeholderTextColor="#9ca3af"
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="close-circle" size={18} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.chips}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.chip, filter === f.id && styles.chipActive]}
            onPress={() => setFilter(f.id)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, filter === f.id && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topButton}>
          <Icon name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.topTitleWrap}>
          <Text style={styles.topTitle}>Completed Reports</Text>
          <Text style={styles.topSubtitle}>Share or download your group reports</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.topButton}>
          <Icon name="refresh" size={22} color={PRIMARY} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderReport}
        ListHeaderComponent={header}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Icon name="folder-open-outline" size={36} color="#9ca3af" />
            </View>
            <Text style={styles.emptyTitle}>
              {completed.length === 0 ? 'No completed reports yet' : 'No reports match your search'}
            </Text>
            <Text style={styles.emptyText}>
              {completed.length === 0
                ? 'Generate a report and it will appear here once it is ready.'
                : 'Try a different search or filter.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

export default ReportsListScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  topButton: { padding: 8 },
  topTitleWrap: { flex: 1, marginHorizontal: 8 },
  topTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  topSubtitle: { fontSize: 12, color: '#6b7280', marginTop: 1 },

  listContent: { padding: 16, paddingBottom: 40 },

  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryValue: { fontSize: 22, fontWeight: '700', color: '#111827' },
  summaryLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#111827' },

  chips: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 14 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  chipTextActive: { color: '#ffffff', fontWeight: '600' },

  card: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  formatTile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleWrap: { flex: 1, marginHorizontal: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardGroup: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  metaRow: { marginTop: 12, gap: 5 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: '#6b7280' },

  missingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    padding: 8,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
  },
  missingText: { fontSize: 12, color: '#b45309' },

  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    backgroundColor: PRIMARY,
    borderRadius: 10,
  },
  shareButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  outlineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PRIMARY,
    backgroundColor: '#ffffff',
  },
  outlineButtonText: { color: PRIMARY, fontSize: 14, fontWeight: '600' },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  disabled: { opacity: 0.5 },

  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5e7eb',
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827', textAlign: 'center' },
  emptyText: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginTop: 6 },
});