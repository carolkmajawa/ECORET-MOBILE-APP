import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  FlatList,
  Modal,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../theme/colors';
import { groupAPI, attendanceAPI, BASE_URL } from '../api/endpoints';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Member {
  id: string;
  full_name: string;
  phone_number: string;
}

interface AttendanceRecord {
  id: string;
  member_id: string;
  member_name: string;
  attended: boolean;
  meeting_date: string;
  meeting_type: string;
  group: string;
}

interface Meeting {
  id: string;
  meeting_date: string;
  start_time: string;
  end_time?: string;
  title: string;
  description: string;
  is_completed: boolean;
  meeting_type?: string;
  agenda?: string;
  minutes?: string;
  group?: string;
  group_id?: string;
  groupId?: string;
}

interface AttendanceCase {
  id: string;
  member: string;
  member_name: string;
  case_type: string;
  meeting_date: string;
  reason: string;
  penalty_amount: number;
  penalty_paid: number;
  status: 'pending' | 'resolved' | 'waived';
  created_at: string;
  resolved_at: string | null;
}

type AttendanceView = 'meeting' | 'tracking' | 'penalties';

const CASE_TYPES = [
  { label: 'Late Coming', value: 'late_coming' },
  { label: 'Absence', value: 'absence' },
  { label: 'Early Departure', value: 'early_departure' },
  { label: 'No Excuse', value: 'no_excuse' },
  { label: 'Other', value: 'other' },
];

const caseTypeLabels: Record<string, string> = {
  'late_coming': 'Late Coming',
  'absence': 'Absence',
  'early_departure': 'Early Departure',
  'no_excuse': 'No Excuse',
  'other': 'Other'
};

const caseTypeColors: Record<string, string> = {
  'late_coming': '#f59e0b',
  'absence': '#dc2626',
  'early_departure': '#8b5cf6',
  'no_excuse': '#ef4444',
  'other': '#6b7280'
};

const statusColors: Record<string, string> = {
  'pending': '#f59e0b',
  'resolved': '#059669',
  'waived': '#6b7280'
};

export default function AttendanceScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeView, setActiveView] = useState<AttendanceView>('meeting');
  const [members, setMembers] = useState<Member[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showMeetingSelector, setShowMeetingSelector] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [meetingDescription, setMeetingDescription] = useState('');
  const [selectedMemberForTracking, setSelectedMemberForTracking] = useState<Member | null>(null);
  const [memberAttendanceStats, setMemberAttendanceStats] = useState<any>(null);
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [selectedMemberForCase, setSelectedMemberForCase] = useState<Member | null>(null);
  const [showMemberSelectorForCase, setShowMemberSelectorForCase] = useState(false);
  const [caseType, setCaseType] = useState<string>('absence');
  const [caseReason, setCaseReason] = useState('');
  const [penaltyAmount, setPenaltyAmount] = useState('');
  const [cases, setCases] = useState<AttendanceCase[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCaseForPayment, setSelectedCaseForPayment] = useState<AttendanceCase | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'resolved' | 'waived'>('all');

  useEffect(() => {
    loadGroupAndData();
  }, []);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  const loadGroupAndData = async () => {
    try {
      setLoading(true);
      const response = await groupAPI.getGroups();
      const results = Array.isArray(response.data) ? response.data : response.data.results || [];
      if (results.length > 0) {
        setGroupId(results[0].id);
        await loadMembers(results[0].id);
        await loadMeetings();
        await loadAttendanceData();
        await loadCases();
      } else {
        Alert.alert('No Group', 'You are not assigned to any group yet.');
      }
    } catch (error) {
      console.error('Failed to load group:', error);
      Alert.alert('Error', 'Failed to load group data');
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (groupId: string) => {
    try {
      const response = await groupAPI.getMembers(groupId);
      const membersData = Array.isArray(response.data) ? response.data : [];
      setMembers(membersData.map((m: any) => ({
        id: m.id,
        full_name: m.full_name,
        phone_number: m.phone_number,
      })));
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  };

  // ============ LOAD ALL MEETINGS WITH PAGINATION ============
  const loadMeetings = async () => {
    try {
      let allMeetings: Meeting[] = [];
      let nextUrl: string | null = `${BASE_URL}/meetings/?page=1&page_size=100`;
      
      while (nextUrl) {
        const token = await AsyncStorage.getItem('access_token');
        const response: Response = await fetch(nextUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        const data: any = await response.json();
        if (data.results) {
          allMeetings = [...allMeetings, ...data.results];
        }
        nextUrl = data.next || null;
      }
      
      let groupMeetings = allMeetings;
      if (groupId) {
        groupMeetings = allMeetings.filter((m) => {
          const recordGroupId = (m as any).group || (m as any).group_id || (m as any).groupId;
          return recordGroupId === groupId;
        });
      }
      
      groupMeetings.sort((a, b) => {
        return new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime();
      });
      
      setMeetings(groupMeetings);
      
      if (groupMeetings.length > 0) {
        const incompleteMeeting = groupMeetings.find((m) => !m.is_completed);
        setSelectedMeeting(incompleteMeeting || groupMeetings[0]);
      }
    } catch (error) {
      console.error('Failed to load meetings:', error);
    }
  };

  // ============ LOAD ALL ATTENDANCE RECORDS WITH PAGINATION ============
  const loadAttendanceData = async () => {
    try {
      let allAttendance: any[] = [];
      let nextUrl: string | null = `${BASE_URL}/attendance/?page=1&page_size=100`;
      
      while (nextUrl) {
        const token = await AsyncStorage.getItem('access_token');
        const response: Response = await fetch(nextUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        const data: any = await response.json();
        if (data.results) {
          allAttendance = [...allAttendance, ...data.results];
        }
        nextUrl = data.next || null;
      }
      
      let groupAttendance = allAttendance;
      if (groupId) {
        groupAttendance = allAttendance.filter((a: any) => {
          const recordGroupId = a.group || a.group_id || a.groupId;
          return recordGroupId === groupId;
        });
      }
      
      const mappedAttendance: AttendanceRecord[] = groupAttendance.map((a: any) => ({
        id: a.id,
        member_id: a.member || a.member_id,
        member_name: a.member_name || a.member?.full_name || 'Unknown',
        attended: a.attended || false,
        meeting_date: a.meeting_date || a.created_at,
        meeting_type: a.meeting_type || 'regular',
        group: a.group || groupId,
      }));
      
      setAttendanceRecords(mappedAttendance);
      console.log('✅ Attendance records loaded:', mappedAttendance.length);
    } catch (error) {
      console.error('Failed to load attendance:', error);
    }
  };

  // ============ LOAD ALL CASES WITH PAGINATION ============
  const loadCases = async () => {
    try {
      let allCases: any[] = [];
      let nextUrl: string | null = `${BASE_URL}/attendance-cases/?page=1&page_size=100`;
      
      while (nextUrl) {
        const token = await AsyncStorage.getItem('access_token');
        const response: Response = await fetch(nextUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        const data: any = await response.json();
        if (data.results) {
          allCases = [...allCases, ...data.results];
        }
        nextUrl = data.next || null;
      }
      
      let groupCases = allCases;
      if (groupId) {
        groupCases = allCases.filter((c: any) => {
          const recordGroupId = c.group || c.group_id || c.groupId;
          return recordGroupId === groupId;
        });
      }
      
      const mappedCases: AttendanceCase[] = groupCases.map((c: any) => ({
        id: c.id,
        member: c.member || c.member_id,
        member_name: c.member_name || c.member?.full_name || 'Unknown',
        case_type: c.case_type || 'other',
        meeting_date: c.meeting_date || c.created_at,
        reason: c.reason || '',
        penalty_amount: parseFloat(c.penalty_amount) || 0,
        penalty_paid: parseFloat(c.penalty_paid) || 0,
        status: c.status || 'pending',
        created_at: c.created_at,
        resolved_at: c.resolved_at || null,
      }));
      
      setCases(mappedCases);
    } catch (error) {
      console.error('Failed to load cases:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (groupId) {
      await loadMembers(groupId);
      await loadMeetings();
      await loadAttendanceData();
      await loadCases();
    }
    setRefreshing(false);
  };

  const normalizeDate = (dateString: string): string => {
    if (!dateString) return '';
    return dateString.split('T')[0];
  };

  const directMarkComplete = async (meetingId: string): Promise<boolean> => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const url = `${BASE_URL}/meetings/${meetingId}/mark_completed/`;
      
      const response: Response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      
      const data: any = await response.json();
      
      if (response.ok) {
        Alert.alert('✅ Success', 'Meeting completed!');
        updateLocalMeetingState(meetingId, true);
        await loadMeetings();
        await loadAttendanceData();
        await loadMembers(groupId!);
        return true;
      } else {
        Alert.alert('❌ Error', data.error || data.message || 'Failed to complete meeting');
        return false;
      }
    } catch (error: any) {
      console.error('Direct API call failed:', error);
      Alert.alert('❌ Error', error.message || 'Network error');
      return false;
    }
  };

  const updateLocalMeetingState = (meetingId: string, completed: boolean): void => {
    setMeetings(prevMeetings => {
      return prevMeetings.map(m => 
        m.id === meetingId ? { ...m, is_completed: completed } : m
      );
    });
    
    if (selectedMeeting && selectedMeeting.id === meetingId) {
      setSelectedMeeting({ ...selectedMeeting, is_completed: completed });
    }
  };

  const handleUncompleteMeeting = async (meetingId: string): Promise<void> => {
    if (!meetingId) {
      Alert.alert('Error', 'No meeting ID provided');
      return;
    }

    Alert.alert(
      'Uncomplete Meeting',
      'Are you sure you want to uncomplete this meeting?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Uncomplete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSubmitting(true);
              await attendanceAPI.updateMeeting(meetingId, { is_completed: false });
              updateLocalMeetingState(meetingId, false);
              Alert.alert('✅ Success', 'Meeting uncompleted!');
              await loadMeetings();
              await loadAttendanceData();
            } catch (error: any) {
              console.error('Failed to uncomplete meeting:', error);
              Alert.alert('❌ Error', error?.response?.data?.error || 'Failed to uncomplete meeting');
            } finally {
              setIsSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const handleCreateMeeting = async (): Promise<void> => {
    if (!meetingTitle.trim()) {
      Alert.alert('Error', 'Please enter a meeting title');
      return;
    }

    if (!meetingDate.trim()) {
      Alert.alert('Error', 'Please select a meeting date');
      return;
    }

    if (!startTime.trim()) {
      Alert.alert('Error', 'Please enter start time');
      return;
    }

    if (!groupId) {
      Alert.alert('Error', 'No group selected. Please try again.');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = {
        group: groupId,
        title: meetingTitle.trim(),
        meeting_date: meetingDate.trim(),
        start_time: startTime.trim(),
        end_time: endTime.trim() || null,
        description: meetingDescription.trim(),
        is_completed: false,
        meeting_type: 'regular',
      };

      await attendanceAPI.createMeeting(data);
      
      Alert.alert('✅ Success', 'Meeting created successfully!');
      setShowMeetingModal(false);
      setMeetingTitle('');
      setMeetingDate('');
      setStartTime('');
      setEndTime('');
      setMeetingDescription('');
      await loadMeetings();
      
    } catch (error: any) {
      console.error('Failed to create meeting:', error);
      Alert.alert('❌ Error', error?.response?.data?.error || 'Failed to create meeting');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAttendance = async (memberId: string, attended: boolean): Promise<void> => {
    if (!selectedMeeting) {
      Alert.alert('Error', 'Please select a meeting first');
      return;
    }

    if (selectedMeeting.is_completed) {
      Alert.alert('Error', 'Cannot modify attendance for a completed meeting');
      return;
    }

    if (!groupId) {
      Alert.alert('Error', 'No group found. Please try again.');
      return;
    }

    setIsSubmitting(true);
    try {
      const existingRecord = attendanceRecords.find(
        (r) => r.member_id === memberId && r.meeting_date === selectedMeeting.meeting_date
      );

      const data = {
        member: memberId,
        group: groupId,
        meeting_date: selectedMeeting.meeting_date,
        meeting_type: selectedMeeting.meeting_type || 'regular',
        attended: attended,
      };

      if (existingRecord) {
        await attendanceAPI.updateAttendance(existingRecord.id, data);
      } else {
        await attendanceAPI.createAttendance(data);
      }
      
      await loadAttendanceData();
      await loadMembers(groupId);
      Alert.alert('✅ Success', `Member marked as ${attended ? 'Present' : 'Absent'}`);
      
    } catch (error: any) {
      console.error('Failed to mark attendance:', error);
      Alert.alert('❌ Error', error?.response?.data?.error || 'Failed to mark attendance');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCase = async (): Promise<void> => {
    if (!selectedMemberForCase) {
      Alert.alert('Error', 'Please select a member');
      return;
    }

    if (!selectedMeeting) {
      Alert.alert('Error', 'Please select a meeting first');
      return;
    }

    const amount = parseFloat(penaltyAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid penalty amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = {
        member: selectedMemberForCase.id,
        group: groupId,
        case_type: caseType,
        meeting_date: selectedMeeting.meeting_date,
        reason: caseReason.trim() || `${caseTypeLabels[caseType]} penalty`,
        penalty_amount: amount,
      };

      await attendanceAPI.createCase(data);
      
      Alert.alert('✅ Success', 'Penalty case created successfully!');
      setShowCaseModal(false);
      setSelectedMemberForCase(null);
      setCaseType('absence');
      setCaseReason('');
      setPenaltyAmount('');
      await loadCases();
    } catch (error: any) {
      console.error('Failed to create case:', error);
      Alert.alert('❌ Error', error?.response?.data?.error || 'Failed to create case');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPayment = async (): Promise<void> => {
    if (!selectedCaseForPayment) {
      Alert.alert('Error', 'No case selected');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid payment amount');
      return;
    }

    const balance = selectedCaseForPayment.penalty_amount - selectedCaseForPayment.penalty_paid;
    if (amount > balance) {
      Alert.alert('Error', `Amount exceeds balance. Balance: MK${balance.toLocaleString()}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const data = {
        amount: amount,
        payment_method: 'cash',
        notes: `Cash payment for ${caseTypeLabels[selectedCaseForPayment.case_type]} penalty`,
      };

      await attendanceAPI.addPaymentToCase(selectedCaseForPayment.id, data);
      Alert.alert('✅ Success', `Payment of MK${amount.toLocaleString()} recorded successfully!`);
      setShowPaymentModal(false);
      setPaymentAmount('');
      setSelectedCaseForPayment(null);
      await loadCases();
    } catch (error: any) {
      console.error('Failed to add payment:', error);
      Alert.alert('❌ Error', error?.response?.data?.error || 'Failed to add payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveCase = async (caseId: string): Promise<void> => {
    Alert.alert(
      'Resolve Case',
      'Are you sure you want to resolve this case? The penalty must be fully paid.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resolve',
          onPress: async () => {
            try {
              await attendanceAPI.resolveCase(caseId, {});
              Alert.alert('✅ Success', 'Case resolved successfully!');
              await loadCases();
            } catch (error: any) {
              console.error('Failed to resolve case:', error);
              Alert.alert('❌ Error', error?.response?.data?.error || 'Failed to resolve case');
            }
          }
        }
      ]
    );
  };

  const handleWaiveCase = async (caseId: string): Promise<void> => {
    Alert.alert(
      'Waive Penalty',
      'Are you sure you want to waive this penalty?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Waive',
          style: 'destructive',
          onPress: async () => {
            try {
              await attendanceAPI.waiveCase(caseId);
              Alert.alert('✅ Success', 'Penalty waived successfully!');
              await loadCases();
            } catch (error: any) {
              console.error('Failed to waive case:', error);
              Alert.alert('❌ Error', error?.response?.data?.error || 'Failed to waive penalty');
            }
          }
        }
      ]
    );
  };

  const getAttendanceStatus = (memberId: string): boolean | null => {
    if (!selectedMeeting) return null;
    const record = attendanceRecords.find(
      (r) => r.member_id === memberId && r.meeting_date === selectedMeeting.meeting_date
    );
    return record ? record.attended : null;
  };

  const getMemberAttendanceStats = async (memberId: string): Promise<void> => {
    try {
      const response = await attendanceAPI.getMemberAttendance(memberId);
      setMemberAttendanceStats(response.data);
    } catch (error) {
      console.error('Failed to get member stats:', error);
    }
  };

  const getMemberTotalPenalty = (memberId: string): number => {
    const memberCases = cases.filter(c => c.member === memberId && c.status === 'pending');
    return memberCases.reduce((sum, c) => sum + (c.penalty_amount - c.penalty_paid), 0);
  };

  const getFilteredCases = (): AttendanceCase[] => {
    let filtered = cases;
    if (filterStatus !== 'all') {
      filtered = filtered.filter(c => c.status === filterStatus);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(c => 
        c.member_name.toLowerCase().includes(query) ||
        c.reason.toLowerCase().includes(query) ||
        caseTypeLabels[c.case_type].toLowerCase().includes(query)
      );
    }
    return filtered;
  };

  const renderCaseItem = ({ item }: { item: AttendanceCase }) => {
    const balance = item.penalty_amount - item.penalty_paid;
    const isFullyPaid = balance <= 0;
    const canResolve = item.status === 'pending' && isFullyPaid;

    return (
      <View style={styles.caseCard}>
        <View style={styles.caseHeader}>
          <Text style={styles.caseMemberName}>{item.member_name}</Text>
          <View style={[styles.caseStatusBadge, { backgroundColor: statusColors[item.status] }]}>
            <Text style={styles.caseStatusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
        
        <View style={styles.caseDetails}>
          <View style={styles.caseDetailRow}>
            <Text style={styles.caseDetailLabel}>Type:</Text>
            <View style={[styles.caseTypeBadge, { backgroundColor: caseTypeColors[item.case_type] + '20' }]}>
              <Text style={[styles.caseTypeText, { color: caseTypeColors[item.case_type] }]}>
                {caseTypeLabels[item.case_type]}
              </Text>
            </View>
          </View>
          <View style={styles.caseDetailRow}>
            <Text style={styles.caseDetailLabel}>Date:</Text>
            <Text style={styles.caseDetailValue}>
              {new Date(item.meeting_date).toLocaleDateString()}
            </Text>
          </View>
          {item.reason && (
            <View style={styles.caseDetailRow}>
              <Text style={styles.caseDetailLabel}>Reason:</Text>
              <Text style={styles.caseDetailValue}>{item.reason}</Text>
            </View>
          )}
          <View style={styles.caseDetailRow}>
            <Text style={styles.caseDetailLabel}>Penalty:</Text>
            <Text style={[styles.caseDetailValue, styles.casePenaltyAmount]}>
              MK{item.penalty_amount.toLocaleString()}
            </Text>
          </View>
          <View style={styles.caseDetailRow}>
            <Text style={styles.caseDetailLabel}>Paid:</Text>
            <Text style={[styles.caseDetailValue, styles.casePaidAmount]}>
              MK{item.penalty_paid.toLocaleString()}
            </Text>
          </View>
          <View style={styles.caseDetailRow}>
            <Text style={styles.caseDetailLabel}>Balance:</Text>
            <Text style={[
              styles.caseDetailValue,
              balance > 0 ? styles.caseBalanceAmount : styles.casePaidAmount
            ]}>
              MK{balance.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.caseActions}>
          {item.status === 'pending' && (
            <>
              <TouchableOpacity
                style={[styles.caseActionButton, styles.paymentButton]}
                onPress={() => {
                  setSelectedCaseForPayment(item);
                  setPaymentAmount('');
                  setShowPaymentModal(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.caseActionButtonText}>💳 Pay</Text>
              </TouchableOpacity>
              {canResolve && (
                <TouchableOpacity
                  style={[styles.caseActionButton, styles.resolveButton]}
                  onPress={() => handleResolveCase(item.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.caseActionButtonText}>✅ Resolve</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.caseActionButton, styles.waiveButton]}
                onPress={() => handleWaiveCase(item.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.caseActionButtonText}>🎯 Waive</Text>
              </TouchableOpacity>
            </>
          )}
          {item.status === 'resolved' && (
            <View style={styles.caseResolvedBadge}>
              <Text style={styles.caseResolvedText}>✅ Resolved</Text>
            </View>
          )}
          {item.status === 'waived' && (
            <View style={styles.caseWaivedBadge}>
              <Text style={styles.caseWaivedText}>🎯 Waived</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderMeetingAttendance = () => {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Meeting Attendance</Text>
          <View style={styles.sectionActions}>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowMeetingModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.createButtonText}>+ New Meeting</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.meetingSelector}
          onPress={() => setShowMeetingSelector(true)}
          activeOpacity={0.7}
        >
          <View style={styles.meetingSelectorContent}>
            <Text style={styles.meetingSelectorText}>
              {selectedMeeting?.title || 'Select a meeting'}
            </Text>
            {selectedMeeting?.is_completed && (
              <View style={styles.completedBadgeSmall}>
                <Text style={styles.completedBadgeSmallText}>✅ Completed</Text>
              </View>
            )}
          </View>
          <Text style={styles.meetingSelectorArrow}>▼</Text>
        </TouchableOpacity>

        {selectedMeeting && (
          <View style={styles.meetingInfo}>
            <View style={styles.meetingInfoHeader}>
              <Text style={styles.meetingInfoTitle}>{selectedMeeting.title}</Text>
              {selectedMeeting.is_completed ? (
                <View style={styles.completedBadge}>
                  <Text style={styles.completedBadgeText}>✅ Completed</Text>
                </View>
              ) : (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>⏳ Pending</Text>
                </View>
              )}
            </View>
            <Text style={styles.meetingInfoDate}>
              📅 {new Date(selectedMeeting.meeting_date).toLocaleDateString()}
              {selectedMeeting.start_time && ` at ${selectedMeeting.start_time.substring(0, 5)}`}
              {selectedMeeting.end_time && ` - ${selectedMeeting.end_time.substring(0, 5)}`}
            </Text>
            {selectedMeeting.description && (
              <Text style={styles.meetingInfoDescription}>{selectedMeeting.description}</Text>
            )}
            
            <View style={styles.meetingActionButtons}>
              {!selectedMeeting.is_completed ? (
                <TouchableOpacity
                  style={styles.completeMeetingButton}
                  onPress={() => {
                    directMarkComplete(selectedMeeting.id);
                  }}
                  disabled={isSubmitting}
                  activeOpacity={0.7}
                >
                  <Text style={styles.completeMeetingButtonText}>
                    {isSubmitting ? '⏳ Processing...' : '✅ Mark as Completed'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.completeMeetingButton, styles.uncompleteButton]}
                  onPress={() => {
                    handleUncompleteMeeting(selectedMeeting.id);
                  }}
                  disabled={isSubmitting}
                  activeOpacity={0.7}
                >
                  <Text style={styles.completeMeetingButtonText}>
                    {isSubmitting ? '⏳ Processing...' : '🔄 Uncomplete Meeting'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {members.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>👤</Text>
            <Text style={styles.emptyText}>No members found</Text>
            <Text style={styles.emptySubtext}>Add members to mark attendance</Text>
          </View>
        ) : (
          <View style={styles.attendanceList}>
            {members.map((member) => {
              const status = getAttendanceStatus(member.id);
              const isPresent = status === true;
              const isAbsent = status === false;
              const hasPenalty = getMemberTotalPenalty(member.id) > 0;
              const isMeetingCompleted = selectedMeeting?.is_completed || false;

              return (
                <View key={member.id} style={styles.attendanceItem}>
                  <View style={styles.attendanceMemberInfo}>
                    <Text style={styles.attendanceMemberName}>{member.full_name}</Text>
                    <Text style={styles.attendanceMemberPhone}>{member.phone_number}</Text>
                    {hasPenalty && (
                      <View style={styles.penaltyBadge}>
                        <Text style={styles.penaltyBadgeText}>
                          ⚖️ MK{getMemberTotalPenalty(member.id).toLocaleString()}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.attendanceStatusText}>
                      Status: {status === true ? '✅ Present' : status === false ? '❌ Absent' : '⏳ Pending'}
                    </Text>
                  </View>
                  <View style={styles.attendanceActions}>
                    <TouchableOpacity
                      style={[
                        styles.attendanceButton,
                        styles.presentButton,
                        isPresent && styles.attendanceButtonActive,
                        (isAbsent || isMeetingCompleted) && styles.attendanceButtonDisabled,
                      ]}
                      onPress={() => handleMarkAttendance(member.id, true)}
                      disabled={isSubmitting || isAbsent || isMeetingCompleted}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.attendanceButtonText,
                        isPresent && styles.attendanceButtonTextActive,
                        (isAbsent || isMeetingCompleted) && styles.attendanceButtonTextDisabled,
                      ]}>
                        ✅ Present
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.attendanceButton,
                        styles.absentButton,
                        isAbsent && styles.attendanceButtonActive,
                        (isPresent || isMeetingCompleted) && styles.attendanceButtonDisabled,
                      ]}
                      onPress={() => handleMarkAttendance(member.id, false)}
                      disabled={isSubmitting || isPresent || isMeetingCompleted}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.attendanceButtonText,
                        isAbsent && styles.attendanceButtonTextActive,
                        (isPresent || isMeetingCompleted) && styles.attendanceButtonTextDisabled,
                      ]}>
                        ❌ Absent
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.attendanceButton,
                        styles.caseActionButton,
                      ]}
                      onPress={() => {
                        setSelectedMemberForCase(member);
                        setShowCaseModal(true);
                        setCaseType('absence');
                        setCaseReason('');
                        setPenaltyAmount('');
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.attendanceButtonText}>⚖️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {selectedMeeting && (
          <View style={styles.attendanceSummary}>
            <Text style={styles.attendanceSummaryTitle}>Summary</Text>
            <View style={styles.attendanceSummaryStats}>
              <View style={styles.attendanceSummaryStat}>
                <Text style={styles.attendanceSummaryStatNumber}>
                  {members.filter((m) => getAttendanceStatus(m.id) === true).length}
                </Text>
                <Text style={styles.attendanceSummaryStatLabel}>Present</Text>
              </View>
              <View style={styles.attendanceSummaryStat}>
                <Text style={styles.attendanceSummaryStatNumber}>
                  {members.filter((m) => getAttendanceStatus(m.id) === false).length}
                </Text>
                <Text style={styles.attendanceSummaryStatLabel}>Absent</Text>
              </View>
              <View style={styles.attendanceSummaryStat}>
                <Text style={styles.attendanceSummaryStatNumber}>
                  {members.filter((m) => getAttendanceStatus(m.id) === null).length}
                </Text>
                <Text style={styles.attendanceSummaryStatLabel}>Pending</Text>
              </View>
              <View style={styles.attendanceSummaryStat}>
                <Text style={styles.attendanceSummaryStatNumber}>
                  {members.length}
                </Text>
                <Text style={styles.attendanceSummaryStatLabel}>Total</Text>
              </View>
            </View>
            {selectedMeeting.is_completed && (
              <Text style={styles.attendanceCompletedNotice}>
                ✅ This meeting is completed and locked
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderPenaltiesView = () => {
    const filteredCases = getFilteredCases();
    const totalPending = cases.filter(c => c.status === 'pending').length;
    const totalResolved = cases.filter(c => c.status === 'resolved').length;
    const totalWaived = cases.filter(c => c.status === 'waived').length;

    return (
      <View style={styles.section}>
        <View style={styles.penaltiesHeader}>
          <Text style={styles.sectionTitle}>⚖️ Penalties</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => {
              setSelectedMemberForCase(null);
              setShowCaseModal(true);
              setCaseType('absence');
              setCaseReason('');
              setPenaltyAmount('');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.createButtonText}>+ New Case</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.penaltySummaryContainer}>
          <View style={[styles.penaltySummaryCard, styles.pendingSummary]}>
            <Text style={styles.penaltySummaryNumber}>{totalPending}</Text>
            <Text style={styles.penaltySummaryLabel}>Pending</Text>
          </View>
          <View style={[styles.penaltySummaryCard, styles.resolvedSummary]}>
            <Text style={styles.penaltySummaryNumber}>{totalResolved}</Text>
            <Text style={styles.penaltySummaryLabel}>Resolved</Text>
          </View>
          <View style={[styles.penaltySummaryCard, styles.waivedSummary]}>
            <Text style={styles.penaltySummaryNumber}>{totalWaived}</Text>
            <Text style={styles.penaltySummaryLabel}>Waived</Text>
          </View>
          <View style={[styles.penaltySummaryCard, styles.totalSummary]}>
            <Text style={styles.penaltySummaryNumber}>{cases.length}</Text>
            <Text style={styles.penaltySummaryLabel}>Total</Text>
          </View>
        </View>

        <View style={styles.penaltySearchContainer}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by member, reason, or type..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.secondary}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={styles.clearSearch}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.filterContainer}>
            {['all', 'pending', 'resolved', 'waived'].map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterButton,
                  filterStatus === status && styles.filterButtonActive,
                ]}
                onPress={() => setFilterStatus(status as any)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.filterButtonText,
                  filterStatus === status && styles.filterButtonTextActive,
                ]}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {filteredCases.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No matching penalties found' : 'No penalties recorded'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try adjusting your search' : 'Create cases from the Meeting Attendance tab'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredCases}
            renderItem={renderCaseItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.casesList}
          />
        )}
      </View>
    );
  };

  // ============ FIXED: MEMBER TRACKING ============
  const renderMemberTracking = () => {
    const completedMeetings = meetings.filter(meeting => meeting.is_completed === true);
    const completedMeetingDates = completedMeetings.map(m => normalizeDate(m.meeting_date));
    
    const completedAttendanceRecords = attendanceRecords.filter(record => {
      const recordDate = normalizeDate(record.meeting_date);
      return completedMeetingDates.includes(recordDate);
    });

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Member Participation Tracking</Text>
            <Text style={styles.trackingSubtitle}>
              Based on {completedMeetings.length} completed meetings
            </Text>
            <Text style={styles.trackingSubtitle}>
              Total attendance records: {completedAttendanceRecords.length}
            </Text>
          </View>
        </View>

        {completedMeetings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyText}>No completed meetings yet</Text>
            <Text style={styles.emptySubtext}>
              Go to "Meeting Attendance" tab, select a meeting, and click "Mark as Completed"
            </Text>
          </View>
        ) : (
          <View style={styles.trackingContainer}>
            {members.map((member) => {
              const memberRecords = completedAttendanceRecords.filter((r) => r.member_id === member.id);
              const totalMeetings = completedMeetings.length;
              const attendedMeetings = memberRecords.filter((r) => r.attended).length;
              const percentage = totalMeetings > 0 ? (attendedMeetings / totalMeetings) * 100 : 0;
              const hasAttendanceData = memberRecords.length > 0;
              
              const memberPenalties = cases.filter(c => c.member === member.id && c.status === 'pending');
              const totalPenaltyBalance = memberPenalties.reduce((sum, c) => sum + (c.penalty_amount - c.penalty_paid), 0);
              
              return (
                <TouchableOpacity
                  key={member.id}
                  style={[
                    styles.trackingCard,
                    !hasAttendanceData && styles.trackingCardInactive
                  ]}
                  onPress={async () => {
                    if (hasAttendanceData) {
                      await getMemberAttendanceStats(member.id);
                      setSelectedMemberForTracking(member);
                    }
                  }}
                  activeOpacity={hasAttendanceData ? 0.7 : 1}
                  disabled={!hasAttendanceData}
                >
                  <View style={styles.trackingHeader}>
                    <View style={styles.trackingMemberInfo}>
                      <Text style={styles.trackingMemberName}>{member.full_name}</Text>
                      {totalPenaltyBalance > 0 && (
                        <View style={styles.trackingPenaltyBadge}>
                          <Text style={styles.trackingPenaltyBadgeText}>
                            ⚖️ MK{totalPenaltyBalance.toLocaleString()}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[
                      styles.trackingPercentage,
                      percentage >= 80 ? styles.percentageHigh : 
                      percentage >= 50 ? styles.percentageMedium : 
                      styles.percentageLow
                    ]}>
                      {hasAttendanceData ? `${Math.round(percentage)}%` : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.trackingBarContainer}>
                    <View 
                      style={[
                        styles.trackingBar,
                        { width: hasAttendanceData ? `${Math.min(percentage, 100)}%` : '0%' }
                      ]} 
                    />
                  </View>
                  <View style={styles.trackingStats}>
                    <Text style={styles.trackingStat}>
                      {hasAttendanceData 
                        ? `✅ ${attendedMeetings} of ${totalMeetings} meetings attended`
                        : 'No attendance records yet'
                      }
                    </Text>
                  </View>
                  {hasAttendanceData && attendedMeetings < totalMeetings && (
                    <View style={styles.trackingPending}>
                      <Text style={styles.trackingPendingText}>
                        ⚠️ {totalMeetings - attendedMeetings} meeting{totalMeetings - attendedMeetings > 1 ? 's' : ''} not attended
                      </Text>
                    </View>
                  )}
                  {!hasAttendanceData && (
                    <View style={styles.trackingPending}>
                      <Text style={styles.trackingNoDataText}>
                        📋 No attendance recorded for this member
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  const renderMeetingSelectorModal = () => {
    return (
      <Modal
        visible={showMeetingSelector}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMeetingSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Meeting</Text>
              <TouchableOpacity
                onPress={() => setShowMeetingSelector(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {meetings.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>📅</Text>
                  <Text style={styles.emptyText}>No meetings found</Text>
                  <Text style={styles.emptySubtext}>Create a meeting to start tracking attendance</Text>
                </View>
              ) : (
                meetings.map((meeting) => {
                  const isCompleted = meeting.is_completed;
                  return (
                    <TouchableOpacity
                      key={meeting.id}
                      style={[
                        styles.meetingSelectorItem,
                        selectedMeeting?.id === meeting.id && styles.meetingSelectorItemSelected,
                      ]}
                      onPress={() => {
                        setSelectedMeeting(meeting);
                        setShowMeetingSelector(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.meetingSelectorItemHeader}>
                        <Text style={styles.meetingSelectorItemTitle}>{meeting.title}</Text>
                        {isCompleted ? (
                          <Text style={styles.meetingSelectorItemCompleted}>✅</Text>
                        ) : (
                          <Text style={styles.meetingSelectorItemPending}>⏳</Text>
                        )}
                      </View>
                      <Text style={styles.meetingSelectorItemDate}>
                        📅 {new Date(meeting.meeting_date).toLocaleDateString()}
                        {meeting.start_time && ` at ${meeting.start_time.substring(0, 5)}`}
                      </Text>
                      <Text style={[
                        styles.meetingSelectorItemStatus,
                        isCompleted ? styles.statusCompleted : styles.statusPending
                      ]}>
                        {isCompleted ? '✅ Completed' : '⏳ Pending'}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const closeMeetingModal = () => {
    setShowMeetingModal(false);
    setMeetingTitle('');
    setMeetingDate('');
    setStartTime('');
    setEndTime('');
    setMeetingDescription('');
  };

  const renderCreateMeetingModal = () => {
    return (
      <Modal
        visible={showMeetingModal}
        transparent
        animationType="slide"
        onRequestClose={closeMeetingModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            {/* Header stays fixed while the form scrolls */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Meeting</Text>
              <TouchableOpacity onPress={closeMeetingModal} activeOpacity={0.7}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              <View style={styles.modalBody}>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Meeting Title *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={meetingTitle}
                    onChangeText={setMeetingTitle}
                    placeholder="Enter meeting title"
                    placeholderTextColor={colors.secondary}
                  />
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Meeting Date *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={meetingDate}
                    onChangeText={setMeetingDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.secondary}
                  />
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Start Time *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={startTime}
                    onChangeText={setStartTime}
                    placeholder="HH:MM"
                    placeholderTextColor={colors.secondary}
                  />
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>End Time</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={endTime}
                    onChangeText={setEndTime}
                    placeholder="HH:MM (Optional)"
                    placeholderTextColor={colors.secondary}
                  />
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Description</Text>
                  <TextInput
                    style={[styles.modalInput, styles.modalTextArea]}
                    value={meetingDescription}
                    onChangeText={setMeetingDescription}
                    placeholder="Enter meeting description (optional)"
                    placeholderTextColor={colors.secondary}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, isSubmitting && styles.disabledButton]}
                  onPress={handleCreateMeeting}
                  disabled={isSubmitting}
                  activeOpacity={0.7}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.submitButtonText}>Create Meeting</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  const renderCreateCaseModal = () => {
    return (
      <Modal
        visible={showCaseModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowCaseModal(false);
          setSelectedMemberForCase(null);
          setCaseType('absence');
          setCaseReason('');
          setPenaltyAmount('');
        }}
      >
       <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={styles.modalScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create Penalty Case</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowCaseModal(false);
                    setSelectedMemberForCase(null);
                    setCaseType('absence');
                    setCaseReason('');
                    setPenaltyAmount('');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Member *</Text>
                  <TouchableOpacity
                    style={styles.memberSelector}
                    onPress={() => setShowMemberSelectorForCase(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.memberSelectorText, !selectedMemberForCase && styles.placeholderText]}>
                      {selectedMemberForCase?.full_name || 'Select a member'}
                    </Text>
                    <Text style={styles.memberSelectorArrow}>▼</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Case Type *</Text>
                  <View style={styles.typeSelector}>
                    {CASE_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type.value}
                        style={[
                          styles.typeButton,
                          caseType === type.value && styles.selectedTypeButton,
                        ]}
                        onPress={() => setCaseType(type.value)}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.typeButtonText,
                          caseType === type.value && styles.selectedTypeText,
                        ]}>
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Penalty Amount (MK) *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={penaltyAmount}
                    onChangeText={setPenaltyAmount}
                    placeholder="Enter penalty amount"
                    keyboardType="numeric"
                    placeholderTextColor={colors.secondary}
                  />
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Reason</Text>
                  <TextInput
                    style={[styles.modalInput, styles.modalTextArea]}
                    value={caseReason}
                    onChangeText={setCaseReason}
                    placeholder="Enter reason (optional)"
                    placeholderTextColor={colors.secondary}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, isSubmitting && styles.disabledButton]}
                  onPress={handleCreateCase}
                  disabled={isSubmitting}
                  activeOpacity={0.7}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.submitButtonText}>Create Case</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>  
      </Modal>
    );
  };

  const renderPaymentModal = () => {
    if (!selectedCaseForPayment) return null;
    
    const balance = selectedCaseForPayment.penalty_amount - selectedCaseForPayment.penalty_paid;

    return (
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowPaymentModal(false);
          setPaymentAmount('');
          setSelectedCaseForPayment(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Payment</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPaymentModal(false);
                  setPaymentAmount('');
                  setSelectedCaseForPayment(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentInfoLabel}>Member:</Text>
                <Text style={styles.paymentInfoValue}>{selectedCaseForPayment.member_name}</Text>
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentInfoLabel}>Case Type:</Text>
                <Text style={styles.paymentInfoValue}>
                  {caseTypeLabels[selectedCaseForPayment.case_type]}
                </Text>
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentInfoLabel}>Penalty Amount:</Text>
                <Text style={styles.paymentInfoValue}>
                  MK{selectedCaseForPayment.penalty_amount.toLocaleString()}
                </Text>
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentInfoLabel}>Amount Paid:</Text>
                <Text style={styles.paymentInfoValue}>
                  MK{selectedCaseForPayment.penalty_paid.toLocaleString()}
                </Text>
              </View>
              <View style={[styles.paymentInfo, styles.paymentBalanceInfo]}>
                <Text style={styles.paymentInfoLabel}>Balance:</Text>
                <Text style={[styles.paymentInfoValue, styles.balanceAmount]}>
                  MK{balance.toLocaleString()}
                </Text>
              </View>

              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Payment Amount (MK) *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  placeholder="Enter payment amount"
                  keyboardType="numeric"
                  placeholderTextColor={colors.secondary}
                />
                <Text style={styles.paymentHint}>
                  Max: MK{balance.toLocaleString()}
                </Text>
              </View>

              <View style={styles.paymentMethodInfo}>
                <Text style={styles.paymentMethodText}>💵 Payment Method: Cash</Text>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.disabledButton]}
                onPress={handleAddPayment}
                disabled={isSubmitting}
                activeOpacity={0.7}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Record Payment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderMemberSelectorForCase = () => {
    return (
      <Modal
        visible={showMemberSelectorForCase}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMemberSelectorForCase(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Member</Text>
              <TouchableOpacity
                onPress={() => setShowMemberSelectorForCase(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={members}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.memberCard,
                    selectedMemberForCase?.id === item.id && styles.selectedMemberCard
                  ]}
                  onPress={() => {
                    setSelectedMemberForCase(item);
                    setShowMemberSelectorForCase(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.memberCardName}>{item.full_name}</Text>
                  <Text style={styles.memberCardPhone}>{item.phone_number}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.memberList}
            />
          </View>
        </View>
      </Modal>
    );
  };

  const renderMemberDetailModal = () => {
    if (!selectedMemberForTracking) return null;

    const stats = memberAttendanceStats?.statistics || {};
    const completedMeetings = meetings.filter(m => m.is_completed === true);
    const completedMeetingDates = completedMeetings.map(m => normalizeDate(m.meeting_date));
    const completedAttendanceRecords = attendanceRecords.filter(record => {
      const recordDate = normalizeDate(record.meeting_date);
      return completedMeetingDates.includes(recordDate);
    });
    
    const memberRecords = completedAttendanceRecords.filter((r) => r.member_id === selectedMemberForTracking.id);
    const totalMeetings = completedMeetings.length;
    const attendedMeetings = memberRecords.filter((r) => r.attended).length;
    const percentage = totalMeetings > 0 ? (attendedMeetings / totalMeetings) * 100 : 0;

    return (
      <Modal
        visible={!!selectedMemberForTracking}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setSelectedMemberForTracking(null);
          setMemberAttendanceStats(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Member Participation</Text>
              <TouchableOpacity
                onPress={() => {
                  setSelectedMemberForTracking(null);
                  setMemberAttendanceStats(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.memberDetailName}>{selectedMemberForTracking.full_name}</Text>
              <Text style={styles.memberDetailPhone}>{selectedMemberForTracking.phone_number}</Text>

              <View style={styles.memberDetailStats}>
                <View style={styles.memberDetailStat}>
                  <Text style={styles.memberDetailStatNumber}>
                    {stats.attendance_rate !== undefined ? Math.round(stats.attendance_rate) : Math.round(percentage)}%
                  </Text>
                  <Text style={styles.memberDetailStatLabel}>Attendance Rate</Text>
                </View>
                <View style={styles.memberDetailStat}>
                  <Text style={styles.memberDetailStatNumber}>
                    {stats.attended || attendedMeetings}
                  </Text>
                  <Text style={styles.memberDetailStatLabel}>Attended</Text>
                </View>
                <View style={styles.memberDetailStat}>
                  <Text style={styles.memberDetailStatNumber}>
                    {totalMeetings - (stats.attended || attendedMeetings)}
                  </Text>
                  <Text style={styles.memberDetailStatLabel}>Absent</Text>
                </View>
                <View style={styles.memberDetailStat}>
                  <Text style={styles.memberDetailStatNumber}>
                    {stats.total_meetings || totalMeetings}
                  </Text>
                  <Text style={styles.memberDetailStatLabel}>Total Meetings</Text>
                </View>
              </View>

              <View style={styles.memberDetailBarContainer}>
                <View 
                  style={[
                    styles.memberDetailBar,
                    { width: `${Math.min(stats.attendance_rate || percentage, 100)}%` }
                  ]} 
                />
              </View>

              <View style={styles.memberDetailMeetings}>
                <Text style={styles.memberDetailMeetingsTitle}>Meeting History</Text>
                {memberRecords.length === 0 ? (
                  <Text style={styles.memberDetailNoMeetings}>No meetings attended yet</Text>
                ) : (
                  memberRecords.map((record) => {
                    const meeting = meetings.find(m => m.meeting_date === record.meeting_date);
                    return (
                      <View key={record.id} style={styles.memberDetailMeetingItem}>
                        <Text style={styles.memberDetailMeetingStatus}>
                          {record.attended ? '✅' : '❌'}
                        </Text>
                        <View style={styles.memberDetailMeetingInfo}>
                          <Text style={styles.memberDetailMeetingText}>
                            {meeting?.title || 'Meeting'}
                          </Text>
                          <Text style={styles.memberDetailMeetingDate}>
                            {new Date(record.meeting_date).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
            <Icon name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Attendance</Text>
            <Text style={styles.subtitle}>Track meeting attendance and manage penalties</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeView === 'meeting' && styles.activeTab]}
          onPress={() => setActiveView('meeting')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeView === 'meeting' && styles.activeTabText]}>
            Meeting Attendance
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeView === 'tracking' && styles.activeTab]}
          onPress={() => setActiveView('tracking')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeView === 'tracking' && styles.activeTabText]}>
            Member Tracking
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeView === 'penalties' && styles.activeTab]}
          onPress={() => setActiveView('penalties')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeView === 'penalties' && styles.activeTabText]}>
            ⚖️ Penalties
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeView === 'meeting' && renderMeetingAttendance()}
        {activeView === 'tracking' && renderMemberTracking()}
        {activeView === 'penalties' && renderPenaltiesView()}
      </ScrollView>

      {renderMeetingSelectorModal()}
      {renderCreateMeetingModal()}
      {renderCreateCaseModal()}
      {renderMemberSelectorForCase()}
      {renderPaymentModal()}
      {renderMemberDetailModal()}
    </SafeAreaView>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    padding: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.secondary,
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: colors.secondary,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  sectionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  modalScroll: {
    flexShrink: 1,
  },
  modalScrollContent: {
    paddingBottom: 8,
  },
  trackingSubtitle: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 2,
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  penaltiesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  penaltySummaryContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  penaltySummaryCard: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  pendingSummary: {
    backgroundColor: '#fef3c7',
    borderColor: '#fcd34d',
  },
  resolvedSummary: {
    backgroundColor: '#d1fae5',
    borderColor: '#6ee7b7',
  },
  waivedSummary: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
  },
  totalSummary: {
    backgroundColor: '#dbeafe',
    borderColor: '#93c5fd',
  },
  penaltySummaryNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  penaltySummaryLabel: {
    fontSize: 10,
    color: colors.secondary,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  penaltySearchContainer: {
    gap: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  clearSearch: {
    padding: 4,
    fontSize: 16,
    color: colors.secondary,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 12,
    color: colors.secondary,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  meetingSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  meetingSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  meetingSelectorText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  meetingSelectorArrow: {
    fontSize: 16,
    color: colors.secondary,
  },
  completedBadgeSmall: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  completedBadgeSmallText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#059669',
  },
  meetingInfo: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  meetingInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meetingInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  completedBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#059669',
  },
  pendingBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#d97706',
  },
  meetingInfoDate: {
    fontSize: 14,
    color: colors.secondary,
    marginTop: 4,
  },
  meetingInfoDescription: {
    fontSize: 14,
    color: colors.secondary,
    marginTop: 4,
  },
  meetingActionButtons: {
    marginTop: 8,
  },
  completeMeetingButton: {
    backgroundColor: '#059669',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  uncompleteButton: {
    backgroundColor: '#dc2626',
  },
  completeMeetingButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  attendanceList: {
    gap: 8,
  },
  attendanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  attendanceMemberInfo: {
    flex: 1,
  },
  attendanceMemberName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  attendanceMemberPhone: {
    fontSize: 12,
    color: colors.secondary,
  },
  attendanceStatusText: {
    fontSize: 10,
    color: colors.secondary,
    marginTop: 2,
  },
  penaltyBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  penaltyBadgeText: {
    fontSize: 10,
    color: '#d97706',
    fontWeight: '600',
  },
  attendanceActions: {
    flexDirection: 'row',
    gap: 4,
  },
  attendanceButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  presentButton: {
    borderColor: '#059669',
    backgroundColor: '#f0fdf4',
  },
  absentButton: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  attendanceButtonActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  attendanceButtonDisabled: {
    opacity: 0.4,
  },
  attendanceButtonText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.text,
  },
  attendanceButtonTextActive: {
    color: '#fff',
  },
  attendanceButtonTextDisabled: {
    color: colors.secondary,
  },
  attendanceSummary: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  attendanceSummaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  attendanceSummaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  attendanceSummaryStat: {
    alignItems: 'center',
  },
  attendanceSummaryStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  attendanceSummaryStatLabel: {
    fontSize: 12,
    color: colors.secondary,
  },
  attendanceCompletedNotice: {
    fontSize: 12,
    color: '#059669',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  trackingContainer: {
    gap: 12,
  },
  trackingCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trackingCardInactive: {
    opacity: 0.6,
  },
  trackingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trackingMemberInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trackingMemberName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  trackingPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  percentageHigh: {
    color: '#059669',
  },
  percentageMedium: {
    color: '#f59e0b',
  },
  percentageLow: {
    color: '#dc2626',
  },
  trackingBarContainer: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  trackingBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  trackingStats: {
    flexDirection: 'row',
  },
  trackingStat: {
    fontSize: 12,
    color: colors.secondary,
  },
  trackingPending: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  trackingPendingText: {
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: '500',
  },
  trackingNoDataText: {
    fontSize: 11,
    color: colors.secondary,
    fontStyle: 'italic',
  },
  trackingPenaltyBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trackingPenaltyBadgeText: {
    fontSize: 10,
    color: '#d97706',
    fontWeight: '600',
  },
  caseCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  caseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  caseMemberName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  caseStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  caseStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  caseDetails: {
    gap: 4,
  },
  caseDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  caseDetailLabel: {
    fontSize: 12,
    color: colors.secondary,
    width: 60,
  },
  caseDetailValue: {
    fontSize: 12,
    color: colors.text,
    flex: 1,
  },
  casePenaltyAmount: {
    fontWeight: '600',
    color: '#dc2626',
  },
  casePaidAmount: {
    fontWeight: '600',
    color: '#059669',
  },
  caseBalanceAmount: {
    fontWeight: '600',
    color: '#f59e0b',
  },
  caseTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  caseTypeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  caseActions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  caseActionButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
    borderColor: '#8b5cf6',
    backgroundColor: '#f5f3ff',
  },
  paymentButton: {
    backgroundColor: '#dbeafe',
  },
  resolveButton: {
    backgroundColor: '#d1fae5',
  },
  waiveButton: {
    backgroundColor: '#fef3c7',
  },
  caseActionButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  caseResolvedBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  caseResolvedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  caseWaivedBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  caseWaivedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#d97706',
  },
  casesList: {
    gap: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalClose: {
    fontSize: 20,
    color: colors.secondary,
    padding: 4,
  },
  modalBody: {
    gap: 12,
  },
  modalField: {
    gap: 4,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  modalTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  memberSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.background,
  },
  memberSelectorText: {
    fontSize: 16,
    color: colors.text,
  },
  placeholderText: {
    color: colors.secondary,
  },
  memberSelectorArrow: {
    fontSize: 16,
    color: colors.secondary,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeButton: {
    flex: 1,
    minWidth: '45%',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  selectedTypeButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeButtonText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  selectedTypeText: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  paymentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  paymentBalanceInfo: {
    borderBottomWidth: 0,
    marginBottom: 4,
  },
  paymentInfoLabel: {
    fontSize: 14,
    color: colors.secondary,
  },
  paymentInfoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  balanceAmount: {
    color: '#f59e0b',
    fontWeight: '700',
  },
  paymentHint: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 2,
  },
  paymentMethodInfo: {
    backgroundColor: '#f0fdf4',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  paymentMethodText: {
    fontSize: 14,
    color: '#065f46',
    fontWeight: '500',
  },
  memberList: {
    gap: 8,
  },
  memberCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  selectedMemberCard: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
  },
  memberCardName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  memberCardPhone: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.secondary,
    marginTop: 4,
  },
  meetingSelectorItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    backgroundColor: colors.background,
  },
  meetingSelectorItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
  },
  meetingSelectorItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meetingSelectorItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
  meetingSelectorItemCompleted: {
    fontSize: 14,
    marginLeft: 8,
  },
  meetingSelectorItemPending: {
    fontSize: 14,
    marginLeft: 8,
  },
  meetingSelectorItemDate: {
    fontSize: 14,
    color: colors.secondary,
    marginTop: 4,
  },
  meetingSelectorItemStatus: {
    fontSize: 12,
    marginTop: 4,
  },
  statusCompleted: {
    color: '#059669',
  },
  statusPending: {
    color: '#d97706',
  },
  memberDetailName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  memberDetailPhone: {
    fontSize: 14,
    color: colors.secondary,
    textAlign: 'center',
    marginTop: 4,
  },
  memberDetailStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  memberDetailStat: {
    alignItems: 'center',
  },
  memberDetailStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  memberDetailStatLabel: {
    fontSize: 12,
    color: colors.secondary,
  },
  memberDetailBarContainer: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 16,
  },
  memberDetailBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  memberDetailMeetings: {
    marginTop: 16,
  },
  memberDetailMeetingsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  memberDetailNoMeetings: {
    fontSize: 14,
    color: colors.secondary,
    textAlign: 'center',
    padding: 20,
  },
  memberDetailMeetingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  memberDetailMeetingStatus: {
    fontSize: 16,
    marginRight: 12,
  },
  memberDetailMeetingInfo: {
    flex: 1,
  },
  memberDetailMeetingText: {
    fontSize: 14,
    color: colors.text,
  },
  memberDetailMeetingDate: {
    fontSize: 12,
    color: colors.secondary,
  },
});
















// // src/screens/AttendanceScreen.tsx - COMPLETE WITH BACK ARROW (NO BACKGROUND)
// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   SafeAreaView,
//   TouchableOpacity,
//   ActivityIndicator,
//   Alert,
//   TextInput,
//   FlatList,
//   Modal,
//   RefreshControl,
// } from 'react-native';
// import { colors } from '../theme/colors';
// import { groupAPI, attendanceAPI, BASE_URL } from '../api/endpoints';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// interface Member {
//   id: string;
//   full_name: string;
//   phone_number: string;
// }

// interface AttendanceRecord {
//   id: string;
//   member_id: string;
//   member_name: string;
//   attended: boolean;
//   meeting_date: string;
//   meeting_type: string;
//   group: string;
// }

// interface Meeting {
//   id: string;
//   meeting_date: string;
//   start_time: string;
//   end_time?: string;
//   title: string;
//   description: string;
//   is_completed: boolean;
//   meeting_type?: string;
//   agenda?: string;
//   minutes?: string;
//   group?: string;
//   group_id?: string;
//   groupId?: string;
// }

// interface AttendanceCase {
//   id: string;
//   member: string;
//   member_name: string;
//   case_type: string;
//   meeting_date: string;
//   reason: string;
//   penalty_amount: number;
//   penalty_paid: number;
//   status: 'pending' | 'resolved' | 'waived';
//   created_at: string;
//   resolved_at: string | null;
// }

// type AttendanceView = 'meeting' | 'tracking' | 'penalties';

// const CASE_TYPES = [
//   { label: 'Late Coming', value: 'late_coming' },
//   { label: 'Absence', value: 'absence' },
//   { label: 'Early Departure', value: 'early_departure' },
//   { label: 'No Excuse', value: 'no_excuse' },
//   { label: 'Other', value: 'other' },
// ];

// const caseTypeLabels: Record<string, string> = {
//   'late_coming': 'Late Coming',
//   'absence': 'Absence',
//   'early_departure': 'Early Departure',
//   'no_excuse': 'No Excuse',
//   'other': 'Other'
// };

// const caseTypeColors: Record<string, string> = {
//   'late_coming': '#f59e0b',
//   'absence': '#dc2626',
//   'early_departure': '#8b5cf6',
//   'no_excuse': '#ef4444',
//   'other': '#6b7280'
// };

// const statusColors: Record<string, string> = {
//   'pending': '#f59e0b',
//   'resolved': '#059669',
//   'waived': '#6b7280'
// };

// export default function AttendanceScreen({ navigation }: any) {
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [activeView, setActiveView] = useState<AttendanceView>('meeting');
//   const [members, setMembers] = useState<Member[]>([]);
//   const [meetings, setMeetings] = useState<Meeting[]>([]);
//   const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
//   const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
//   const [showMeetingModal, setShowMeetingModal] = useState(false);
//   const [showMeetingSelector, setShowMeetingSelector] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [groupId, setGroupId] = useState<string | null>(null);
//   const [meetingTitle, setMeetingTitle] = useState('');
//   const [meetingDate, setMeetingDate] = useState('');
//   const [startTime, setStartTime] = useState('');
//   const [endTime, setEndTime] = useState('');
//   const [meetingDescription, setMeetingDescription] = useState('');
//   const [selectedMemberForTracking, setSelectedMemberForTracking] = useState<Member | null>(null);
//   const [memberAttendanceStats, setMemberAttendanceStats] = useState<any>(null);
//   const [showCaseModal, setShowCaseModal] = useState(false);
//   const [selectedMemberForCase, setSelectedMemberForCase] = useState<Member | null>(null);
//   const [showMemberSelectorForCase, setShowMemberSelectorForCase] = useState(false);
//   const [caseType, setCaseType] = useState<string>('absence');
//   const [caseReason, setCaseReason] = useState('');
//   const [penaltyAmount, setPenaltyAmount] = useState('');
//   const [cases, setCases] = useState<AttendanceCase[]>([]);
//   const [showPaymentModal, setShowPaymentModal] = useState(false);
//   const [selectedCaseForPayment, setSelectedCaseForPayment] = useState<AttendanceCase | null>(null);
//   const [paymentAmount, setPaymentAmount] = useState('');
//   const [searchQuery, setSearchQuery] = useState('');
//   const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'resolved' | 'waived'>('all');
  
//   // Pagination states
//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   const [totalMeetings, setTotalMeetings] = useState(0);
//   const [paginatedMeetings, setPaginatedMeetings] = useState<Meeting[]>([]);

//   useEffect(() => {
//     loadGroupAndData();
//   }, []);

//   const loadGroupAndData = async () => {
//     try {
//       setLoading(true);
//       const response = await groupAPI.getGroups();
//       const results = Array.isArray(response.data) ? response.data : response.data.results || [];
//       if (results.length > 0) {
//         setGroupId(results[0].id);
//         await loadMembers(results[0].id);
//         await loadMeetings(1);
//         await loadAttendanceData();
//         await loadCases();
//       } else {
//         Alert.alert('No Group', 'You are not assigned to any group yet.');
//       }
//     } catch (error) {
//       console.error('Failed to load group:', error);
//       Alert.alert('Error', 'Failed to load group data');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const loadMembers = async (groupId: string) => {
//     try {
//       const response = await groupAPI.getMembers(groupId);
//       const membersData = Array.isArray(response.data) ? response.data : [];
//       setMembers(membersData.map((m: any) => ({
//         id: m.id,
//         full_name: m.full_name,
//         phone_number: m.phone_number,
//       })));
//     } catch (error) {
//       console.error('Failed to load members:', error);
//     }
//   };

//   // ============ LOAD MEETINGS WITH PAGINATION ============
//   const loadMeetings = async (page: number = 1) => {
//     try {
//       const token = await AsyncStorage.getItem('access_token');
//       const url = `${BASE_URL}/meetings/?page=${page}&page_size=5`;
      
//       const response: Response = await fetch(url, {
//         headers: {
//           'Authorization': `Bearer ${token}`,
//           'Content-Type': 'application/json',
//         },
//       });
      
//       const data: any = await response.json();
      
//       // Filter for this group
//       let groupMeetings = data.results || [];
//       if (groupId) {
//         groupMeetings = data.results.filter((m: any) => {
//           const recordGroupId = m.group || m.group_id || m.groupId;
//           return recordGroupId === groupId;
//         });
//       }
      
//       groupMeetings.sort((a: any, b: any) => {
//         return new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime();
//       });
      
//       // Set paginated meetings for display
//       setPaginatedMeetings(groupMeetings);
//       setTotalMeetings(data.count || 0);
//       setTotalPages(Math.ceil((data.count || 0) / 5));
//       setCurrentPage(page);

//       // Also store all meetings for the tracking tab (load all pages)
//       let allMeetingsForTracking: Meeting[] = [];
//       let nextUrl: string | null = `${BASE_URL}/meetings/?page=1&page_size=100`;
      
//       while (nextUrl) {
//         const token2 = await AsyncStorage.getItem('access_token');
//         const response2: Response = await fetch(nextUrl, {
//           headers: {
//             'Authorization': `Bearer ${token2}`,
//             'Content-Type': 'application/json',
//           },
//         });
//         const data2: any = await response2.json();
//         if (data2.results) {
//           allMeetingsForTracking = [...allMeetingsForTracking, ...data2.results];
//         }
//         nextUrl = data2.next || null;
//       }
      
//       let groupMeetingsForTracking = allMeetingsForTracking;
//       if (groupId) {
//         groupMeetingsForTracking = allMeetingsForTracking.filter((m) => {
//           const recordGroupId = (m as any).group || (m as any).group_id || (m as any).groupId;
//           return recordGroupId === groupId;
//         });
//       }
      
//       groupMeetingsForTracking.sort((a, b) => {
//         return new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime();
//       });
      
//       setMeetings(groupMeetingsForTracking);
      
//       if (groupMeetings.length > 0) {
//         const incompleteMeeting = groupMeetings.find((m: any) => !m.is_completed);
//         setSelectedMeeting(incompleteMeeting || groupMeetings[0]);
//       }
//     } catch (error) {
//       console.error('Failed to load meetings:', error);
//     }
//   };

//   // ============ LOAD ALL ATTENDANCE RECORDS WITH PAGINATION ============
//   const loadAttendanceData = async () => {
//     try {
//       let allAttendance: any[] = [];
//       let nextUrl: string | null = `${BASE_URL}/attendance/?page=1&page_size=100`;
      
//       while (nextUrl) {
//         const token = await AsyncStorage.getItem('access_token');
//         const response: Response = await fetch(nextUrl, {
//           headers: {
//             'Authorization': `Bearer ${token}`,
//             'Content-Type': 'application/json',
//           },
//         });
//         const data: any = await response.json();
//         if (data.results) {
//           allAttendance = [...allAttendance, ...data.results];
//         }
//         nextUrl = data.next || null;
//       }
      
//       let groupAttendance = allAttendance;
//       if (groupId) {
//         groupAttendance = allAttendance.filter((a: any) => {
//           const recordGroupId = a.group || a.group_id || a.groupId;
//           return recordGroupId === groupId;
//         });
//       }
      
//       const mappedAttendance: AttendanceRecord[] = groupAttendance.map((a: any) => ({
//         id: a.id,
//         member_id: a.member || a.member_id,
//         member_name: a.member_name || a.member?.full_name || 'Unknown',
//         attended: a.attended || false,
//         meeting_date: a.meeting_date || a.created_at,
//         meeting_type: a.meeting_type || 'regular',
//         group: a.group || groupId,
//       }));
      
//       setAttendanceRecords(mappedAttendance);
//       console.log('✅ Attendance records loaded:', mappedAttendance.length);
//     } catch (error) {
//       console.error('Failed to load attendance:', error);
//     }
//   };

//   // ============ LOAD ALL CASES WITH PAGINATION ============
//   const loadCases = async () => {
//     try {
//       let allCases: any[] = [];
//       let nextUrl: string | null = `${BASE_URL}/attendance-cases/?page=1&page_size=100`;
      
//       while (nextUrl) {
//         const token = await AsyncStorage.getItem('access_token');
//         const response: Response = await fetch(nextUrl, {
//           headers: {
//             'Authorization': `Bearer ${token}`,
//             'Content-Type': 'application/json',
//           },
//         });
//         const data: any = await response.json();
//         if (data.results) {
//           allCases = [...allCases, ...data.results];
//         }
//         nextUrl = data.next || null;
//       }
      
//       let groupCases = allCases;
//       if (groupId) {
//         groupCases = allCases.filter((c: any) => {
//           const recordGroupId = c.group || c.group_id || c.groupId;
//           return recordGroupId === groupId;
//         });
//       }
      
//       const mappedCases: AttendanceCase[] = groupCases.map((c: any) => ({
//         id: c.id,
//         member: c.member || c.member_id,
//         member_name: c.member_name || c.member?.full_name || 'Unknown',
//         case_type: c.case_type || 'other',
//         meeting_date: c.meeting_date || c.created_at,
//         reason: c.reason || '',
//         penalty_amount: parseFloat(c.penalty_amount) || 0,
//         penalty_paid: parseFloat(c.penalty_paid) || 0,
//         status: c.status || 'pending',
//         created_at: c.created_at,
//         resolved_at: c.resolved_at || null,
//       }));
      
//       setCases(mappedCases);
//     } catch (error) {
//       console.error('Failed to load cases:', error);
//     }
//   };

//   const onRefresh = async () => {
//     setRefreshing(true);
//     if (groupId) {
//       await loadMembers(groupId);
//       await loadMeetings(currentPage);
//       await loadAttendanceData();
//       await loadCases();
//     }
//     setRefreshing(false);
//   };

//   const normalizeDate = (dateString: string): string => {
//     if (!dateString) return '';
//     return dateString.split('T')[0];
//   };

//   const directMarkComplete = async (meetingId: string): Promise<boolean> => {
//     try {
//       const token = await AsyncStorage.getItem('access_token');
//       const url = `${BASE_URL}/meetings/${meetingId}/mark_completed/`;
      
//       const response: Response = await fetch(url, {
//         method: 'POST',
//         headers: {
//           'Authorization': `Bearer ${token}`,
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({}),
//       });
      
//       const data: any = await response.json();
      
//       if (response.ok) {
//         Alert.alert('✅ Success', 'Meeting completed!');
//         updateLocalMeetingState(meetingId, true);
//         await loadMeetings(currentPage);
//         await loadAttendanceData();
//         await loadMembers(groupId!);
//         return true;
//       } else {
//         Alert.alert('❌ Error', data.error || data.message || 'Failed to complete meeting');
//         return false;
//       }
//     } catch (error: any) {
//       console.error('Direct API call failed:', error);
//       Alert.alert('❌ Error', error.message || 'Network error');
//       return false;
//     }
//   };

//   const updateLocalMeetingState = (meetingId: string, completed: boolean): void => {
//     setMeetings(prevMeetings => {
//       return prevMeetings.map(m => 
//         m.id === meetingId ? { ...m, is_completed: completed } : m
//       );
//     });
    
//     setPaginatedMeetings(prevMeetings => {
//       return prevMeetings.map(m => 
//         m.id === meetingId ? { ...m, is_completed: completed } : m
//       );
//     });
    
//     if (selectedMeeting && selectedMeeting.id === meetingId) {
//       setSelectedMeeting({ ...selectedMeeting, is_completed: completed });
//     }
//   };

//   const handleUncompleteMeeting = async (meetingId: string): Promise<void> => {
//     if (!meetingId) {
//       Alert.alert('Error', 'No meeting ID provided');
//       return;
//     }

//     Alert.alert(
//       'Uncomplete Meeting',
//       'Are you sure you want to uncomplete this meeting?',
//       [
//         { text: 'Cancel', style: 'cancel' },
//         {
//           text: 'Uncomplete',
//           style: 'destructive',
//           onPress: async () => {
//             try {
//               setIsSubmitting(true);
//               await attendanceAPI.updateMeeting(meetingId, { is_completed: false });
//               updateLocalMeetingState(meetingId, false);
//               Alert.alert('✅ Success', 'Meeting uncompleted!');
//               await loadMeetings(currentPage);
//               await loadAttendanceData();
//             } catch (error: any) {
//               console.error('Failed to uncomplete meeting:', error);
//               Alert.alert('❌ Error', error?.response?.data?.error || 'Failed to uncomplete meeting');
//             } finally {
//               setIsSubmitting(false);
//             }
//           }
//         }
//       ]
//     );
//   };

//   const handleCreateMeeting = async (): Promise<void> => {
//     if (!meetingTitle.trim()) {
//       Alert.alert('Error', 'Please enter a meeting title');
//       return;
//     }

//     if (!meetingDate.trim()) {
//       Alert.alert('Error', 'Please select a meeting date');
//       return;
//     }

//     if (!startTime.trim()) {
//       Alert.alert('Error', 'Please enter start time');
//       return;
//     }

//     if (!groupId) {
//       Alert.alert('Error', 'No group selected. Please try again.');
//       return;
//     }

//     setIsSubmitting(true);
//     try {
//       const data = {
//         group: groupId,
//         title: meetingTitle.trim(),
//         meeting_date: meetingDate.trim(),
//         start_time: startTime.trim(),
//         end_time: endTime.trim() || null,
//         description: meetingDescription.trim(),
//         is_completed: false,
//         meeting_type: 'regular',
//       };

//       await attendanceAPI.createMeeting(data);
      
//       Alert.alert('✅ Success', 'Meeting created successfully!');
//       setShowMeetingModal(false);
//       setMeetingTitle('');
//       setMeetingDate('');
//       setStartTime('');
//       setEndTime('');
//       setMeetingDescription('');
//       await loadMeetings(1);
      
//     } catch (error: any) {
//       console.error('Failed to create meeting:', error);
//       Alert.alert('❌ Error', error?.response?.data?.error || 'Failed to create meeting');
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const handleMarkAttendance = async (memberId: string, attended: boolean): Promise<void> => {
//     if (!selectedMeeting) {
//       Alert.alert('Error', 'Please select a meeting first');
//       return;
//     }

//     if (selectedMeeting.is_completed) {
//       Alert.alert('Error', 'Cannot modify attendance for a completed meeting');
//       return;
//     }

//     if (!groupId) {
//       Alert.alert('Error', 'No group found. Please try again.');
//       return;
//     }

//     setIsSubmitting(true);
//     try {
//       const existingRecord = attendanceRecords.find(
//         (r) => r.member_id === memberId && r.meeting_date === selectedMeeting.meeting_date
//       );

//       const data = {
//         member: memberId,
//         group: groupId,
//         meeting_date: selectedMeeting.meeting_date,
//         meeting_type: selectedMeeting.meeting_type || 'regular',
//         attended: attended,
//       };

//       if (existingRecord) {
//         await attendanceAPI.updateAttendance(existingRecord.id, data);
//       } else {
//         await attendanceAPI.createAttendance(data);
//       }
      
//       await loadAttendanceData();
//       await loadMembers(groupId);
//       Alert.alert('✅ Success', `Member marked as ${attended ? 'Present' : 'Absent'}`);
      
//     } catch (error: any) {
//       console.error('Failed to mark attendance:', error);
//       Alert.alert('❌ Error', error?.response?.data?.error || 'Failed to mark attendance');
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const handleCreateCase = async (): Promise<void> => {
//     if (!selectedMemberForCase) {
//       Alert.alert('Error', 'Please select a member');
//       return;
//     }

//     if (!selectedMeeting) {
//       Alert.alert('Error', 'Please select a meeting first');
//       return;
//     }

//     const amount = parseFloat(penaltyAmount);
//     if (!amount || amount <= 0) {
//       Alert.alert('Error', 'Please enter a valid penalty amount');
//       return;
//     }

//     setIsSubmitting(true);
//     try {
//       const data = {
//         member: selectedMemberForCase.id,
//         group: groupId,
//         case_type: caseType,
//         meeting_date: selectedMeeting.meeting_date,
//         reason: caseReason.trim() || `${caseTypeLabels[caseType]} penalty`,
//         penalty_amount: amount,
//       };

//       await attendanceAPI.createCase(data);
      
//       Alert.alert('✅ Success', 'Penalty case created successfully!');
//       setShowCaseModal(false);
//       setSelectedMemberForCase(null);
//       setCaseType('absence');
//       setCaseReason('');
//       setPenaltyAmount('');
//       await loadCases();
//     } catch (error: any) {
//       console.error('Failed to create case:', error);
//       Alert.alert('❌ Error', error?.response?.data?.error || 'Failed to create case');
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const handleAddPayment = async (): Promise<void> => {
//     if (!selectedCaseForPayment) {
//       Alert.alert('Error', 'No case selected');
//       return;
//     }

//     const amount = parseFloat(paymentAmount);
//     if (!amount || amount <= 0) {
//       Alert.alert('Error', 'Please enter a valid payment amount');
//       return;
//     }

//     const balance = selectedCaseForPayment.penalty_amount - selectedCaseForPayment.penalty_paid;
//     if (amount > balance) {
//       Alert.alert('Error', `Amount exceeds balance. Balance: MK${balance.toLocaleString()}`);
//       return;
//     }

//     setIsSubmitting(true);
//     try {
//       const data = {
//         amount: amount,
//         payment_method: 'cash',
//         notes: `Cash payment for ${caseTypeLabels[selectedCaseForPayment.case_type]} penalty`,
//       };

//       await attendanceAPI.addPaymentToCase(selectedCaseForPayment.id, data);
//       Alert.alert('✅ Success', `Payment of MK${amount.toLocaleString()} recorded successfully!`);
//       setShowPaymentModal(false);
//       setPaymentAmount('');
//       setSelectedCaseForPayment(null);
//       await loadCases();
//     } catch (error: any) {
//       console.error('Failed to add payment:', error);
//       Alert.alert('❌ Error', error?.response?.data?.error || 'Failed to add payment');
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const handleResolveCase = async (caseId: string): Promise<void> => {
//     Alert.alert(
//       'Resolve Case',
//       'Are you sure you want to resolve this case? The penalty must be fully paid.',
//       [
//         { text: 'Cancel', style: 'cancel' },
//         {
//           text: 'Resolve',
//           onPress: async () => {
//             try {
//               await attendanceAPI.resolveCase(caseId, {});
//               Alert.alert('✅ Success', 'Case resolved successfully!');
//               await loadCases();
//             } catch (error: any) {
//               console.error('Failed to resolve case:', error);
//               Alert.alert('❌ Error', error?.response?.data?.error || 'Failed to resolve case');
//             }
//           }
//         }
//       ]
//     );
//   };

//   const handleWaiveCase = async (caseId: string): Promise<void> => {
//     Alert.alert(
//       'Waive Penalty',
//       'Are you sure you want to waive this penalty?',
//       [
//         { text: 'Cancel', style: 'cancel' },
//         {
//           text: 'Waive',
//           style: 'destructive',
//           onPress: async () => {
//             try {
//               await attendanceAPI.waiveCase(caseId);
//               Alert.alert('✅ Success', 'Penalty waived successfully!');
//               await loadCases();
//             } catch (error: any) {
//               console.error('Failed to waive case:', error);
//               Alert.alert('❌ Error', error?.response?.data?.error || 'Failed to waive penalty');
//             }
//           }
//         }
//       ]
//     );
//   };

//   const getAttendanceStatus = (memberId: string): boolean | null => {
//     if (!selectedMeeting) return null;
//     const record = attendanceRecords.find(
//       (r) => r.member_id === memberId && r.meeting_date === selectedMeeting.meeting_date
//     );
//     return record ? record.attended : null;
//   };

//   const getMemberAttendanceStats = async (memberId: string): Promise<void> => {
//     try {
//       const response = await attendanceAPI.getMemberAttendance(memberId);
//       setMemberAttendanceStats(response.data);
//     } catch (error) {
//       console.error('Failed to get member stats:', error);
//     }
//   };

//   const getMemberTotalPenalty = (memberId: string): number => {
//     const memberCases = cases.filter(c => c.member === memberId && c.status === 'pending');
//     return memberCases.reduce((sum, c) => sum + (c.penalty_amount - c.penalty_paid), 0);
//   };

//   const getFilteredCases = (): AttendanceCase[] => {
//     let filtered = cases;
//     if (filterStatus !== 'all') {
//       filtered = filtered.filter(c => c.status === filterStatus);
//     }
//     if (searchQuery.trim()) {
//       const query = searchQuery.toLowerCase().trim();
//       filtered = filtered.filter(c => 
//         c.member_name.toLowerCase().includes(query) ||
//         c.reason.toLowerCase().includes(query) ||
//         caseTypeLabels[c.case_type].toLowerCase().includes(query)
//       );
//     }
//     return filtered;
//   };

//   const renderCaseItem = ({ item }: { item: AttendanceCase }) => {
//     const balance = item.penalty_amount - item.penalty_paid;
//     const isFullyPaid = balance <= 0;
//     const canResolve = item.status === 'pending' && isFullyPaid;

//     return (
//       <View style={styles.caseCard}>
//         <View style={styles.caseHeader}>
//           <Text style={styles.caseMemberName}>{item.member_name}</Text>
//           <View style={[styles.caseStatusBadge, { backgroundColor: statusColors[item.status] }]}>
//             <Text style={styles.caseStatusText}>{item.status.toUpperCase()}</Text>
//           </View>
//         </View>
        
//         <View style={styles.caseDetails}>
//           <View style={styles.caseDetailRow}>
//             <Text style={styles.caseDetailLabel}>Type:</Text>
//             <View style={[styles.caseTypeBadge, { backgroundColor: caseTypeColors[item.case_type] + '20' }]}>
//               <Text style={[styles.caseTypeText, { color: caseTypeColors[item.case_type] }]}>
//                 {caseTypeLabels[item.case_type]}
//               </Text>
//             </View>
//           </View>
//           <View style={styles.caseDetailRow}>
//             <Text style={styles.caseDetailLabel}>Date:</Text>
//             <Text style={styles.caseDetailValue}>
//               {new Date(item.meeting_date).toLocaleDateString()}
//             </Text>
//           </View>
//           {item.reason && (
//             <View style={styles.caseDetailRow}>
//               <Text style={styles.caseDetailLabel}>Reason:</Text>
//               <Text style={styles.caseDetailValue}>{item.reason}</Text>
//             </View>
//           )}
//           <View style={styles.caseDetailRow}>
//             <Text style={styles.caseDetailLabel}>Penalty:</Text>
//             <Text style={[styles.caseDetailValue, styles.casePenaltyAmount]}>
//               MK{item.penalty_amount.toLocaleString()}
//             </Text>
//           </View>
//           <View style={styles.caseDetailRow}>
//             <Text style={styles.caseDetailLabel}>Paid:</Text>
//             <Text style={[styles.caseDetailValue, styles.casePaidAmount]}>
//               MK{item.penalty_paid.toLocaleString()}
//             </Text>
//           </View>
//           <View style={styles.caseDetailRow}>
//             <Text style={styles.caseDetailLabel}>Balance:</Text>
//             <Text style={[
//               styles.caseDetailValue,
//               balance > 0 ? styles.caseBalanceAmount : styles.casePaidAmount
//             ]}>
//               MK{balance.toLocaleString()}
//             </Text>
//           </View>
//         </View>

//         <View style={styles.caseActions}>
//           {item.status === 'pending' && (
//             <>
//               <TouchableOpacity
//                 style={[styles.caseActionButton, styles.paymentButton]}
//                 onPress={() => {
//                   setSelectedCaseForPayment(item);
//                   setPaymentAmount('');
//                   setShowPaymentModal(true);
//                 }}
//                 activeOpacity={0.7}
//               >
//                 <Text style={styles.caseActionButtonText}>💳 Pay</Text>
//               </TouchableOpacity>
//               {canResolve && (
//                 <TouchableOpacity
//                   style={[styles.caseActionButton, styles.resolveButton]}
//                   onPress={() => handleResolveCase(item.id)}
//                   activeOpacity={0.7}
//                 >
//                   <Text style={styles.caseActionButtonText}>✅ Resolve</Text>
//                 </TouchableOpacity>
//               )}
//               <TouchableOpacity
//                 style={[styles.caseActionButton, styles.waiveButton]}
//                 onPress={() => handleWaiveCase(item.id)}
//                 activeOpacity={0.7}
//               >
//                 <Text style={styles.caseActionButtonText}>🎯 Waive</Text>
//               </TouchableOpacity>
//             </>
//           )}
//           {item.status === 'resolved' && (
//             <View style={styles.caseResolvedBadge}>
//               <Text style={styles.caseResolvedText}>✅ Resolved</Text>
//             </View>
//           )}
//           {item.status === 'waived' && (
//             <View style={styles.caseWaivedBadge}>
//               <Text style={styles.caseWaivedText}>🎯 Waived</Text>
//             </View>
//           )}
//         </View>
//       </View>
//     );
//   };

//   const renderMeetingAttendance = () => {
//     return (
//       <View style={styles.section}>
//         <View style={styles.sectionHeader}>
//           <Text style={styles.sectionTitle}>Meeting Attendance</Text>
//           <View style={styles.sectionActions}>
//             <TouchableOpacity
//               style={styles.createButton}
//               onPress={() => setShowMeetingModal(true)}
//               activeOpacity={0.7}
//             >
//               <Text style={styles.createButtonText}>+ New Meeting</Text>
//             </TouchableOpacity>
//           </View>
//         </View>

//         <TouchableOpacity
//           style={styles.meetingSelector}
//           onPress={() => setShowMeetingSelector(true)}
//           activeOpacity={0.7}
//         >
//           <View style={styles.meetingSelectorContent}>
//             <Text style={styles.meetingSelectorText}>
//               {selectedMeeting?.title || 'Select a meeting'}
//             </Text>
//             {selectedMeeting?.is_completed && (
//               <View style={styles.completedBadgeSmall}>
//                 <Text style={styles.completedBadgeSmallText}>✅ Completed</Text>
//               </View>
//             )}
//           </View>
//           <View style={styles.meetingSelectorRight}>
//             <Text style={styles.meetingSelectorCount}>
//               {totalMeetings > 0 ? `(${totalMeetings})` : ''}
//             </Text>
//             <Text style={styles.meetingSelectorArrow}>▼</Text>
//           </View>
//         </TouchableOpacity>

//         {selectedMeeting && (
//           <View style={styles.meetingInfo}>
//             <View style={styles.meetingInfoHeader}>
//               <Text style={styles.meetingInfoTitle}>{selectedMeeting.title}</Text>
//               {selectedMeeting.is_completed ? (
//                 <View style={styles.completedBadge}>
//                   <Text style={styles.completedBadgeText}>✅ Completed</Text>
//                 </View>
//               ) : (
//                 <View style={styles.pendingBadge}>
//                   <Text style={styles.pendingBadgeText}>⏳ Pending</Text>
//                 </View>
//               )}
//             </View>
//             <Text style={styles.meetingInfoDate}>
//               📅 {new Date(selectedMeeting.meeting_date).toLocaleDateString()}
//               {selectedMeeting.start_time && ` at ${selectedMeeting.start_time.substring(0, 5)}`}
//               {selectedMeeting.end_time && ` - ${selectedMeeting.end_time.substring(0, 5)}`}
//             </Text>
//             {selectedMeeting.description && (
//               <Text style={styles.meetingInfoDescription}>{selectedMeeting.description}</Text>
//             )}
            
//             <View style={styles.meetingActionButtons}>
//               {!selectedMeeting.is_completed ? (
//                 <TouchableOpacity
//                   style={styles.completeMeetingButton}
//                   onPress={() => {
//                     directMarkComplete(selectedMeeting.id);
//                   }}
//                   disabled={isSubmitting}
//                   activeOpacity={0.7}
//                 >
//                   <Text style={styles.completeMeetingButtonText}>
//                     {isSubmitting ? '⏳ Processing...' : '✅ Mark as Completed'}
//                   </Text>
//                 </TouchableOpacity>
//               ) : (
//                 <TouchableOpacity
//                   style={[styles.completeMeetingButton, styles.uncompleteButton]}
//                   onPress={() => {
//                     handleUncompleteMeeting(selectedMeeting.id);
//                   }}
//                   disabled={isSubmitting}
//                   activeOpacity={0.7}
//                 >
//                   <Text style={styles.completeMeetingButtonText}>
//                     {isSubmitting ? '⏳ Processing...' : '🔄 Uncomplete Meeting'}
//                   </Text>
//                 </TouchableOpacity>
//               )}
//             </View>
//           </View>
//         )}

//         {members.length === 0 ? (
//           <View style={styles.emptyState}>
//             <Text style={styles.emptyEmoji}>👤</Text>
//             <Text style={styles.emptyText}>No members found</Text>
//             <Text style={styles.emptySubtext}>Add members to mark attendance</Text>
//           </View>
//         ) : (
//           <View style={styles.attendanceList}>
//             {members.map((member) => {
//               const status = getAttendanceStatus(member.id);
//               const isPresent = status === true;
//               const isAbsent = status === false;
//               const hasPenalty = getMemberTotalPenalty(member.id) > 0;
//               const isMeetingCompleted = selectedMeeting?.is_completed || false;

//               return (
//                 <View key={member.id} style={styles.attendanceItem}>
//                   <View style={styles.attendanceMemberInfo}>
//                     <Text style={styles.attendanceMemberName}>{member.full_name}</Text>
//                     <Text style={styles.attendanceMemberPhone}>{member.phone_number}</Text>
//                     {hasPenalty && (
//                       <View style={styles.penaltyBadge}>
//                         <Text style={styles.penaltyBadgeText}>
//                           ⚖️ MK{getMemberTotalPenalty(member.id).toLocaleString()}
//                         </Text>
//                       </View>
//                     )}
//                     <Text style={styles.attendanceStatusText}>
//                       Status: {status === true ? '✅ Present' : status === false ? '❌ Absent' : '⏳ Pending'}
//                     </Text>
//                   </View>
//                   <View style={styles.attendanceActions}>
//                     <TouchableOpacity
//                       style={[
//                         styles.attendanceButton,
//                         styles.presentButton,
//                         isPresent && styles.attendanceButtonActive,
//                         (isAbsent || isMeetingCompleted) && styles.attendanceButtonDisabled,
//                       ]}
//                       onPress={() => handleMarkAttendance(member.id, true)}
//                       disabled={isSubmitting || isAbsent || isMeetingCompleted}
//                       activeOpacity={0.7}
//                     >
//                       <Text style={[
//                         styles.attendanceButtonText,
//                         isPresent && styles.attendanceButtonTextActive,
//                         (isAbsent || isMeetingCompleted) && styles.attendanceButtonTextDisabled,
//                       ]}>
//                         ✅ Present
//                       </Text>
//                     </TouchableOpacity>
//                     <TouchableOpacity
//                       style={[
//                         styles.attendanceButton,
//                         styles.absentButton,
//                         isAbsent && styles.attendanceButtonActive,
//                         (isPresent || isMeetingCompleted) && styles.attendanceButtonDisabled,
//                       ]}
//                       onPress={() => handleMarkAttendance(member.id, false)}
//                       disabled={isSubmitting || isPresent || isMeetingCompleted}
//                       activeOpacity={0.7}
//                     >
//                       <Text style={[
//                         styles.attendanceButtonText,
//                         isAbsent && styles.attendanceButtonTextActive,
//                         (isPresent || isMeetingCompleted) && styles.attendanceButtonTextDisabled,
//                       ]}>
//                         ❌ Absent
//                       </Text>
//                     </TouchableOpacity>
//                     <TouchableOpacity
//                       style={[
//                         styles.attendanceButton,
//                         styles.caseActionButton,
//                       ]}
//                       onPress={() => {
//                         setSelectedMemberForCase(member);
//                         setShowCaseModal(true);
//                         setCaseType('absence');
//                         setCaseReason('');
//                         setPenaltyAmount('');
//                       }}
//                       activeOpacity={0.7}
//                     >
//                       <Text style={styles.attendanceButtonText}>⚖️</Text>
//                     </TouchableOpacity>
//                   </View>
//                 </View>
//               );
//             })}
//           </View>
//         )}

//         {selectedMeeting && (
//           <View style={styles.attendanceSummary}>
//             <Text style={styles.attendanceSummaryTitle}>Summary</Text>
//             <View style={styles.attendanceSummaryStats}>
//               <View style={styles.attendanceSummaryStat}>
//                 <Text style={styles.attendanceSummaryStatNumber}>
//                   {members.filter((m) => getAttendanceStatus(m.id) === true).length}
//                 </Text>
//                 <Text style={styles.attendanceSummaryStatLabel}>Present</Text>
//               </View>
//               <View style={styles.attendanceSummaryStat}>
//                 <Text style={styles.attendanceSummaryStatNumber}>
//                   {members.filter((m) => getAttendanceStatus(m.id) === false).length}
//                 </Text>
//                 <Text style={styles.attendanceSummaryStatLabel}>Absent</Text>
//               </View>
//               <View style={styles.attendanceSummaryStat}>
//                 <Text style={styles.attendanceSummaryStatNumber}>
//                   {members.filter((m) => getAttendanceStatus(m.id) === null).length}
//                 </Text>
//                 <Text style={styles.attendanceSummaryStatLabel}>Pending</Text>
//               </View>
//               <View style={styles.attendanceSummaryStat}>
//                 <Text style={styles.attendanceSummaryStatNumber}>
//                   {members.length}
//                 </Text>
//                 <Text style={styles.attendanceSummaryStatLabel}>Total</Text>
//               </View>
//             </View>
//             {selectedMeeting.is_completed && (
//               <Text style={styles.attendanceCompletedNotice}>
//                 ✅ This meeting is completed and locked
//               </Text>
//             )}
//           </View>
//         )}
//       </View>
//     );
//   };

//   const renderPenaltiesView = () => {
//     const filteredCases = getFilteredCases();
//     const totalPending = cases.filter(c => c.status === 'pending').length;
//     const totalResolved = cases.filter(c => c.status === 'resolved').length;
//     const totalWaived = cases.filter(c => c.status === 'waived').length;

//     return (
//       <View style={styles.section}>
//         <View style={styles.penaltiesHeader}>
//           <Text style={styles.sectionTitle}>⚖️ Penalties</Text>
//           <TouchableOpacity
//             style={styles.createButton}
//             onPress={() => {
//               setSelectedMemberForCase(null);
//               setShowCaseModal(true);
//               setCaseType('absence');
//               setCaseReason('');
//               setPenaltyAmount('');
//             }}
//             activeOpacity={0.7}
//           >
//             <Text style={styles.createButtonText}>+ New Case</Text>
//           </TouchableOpacity>
//         </View>

//         <View style={styles.penaltySummaryContainer}>
//           <View style={[styles.penaltySummaryCard, styles.pendingSummary]}>
//             <Text style={styles.penaltySummaryNumber}>{totalPending}</Text>
//             <Text style={styles.penaltySummaryLabel}>Pending</Text>
//           </View>
//           <View style={[styles.penaltySummaryCard, styles.resolvedSummary]}>
//             <Text style={styles.penaltySummaryNumber}>{totalResolved}</Text>
//             <Text style={styles.penaltySummaryLabel}>Resolved</Text>
//           </View>
//           <View style={[styles.penaltySummaryCard, styles.waivedSummary]}>
//             <Text style={styles.penaltySummaryNumber}>{totalWaived}</Text>
//             <Text style={styles.penaltySummaryLabel}>Waived</Text>
//           </View>
//           <View style={[styles.penaltySummaryCard, styles.totalSummary]}>
//             <Text style={styles.penaltySummaryNumber}>{cases.length}</Text>
//             <Text style={styles.penaltySummaryLabel}>Total</Text>
//           </View>
//         </View>

//         <View style={styles.penaltySearchContainer}>
//           <View style={styles.searchBar}>
//             <Text style={styles.searchIcon}>🔍</Text>
//             <TextInput
//               style={styles.searchInput}
//               placeholder="Search by member, reason, or type..."
//               value={searchQuery}
//               onChangeText={setSearchQuery}
//               placeholderTextColor={colors.secondary}
//             />
//             {searchQuery.length > 0 && (
//               <TouchableOpacity onPress={() => setSearchQuery('')}>
//                 <Text style={styles.clearSearch}>✕</Text>
//               </TouchableOpacity>
//             )}
//           </View>
//           <View style={styles.filterContainer}>
//             {['all', 'pending', 'resolved', 'waived'].map((status) => (
//               <TouchableOpacity
//                 key={status}
//                 style={[
//                   styles.filterButton,
//                   filterStatus === status && styles.filterButtonActive,
//                 ]}
//                 onPress={() => setFilterStatus(status as any)}
//                 activeOpacity={0.7}
//               >
//                 <Text style={[
//                   styles.filterButtonText,
//                   filterStatus === status && styles.filterButtonTextActive,
//                 ]}>
//                   {status.charAt(0).toUpperCase() + status.slice(1)}
//                 </Text>
//               </TouchableOpacity>
//             ))}
//           </View>
//         </View>

//         {filteredCases.length === 0 ? (
//           <View style={styles.emptyState}>
//             <Text style={styles.emptyEmoji}>📋</Text>
//             <Text style={styles.emptyText}>
//               {searchQuery ? 'No matching penalties found' : 'No penalties recorded'}
//             </Text>
//             <Text style={styles.emptySubtext}>
//               {searchQuery ? 'Try adjusting your search' : 'Create cases from the Meeting Attendance tab'}
//             </Text>
//           </View>
//         ) : (
//           <FlatList
//             data={filteredCases}
//             renderItem={renderCaseItem}
//             keyExtractor={(item) => item.id}
//             contentContainerStyle={styles.casesList}
//           />
//         )}
//       </View>
//     );
//   };

//   const renderMemberTracking = () => {
//     const completedMeetings = meetings.filter(meeting => meeting.is_completed === true);
//     const completedMeetingDates = completedMeetings.map(m => normalizeDate(m.meeting_date));
    
//     const completedAttendanceRecords = attendanceRecords.filter(record => {
//       const recordDate = normalizeDate(record.meeting_date);
//       return completedMeetingDates.includes(recordDate);
//     });

//     return (
//       <View style={styles.section}>
//         <View style={styles.sectionHeader}>
//           <View>
//             <Text style={styles.sectionTitle}>Member Participation Tracking</Text>
//             <Text style={styles.trackingSubtitle}>
//               Based on {completedMeetings.length} completed meetings
//             </Text>
//             <Text style={styles.trackingSubtitle}>
//               Total attendance records: {completedAttendanceRecords.length}
//             </Text>
//           </View>
//         </View>

//         {completedMeetings.length === 0 ? (
//           <View style={styles.emptyState}>
//             <Text style={styles.emptyEmoji}>📊</Text>
//             <Text style={styles.emptyText}>No completed meetings yet</Text>
//             <Text style={styles.emptySubtext}>
//               Go to "Meeting Attendance" tab, select a meeting, and click "Mark as Completed"
//             </Text>
//           </View>
//         ) : (
//           <View style={styles.trackingContainer}>
//             {members.map((member) => {
//               const memberRecords = completedAttendanceRecords.filter((r) => r.member_id === member.id);
//               const totalMeetings = completedMeetings.length;
//               const attendedMeetings = memberRecords.filter((r) => r.attended).length;
//               const percentage = totalMeetings > 0 ? (attendedMeetings / totalMeetings) * 100 : 0;
//               const hasAttendanceData = memberRecords.length > 0;
              
//               const memberPenalties = cases.filter(c => c.member === member.id && c.status === 'pending');
//               const totalPenaltyBalance = memberPenalties.reduce((sum, c) => sum + (c.penalty_amount - c.penalty_paid), 0);
              
//               return (
//                 <TouchableOpacity
//                   key={member.id}
//                   style={[
//                     styles.trackingCard,
//                     !hasAttendanceData && styles.trackingCardInactive
//                   ]}
//                   onPress={async () => {
//                     if (hasAttendanceData) {
//                       await getMemberAttendanceStats(member.id);
//                       setSelectedMemberForTracking(member);
//                     }
//                   }}
//                   activeOpacity={hasAttendanceData ? 0.7 : 1}
//                   disabled={!hasAttendanceData}
//                 >
//                   <View style={styles.trackingHeader}>
//                     <View style={styles.trackingMemberInfo}>
//                       <Text style={styles.trackingMemberName}>{member.full_name}</Text>
//                       {totalPenaltyBalance > 0 && (
//                         <View style={styles.trackingPenaltyBadge}>
//                           <Text style={styles.trackingPenaltyBadgeText}>
//                             ⚖️ MK{totalPenaltyBalance.toLocaleString()}
//                           </Text>
//                         </View>
//                       )}
//                     </View>
//                     <Text style={[
//                       styles.trackingPercentage,
//                       percentage >= 80 ? styles.percentageHigh : 
//                       percentage >= 50 ? styles.percentageMedium : 
//                       styles.percentageLow
//                     ]}>
//                       {hasAttendanceData ? `${Math.round(percentage)}%` : 'N/A'}
//                     </Text>
//                   </View>
//                   <View style={styles.trackingBarContainer}>
//                     <View 
//                       style={[
//                         styles.trackingBar,
//                         { width: hasAttendanceData ? `${Math.min(percentage, 100)}%` : '0%' }
//                       ]} 
//                     />
//                   </View>
//                   <View style={styles.trackingStats}>
//                     <Text style={styles.trackingStat}>
//                       {hasAttendanceData 
//                         ? `✅ ${attendedMeetings} of ${totalMeetings} meetings attended`
//                         : 'No attendance records yet'
//                       }
//                     </Text>
//                   </View>
//                   {hasAttendanceData && attendedMeetings < totalMeetings && (
//                     <View style={styles.trackingPending}>
//                       <Text style={styles.trackingPendingText}>
//                         ⚠️ {totalMeetings - attendedMeetings} meeting{totalMeetings - attendedMeetings > 1 ? 's' : ''} not attended
//                       </Text>
//                     </View>
//                   )}
//                   {!hasAttendanceData && (
//                     <View style={styles.trackingPending}>
//                       <Text style={styles.trackingNoDataText}>
//                         📋 No attendance recorded for this member
//                       </Text>
//                     </View>
//                   )}
//                 </TouchableOpacity>
//               );
//             })}
//           </View>
//         )}
//       </View>
//     );
//   };

//   // ============ MEETING SELECTOR WITH PAGINATION ============
//   const renderMeetingSelectorModal = () => {
//     return (
//       <Modal
//         visible={showMeetingSelector}
//         transparent
//         animationType="slide"
//         onRequestClose={() => setShowMeetingSelector(false)}
//       >
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContent}>
//             <View style={styles.modalHeader}>
//               <Text style={styles.modalTitle}>Select Meeting</Text>
//               <View style={styles.modalHeaderRight}>
//                 <Text style={styles.modalTotalCount}>
//                   Total: {totalMeetings} meetings
//                 </Text>
//                 <TouchableOpacity
//                   onPress={() => setShowMeetingSelector(false)}
//                   activeOpacity={0.7}
//                 >
//                   <Text style={styles.modalClose}>✕</Text>
//                 </TouchableOpacity>
//               </View>
//             </View>

//             <View style={styles.modalBody}>
//               {paginatedMeetings.length === 0 ? (
//                 <View style={styles.emptyState}>
//                   <Text style={styles.emptyEmoji}>📅</Text>
//                   <Text style={styles.emptyText}>No meetings found</Text>
//                   <Text style={styles.emptySubtext}>Create a meeting to start tracking attendance</Text>
//                 </View>
//               ) : (
//                 <>
//                   <FlatList
//                     data={paginatedMeetings}
//                     renderItem={({ item }) => {
//                       const isCompleted = item.is_completed;
//                       return (
//                         <TouchableOpacity
//                           style={[
//                             styles.meetingSelectorItem,
//                             selectedMeeting?.id === item.id && styles.meetingSelectorItemSelected,
//                           ]}
//                           onPress={() => {
//                             setSelectedMeeting(item);
//                             setShowMeetingSelector(false);
//                           }}
//                           activeOpacity={0.7}
//                         >
//                           <View style={styles.meetingSelectorItemHeader}>
//                             <Text style={styles.meetingSelectorItemTitle}>{item.title}</Text>
//                             {isCompleted ? (
//                               <Text style={styles.meetingSelectorItemCompleted}>✅</Text>
//                             ) : (
//                               <Text style={styles.meetingSelectorItemPending}>⏳</Text>
//                             )}
//                           </View>
//                           <Text style={styles.meetingSelectorItemDate}>
//                             📅 {new Date(item.meeting_date).toLocaleDateString()}
//                             {item.start_time && ` at ${item.start_time.substring(0, 5)}`}
//                           </Text>
//                           <Text style={[
//                             styles.meetingSelectorItemStatus,
//                             isCompleted ? styles.statusCompleted : styles.statusPending
//                           ]}>
//                             {isCompleted ? '✅ Completed' : '⏳ Pending'}
//                           </Text>
//                         </TouchableOpacity>
//                       );
//                     }}
//                     keyExtractor={(item) => item.id}
//                     contentContainerStyle={styles.meetingList}
//                     showsVerticalScrollIndicator={true}
//                   />
                  
//                   {/* Pagination Controls */}
//                   {totalPages > 1 && (
//                     <View style={styles.paginationContainer}>
//                       <TouchableOpacity
//                         style={[
//                           styles.paginationButton,
//                           currentPage === 1 && styles.paginationButtonDisabled
//                         ]}
//                         onPress={() => {
//                           if (currentPage > 1) {
//                             loadMeetings(currentPage - 1);
//                           }
//                         }}
//                         disabled={currentPage === 1}
//                         activeOpacity={0.7}
//                       >
//                         <Text style={styles.paginationButtonText}>◀ Prev</Text>
//                       </TouchableOpacity>
                      
//                       <View style={styles.paginationCenter}>
//                         <Text style={styles.paginationText}>
//                           Page {currentPage} of {totalPages}
//                         </Text>
//                         <Text style={styles.paginationSubText}>
//                           Showing {paginatedMeetings.length} of {totalMeetings}
//                         </Text>
//                       </View>
                      
//                       <TouchableOpacity
//                         style={[
//                           styles.paginationButton,
//                           currentPage === totalPages && styles.paginationButtonDisabled
//                         ]}
//                         onPress={() => {
//                           if (currentPage < totalPages) {
//                             loadMeetings(currentPage + 1);
//                           }
//                         }}
//                         disabled={currentPage === totalPages}
//                         activeOpacity={0.7}
//                       >
//                         <Text style={styles.paginationButtonText}>Next ▶</Text>
//                       </TouchableOpacity>
//                     </View>
//                   )}
//                 </>
//               )}
//             </View>
//           </View>
//         </View>
//       </Modal>
//     );
//   };

//   const renderCreateMeetingModal = () => {
//     return (
//       <Modal
//         visible={showMeetingModal}
//         transparent
//         animationType="slide"
//         onRequestClose={() => {
//           setShowMeetingModal(false);
//           setMeetingTitle('');
//           setMeetingDate('');
//           setStartTime('');
//           setEndTime('');
//           setMeetingDescription('');
//         }}
//       >
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContent}>
//             <View style={styles.modalHeader}>
//               <Text style={styles.modalTitle}>Create New Meeting</Text>
//               <TouchableOpacity
//                 onPress={() => {
//                   setShowMeetingModal(false);
//                   setMeetingTitle('');
//                   setMeetingDate('');
//                   setStartTime('');
//                   setEndTime('');
//                   setMeetingDescription('');
//                 }}
//                 activeOpacity={0.7}
//               >
//                 <Text style={styles.modalClose}>✕</Text>
//               </TouchableOpacity>
//             </View>

//             <View style={styles.modalBody}>
//               <View style={styles.modalField}>
//                 <Text style={styles.modalLabel}>Meeting Title *</Text>
//                 <TextInput
//                   style={styles.modalInput}
//                   value={meetingTitle}
//                   onChangeText={setMeetingTitle}
//                   placeholder="Enter meeting title"
//                   placeholderTextColor={colors.secondary}
//                 />
//               </View>

//               <View style={styles.modalField}>
//                 <Text style={styles.modalLabel}>Meeting Date *</Text>
//                 <TextInput
//                   style={styles.modalInput}
//                   value={meetingDate}
//                   onChangeText={setMeetingDate}
//                   placeholder="YYYY-MM-DD"
//                   placeholderTextColor={colors.secondary}
//                 />
//               </View>

//               <View style={styles.modalField}>
//                 <Text style={styles.modalLabel}>Start Time *</Text>
//                 <TextInput
//                   style={styles.modalInput}
//                   value={startTime}
//                   onChangeText={setStartTime}
//                   placeholder="HH:MM"
//                   placeholderTextColor={colors.secondary}
//                 />
//               </View>

//               <View style={styles.modalField}>
//                 <Text style={styles.modalLabel}>End Time</Text>
//                 <TextInput
//                   style={styles.modalInput}
//                   value={endTime}
//                   onChangeText={setEndTime}
//                   placeholder="HH:MM (Optional)"
//                   placeholderTextColor={colors.secondary}
//                 />
//               </View>

//               <View style={styles.modalField}>
//                 <Text style={styles.modalLabel}>Description</Text>
//                 <TextInput
//                   style={[styles.modalInput, styles.modalTextArea]}
//                   value={meetingDescription}
//                   onChangeText={setMeetingDescription}
//                   placeholder="Enter meeting description (optional)"
//                   placeholderTextColor={colors.secondary}
//                   multiline
//                   numberOfLines={3}
//                   textAlignVertical="top"
//                 />
//               </View>

//               <TouchableOpacity
//                 style={[styles.submitButton, isSubmitting && styles.disabledButton]}
//                 onPress={handleCreateMeeting}
//                 disabled={isSubmitting}
//                 activeOpacity={0.7}
//               >
//                 {isSubmitting ? (
//                   <ActivityIndicator color="#fff" size="small" />
//                 ) : (
//                   <Text style={styles.submitButtonText}>Create Meeting</Text>
//                 )}
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       </Modal>
//     );
//   };

//   const renderCreateCaseModal = () => {
//     return (
//       <Modal
//         visible={showCaseModal}
//         transparent
//         animationType="slide"
//         onRequestClose={() => {
//           setShowCaseModal(false);
//           setSelectedMemberForCase(null);
//           setCaseType('absence');
//           setCaseReason('');
//           setPenaltyAmount('');
//         }}
//       >
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContent}>
//             <View style={styles.modalHeader}>
//               <Text style={styles.modalTitle}>Create Penalty Case</Text>
//               <TouchableOpacity
//                 onPress={() => {
//                   setShowCaseModal(false);
//                   setSelectedMemberForCase(null);
//                   setCaseType('absence');
//                   setCaseReason('');
//                   setPenaltyAmount('');
//                 }}
//                 activeOpacity={0.7}
//               >
//                 <Text style={styles.modalClose}>✕</Text>
//               </TouchableOpacity>
//             </View>

//             <View style={styles.modalBody}>
//               <View style={styles.modalField}>
//                 <Text style={styles.modalLabel}>Member *</Text>
//                 <TouchableOpacity
//                   style={styles.memberSelector}
//                   onPress={() => setShowMemberSelectorForCase(true)}
//                   activeOpacity={0.7}
//                 >
//                   <Text style={[styles.memberSelectorText, !selectedMemberForCase && styles.placeholderText]}>
//                     {selectedMemberForCase?.full_name || 'Select a member'}
//                   </Text>
//                   <Text style={styles.memberSelectorArrow}>▼</Text>
//                 </TouchableOpacity>
//               </View>

//               <View style={styles.modalField}>
//                 <Text style={styles.modalLabel}>Case Type *</Text>
//                 <View style={styles.typeSelector}>
//                   {CASE_TYPES.map((type) => (
//                     <TouchableOpacity
//                       key={type.value}
//                       style={[
//                         styles.typeButton,
//                         caseType === type.value && styles.selectedTypeButton,
//                       ]}
//                       onPress={() => setCaseType(type.value)}
//                       activeOpacity={0.7}
//                     >
//                       <Text style={[
//                         styles.typeButtonText,
//                         caseType === type.value && styles.selectedTypeText,
//                       ]}>
//                         {type.label}
//                       </Text>
//                     </TouchableOpacity>
//                   ))}
//                 </View>
//               </View>

//               <View style={styles.modalField}>
//                 <Text style={styles.modalLabel}>Penalty Amount (MK) *</Text>
//                 <TextInput
//                   style={styles.modalInput}
//                   value={penaltyAmount}
//                   onChangeText={setPenaltyAmount}
//                   placeholder="Enter penalty amount"
//                   keyboardType="numeric"
//                   placeholderTextColor={colors.secondary}
//                 />
//               </View>

//               <View style={styles.modalField}>
//                 <Text style={styles.modalLabel}>Reason</Text>
//                 <TextInput
//                   style={[styles.modalInput, styles.modalTextArea]}
//                   value={caseReason}
//                   onChangeText={setCaseReason}
//                   placeholder="Enter reason (optional)"
//                   placeholderTextColor={colors.secondary}
//                   multiline
//                   numberOfLines={3}
//                   textAlignVertical="top"
//                 />
//               </View>

//               <TouchableOpacity
//                 style={[styles.submitButton, isSubmitting && styles.disabledButton]}
//                 onPress={handleCreateCase}
//                 disabled={isSubmitting}
//                 activeOpacity={0.7}
//               >
//                 {isSubmitting ? (
//                   <ActivityIndicator color="#fff" size="small" />
//                 ) : (
//                   <Text style={styles.submitButtonText}>Create Case</Text>
//                 )}
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       </Modal>
//     );
//   };

//   const renderPaymentModal = () => {
//     if (!selectedCaseForPayment) return null;
    
//     const balance = selectedCaseForPayment.penalty_amount - selectedCaseForPayment.penalty_paid;

//     return (
//       <Modal
//         visible={showPaymentModal}
//         transparent
//         animationType="slide"
//         onRequestClose={() => {
//           setShowPaymentModal(false);
//           setPaymentAmount('');
//           setSelectedCaseForPayment(null);
//         }}
//       >
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContent}>
//             <View style={styles.modalHeader}>
//               <Text style={styles.modalTitle}>Record Payment</Text>
//               <TouchableOpacity
//                 onPress={() => {
//                   setShowPaymentModal(false);
//                   setPaymentAmount('');
//                   setSelectedCaseForPayment(null);
//                 }}
//                 activeOpacity={0.7}
//               >
//                 <Text style={styles.modalClose}>✕</Text>
//               </TouchableOpacity>
//             </View>

//             <View style={styles.modalBody}>
//               <View style={styles.paymentInfo}>
//                 <Text style={styles.paymentInfoLabel}>Member:</Text>
//                 <Text style={styles.paymentInfoValue}>{selectedCaseForPayment.member_name}</Text>
//               </View>
//               <View style={styles.paymentInfo}>
//                 <Text style={styles.paymentInfoLabel}>Case Type:</Text>
//                 <Text style={styles.paymentInfoValue}>
//                   {caseTypeLabels[selectedCaseForPayment.case_type]}
//                 </Text>
//               </View>
//               <View style={styles.paymentInfo}>
//                 <Text style={styles.paymentInfoLabel}>Penalty Amount:</Text>
//                 <Text style={styles.paymentInfoValue}>
//                   MK{selectedCaseForPayment.penalty_amount.toLocaleString()}
//                 </Text>
//               </View>
//               <View style={styles.paymentInfo}>
//                 <Text style={styles.paymentInfoLabel}>Amount Paid:</Text>
//                 <Text style={styles.paymentInfoValue}>
//                   MK{selectedCaseForPayment.penalty_paid.toLocaleString()}
//                 </Text>
//               </View>
//               <View style={[styles.paymentInfo, styles.paymentBalanceInfo]}>
//                 <Text style={styles.paymentInfoLabel}>Balance:</Text>
//                 <Text style={[styles.paymentInfoValue, styles.balanceAmount]}>
//                   MK{balance.toLocaleString()}
//                 </Text>
//               </View>

//               <View style={styles.modalField}>
//                 <Text style={styles.modalLabel}>Payment Amount (MK) *</Text>
//                 <TextInput
//                   style={styles.modalInput}
//                   value={paymentAmount}
//                   onChangeText={setPaymentAmount}
//                   placeholder="Enter payment amount"
//                   keyboardType="numeric"
//                   placeholderTextColor={colors.secondary}
//                 />
//                 <Text style={styles.paymentHint}>
//                   Max: MK{balance.toLocaleString()}
//                 </Text>
//               </View>

//               <View style={styles.paymentMethodInfo}>
//                 <Text style={styles.paymentMethodText}>💵 Payment Method: Cash</Text>
//               </View>

//               <TouchableOpacity
//                 style={[styles.submitButton, isSubmitting && styles.disabledButton]}
//                 onPress={handleAddPayment}
//                 disabled={isSubmitting}
//                 activeOpacity={0.7}
//               >
//                 {isSubmitting ? (
//                   <ActivityIndicator color="#fff" size="small" />
//                 ) : (
//                   <Text style={styles.submitButtonText}>Record Payment</Text>
//                 )}
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       </Modal>
//     );
//   };

//   const renderMemberSelectorForCase = () => {
//     return (
//       <Modal
//         visible={showMemberSelectorForCase}
//         transparent
//         animationType="slide"
//         onRequestClose={() => setShowMemberSelectorForCase(false)}
//       >
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContent}>
//             <View style={styles.modalHeader}>
//               <Text style={styles.modalTitle}>Select Member</Text>
//               <TouchableOpacity
//                 onPress={() => setShowMemberSelectorForCase(false)}
//                 activeOpacity={0.7}
//               >
//                 <Text style={styles.modalClose}>✕</Text>
//               </TouchableOpacity>
//             </View>
//             <FlatList
//               data={members}
//               renderItem={({ item }) => (
//                 <TouchableOpacity
//                   style={[
//                     styles.memberCard,
//                     selectedMemberForCase?.id === item.id && styles.selectedMemberCard
//                   ]}
//                   onPress={() => {
//                     setSelectedMemberForCase(item);
//                     setShowMemberSelectorForCase(false);
//                   }}
//                   activeOpacity={0.7}
//                 >
//                   <Text style={styles.memberCardName}>{item.full_name}</Text>
//                   <Text style={styles.memberCardPhone}>{item.phone_number}</Text>
//                 </TouchableOpacity>
//               )}
//               keyExtractor={(item) => item.id}
//               contentContainerStyle={styles.memberList}
//             />
//           </View>
//         </View>
//       </Modal>
//     );
//   };

//   const renderMemberDetailModal = () => {
//     if (!selectedMemberForTracking) return null;

//     const stats = memberAttendanceStats?.statistics || {};
//     const completedMeetings = meetings.filter(m => m.is_completed === true);
//     const completedMeetingDates = completedMeetings.map(m => normalizeDate(m.meeting_date));
//     const completedAttendanceRecords = attendanceRecords.filter(record => {
//       const recordDate = normalizeDate(record.meeting_date);
//       return completedMeetingDates.includes(recordDate);
//     });
    
//     const memberRecords = completedAttendanceRecords.filter((r) => r.member_id === selectedMemberForTracking.id);
//     const totalMeetings = completedMeetings.length;
//     const attendedMeetings = memberRecords.filter((r) => r.attended).length;
//     const percentage = totalMeetings > 0 ? (attendedMeetings / totalMeetings) * 100 : 0;

//     return (
//       <Modal
//         visible={!!selectedMemberForTracking}
//         transparent
//         animationType="slide"
//         onRequestClose={() => {
//           setSelectedMemberForTracking(null);
//           setMemberAttendanceStats(null);
//         }}
//       >
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContent}>
//             <View style={styles.modalHeader}>
//               <Text style={styles.modalTitle}>Member Participation</Text>
//               <TouchableOpacity
//                 onPress={() => {
//                   setSelectedMemberForTracking(null);
//                   setMemberAttendanceStats(null);
//                 }}
//                 activeOpacity={0.7}
//               >
//                 <Text style={styles.modalClose}>✕</Text>
//               </TouchableOpacity>
//             </View>

//             <View style={styles.modalBody}>
//               <Text style={styles.memberDetailName}>{selectedMemberForTracking.full_name}</Text>
//               <Text style={styles.memberDetailPhone}>{selectedMemberForTracking.phone_number}</Text>

//               <View style={styles.memberDetailStats}>
//                 <View style={styles.memberDetailStat}>
//                   <Text style={styles.memberDetailStatNumber}>
//                     {stats.attendance_rate !== undefined ? Math.round(stats.attendance_rate) : Math.round(percentage)}%
//                   </Text>
//                   <Text style={styles.memberDetailStatLabel}>Attendance Rate</Text>
//                 </View>
//                 <View style={styles.memberDetailStat}>
//                   <Text style={styles.memberDetailStatNumber}>
//                     {stats.attended || attendedMeetings}
//                   </Text>
//                   <Text style={styles.memberDetailStatLabel}>Attended</Text>
//                 </View>
//                 <View style={styles.memberDetailStat}>
//                   <Text style={styles.memberDetailStatNumber}>
//                     {totalMeetings - (stats.attended || attendedMeetings)}
//                   </Text>
//                   <Text style={styles.memberDetailStatLabel}>Absent</Text>
//                 </View>
//                 <View style={styles.memberDetailStat}>
//                   <Text style={styles.memberDetailStatNumber}>
//                     {stats.total_meetings || totalMeetings}
//                   </Text>
//                   <Text style={styles.memberDetailStatLabel}>Total Meetings</Text>
//                 </View>
//               </View>

//               <View style={styles.memberDetailBarContainer}>
//                 <View 
//                   style={[
//                     styles.memberDetailBar,
//                     { width: `${Math.min(stats.attendance_rate || percentage, 100)}%` }
//                   ]} 
//                 />
//               </View>

//               <View style={styles.memberDetailMeetings}>
//                 <Text style={styles.memberDetailMeetingsTitle}>Meeting History</Text>
//                 {memberRecords.length === 0 ? (
//                   <Text style={styles.memberDetailNoMeetings}>No meetings attended yet</Text>
//                 ) : (
//                   memberRecords.map((record) => {
//                     const meeting = meetings.find(m => m.meeting_date === record.meeting_date);
//                     return (
//                       <View key={record.id} style={styles.memberDetailMeetingItem}>
//                         <Text style={styles.memberDetailMeetingStatus}>
//                           {record.attended ? '✅' : '❌'}
//                         </Text>
//                         <View style={styles.memberDetailMeetingInfo}>
//                           <Text style={styles.memberDetailMeetingText}>
//                             {meeting?.title || 'Meeting'}
//                           </Text>
//                           <Text style={styles.memberDetailMeetingDate}>
//                             {new Date(record.meeting_date).toLocaleDateString()}
//                           </Text>
//                         </View>
//                       </View>
//                     );
//                   })
//                 )}
//               </View>
//             </View>
//           </View>
//         </View>
//       </Modal>
//     );
//   };

//   if (loading) {
//     return (
//       <SafeAreaView style={styles.centered}>
//         <ActivityIndicator size="large" color={colors.primary} />
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       <View style={styles.header}>
//         <View style={styles.headerRow}>
//           <TouchableOpacity
//             style={styles.backButton}
//             onPress={() => navigation.navigate('Home' as never)}
//             activeOpacity={0.7}
//           >
//             <Text style={styles.backButtonText}>←</Text>
//           </TouchableOpacity>
//           <View style={styles.headerCenter}>
//             <Text style={styles.title}>Attendance</Text>
//             <Text style={styles.subtitle}>Track meeting attendance and manage penalties</Text>
//           </View>
//           <View style={styles.headerSpacer} />
//         </View>
//       </View>

//       <View style={styles.tabContainer}>
//         <TouchableOpacity
//           style={[styles.tab, activeView === 'meeting' && styles.activeTab]}
//           onPress={() => setActiveView('meeting')}
//           activeOpacity={0.7}
//         >
//           <Text style={[styles.tabText, activeView === 'meeting' && styles.activeTabText]}>
//             Meeting Attendance
//           </Text>
//         </TouchableOpacity>
//         <TouchableOpacity
//           style={[styles.tab, activeView === 'tracking' && styles.activeTab]}
//           onPress={() => setActiveView('tracking')}
//           activeOpacity={0.7}
//         >
//           <Text style={[styles.tabText, activeView === 'tracking' && styles.activeTabText]}>
//             Member Tracking
//           </Text>
//         </TouchableOpacity>
//         <TouchableOpacity
//           style={[styles.tab, activeView === 'penalties' && styles.activeTab]}
//           onPress={() => setActiveView('penalties')}
//           activeOpacity={0.7}
//         >
//           <Text style={[styles.tabText, activeView === 'penalties' && styles.activeTabText]}>
//             ⚖️ Penalties
//           </Text>
//         </TouchableOpacity>
//       </View>

//       <ScrollView
//         contentContainerStyle={styles.scrollContent}
//         refreshControl={
//           <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
//         }
//       >
//         {activeView === 'meeting' && renderMeetingAttendance()}
//         {activeView === 'tracking' && renderMemberTracking()}
//         {activeView === 'penalties' && renderPenaltiesView()}
//       </ScrollView>

//       {renderMeetingSelectorModal()}
//       {renderCreateMeetingModal()}
//       {renderCreateCaseModal()}
//       {renderMemberSelectorForCase()}
//       {renderPaymentModal()}
//       {renderMemberDetailModal()}
//     </SafeAreaView>
//   );
// }

// // ==================== STYLES ====================
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: colors.background,
//   },
//   centered: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: colors.background,
//   },
//   header: {
//     padding: 20,
//     paddingBottom: 12,
//   },
//   headerRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//   },
//   headerCenter: {
//     flex: 1,
//     alignItems: 'center',
//   },
//   headerSpacer: {
//     width: 40,
//   },
//   backButton: {
//     paddingVertical: 8,
//     paddingHorizontal: 12,
//     minWidth: 40,
//     alignItems: 'center',
//   },
//   backButtonText: {
//     color: colors.primary,
//     fontSize: 24,
//     fontWeight: '600',
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: colors.text,
//   },
//   subtitle: {
//     fontSize: 14,
//     color: colors.secondary,
//     marginTop: 4,
//   },
//   tabContainer: {
//     flexDirection: 'row',
//     paddingHorizontal: 20,
//     marginBottom: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: colors.border,
//   },
//   tab: {
//     paddingVertical: 12,
//     paddingHorizontal: 16,
//     marginRight: 8,
//   },
//   activeTab: {
//     borderBottomWidth: 2,
//     borderBottomColor: colors.primary,
//   },
//   tabText: {
//     fontSize: 14,
//     color: colors.secondary,
//   },
//   activeTabText: {
//     color: colors.primary,
//     fontWeight: '600',
//   },
//   scrollContent: {
//     padding: 20,
//     paddingBottom: 40,
//   },
//   section: {
//     gap: 16,
//   },
//   sectionHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     flexWrap: 'wrap',
//   },
//   sectionActions: {
//     flexDirection: 'row',
//     gap: 8,
//   },
//   sectionTitle: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: colors.text,
//   },
//   trackingSubtitle: {
//     fontSize: 12,
//     color: colors.secondary,
//     marginTop: 2,
//   },
//   createButton: {
//     backgroundColor: colors.primary,
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     borderRadius: 8,
//   },
//   createButtonText: {
//     color: '#fff',
//     fontSize: 12,
//     fontWeight: '600',
//   },
//   penaltiesHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   penaltySummaryContainer: {
//     flexDirection: 'row',
//     gap: 8,
//   },
//   penaltySummaryCard: {
//     flex: 1,
//     padding: 10,
//     borderRadius: 8,
//     alignItems: 'center',
//     borderWidth: 1,
//   },
//   pendingSummary: {
//     backgroundColor: '#fef3c7',
//     borderColor: '#fcd34d',
//   },
//   resolvedSummary: {
//     backgroundColor: '#d1fae5',
//     borderColor: '#6ee7b7',
//   },
//   waivedSummary: {
//     backgroundColor: '#f3f4f6',
//     borderColor: '#d1d5db',
//   },
//   totalSummary: {
//     backgroundColor: '#dbeafe',
//     borderColor: '#93c5fd',
//   },
//   penaltySummaryNumber: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: colors.text,
//   },
//   penaltySummaryLabel: {
//     fontSize: 10,
//     color: colors.secondary,
//     textTransform: 'uppercase',
//     fontWeight: '600',
//   },
//   penaltySearchContainer: {
//     gap: 8,
//   },
//   searchBar: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: colors.surface,
//     borderRadius: 8,
//     paddingHorizontal: 12,
//     borderWidth: 1,
//     borderColor: colors.border,
//   },
//   searchIcon: {
//     fontSize: 16,
//     marginRight: 8,
//   },
//   searchInput: {
//     flex: 1,
//     paddingVertical: 10,
//     fontSize: 16,
//     color: colors.text,
//   },
//   clearSearch: {
//     padding: 4,
//     fontSize: 16,
//     color: colors.secondary,
//   },
//   filterContainer: {
//     flexDirection: 'row',
//     gap: 6,
//   },
//   filterButton: {
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 6,
//     borderWidth: 1,
//     borderColor: colors.border,
//     backgroundColor: colors.background,
//   },
//   filterButtonActive: {
//     backgroundColor: colors.primary,
//     borderColor: colors.primary,
//   },
//   filterButtonText: {
//     fontSize: 12,
//     color: colors.secondary,
//     fontWeight: '500',
//   },
//   filterButtonTextActive: {
//     color: '#fff',
//   },
//   meetingSelector: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     backgroundColor: colors.surface,
//     padding: 12,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: colors.border,
//   },
//   meetingSelectorContent: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     flex: 1,
//   },
//   meetingSelectorRight: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   meetingSelectorText: {
//     fontSize: 16,
//     color: colors.text,
//     flex: 1,
//   },
//   meetingSelectorCount: {
//     fontSize: 12,
//     color: colors.secondary,
//   },
//   meetingSelectorArrow: {
//     fontSize: 16,
//     color: colors.secondary,
//   },
//   completedBadgeSmall: {
//     backgroundColor: '#d1fae5',
//     paddingHorizontal: 6,
//     paddingVertical: 2,
//     borderRadius: 4,
//     marginLeft: 8,
//   },
//   completedBadgeSmallText: {
//     fontSize: 10,
//     fontWeight: '600',
//     color: '#059669',
//   },
//   meetingInfo: {
//     backgroundColor: colors.surface,
//     padding: 12,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: colors.border,
//   },
//   meetingInfoHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   meetingInfoTitle: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: colors.text,
//     flex: 1,
//   },
//   completedBadge: {
//     backgroundColor: '#d1fae5',
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 12,
//   },
//   completedBadgeText: {
//     fontSize: 10,
//     fontWeight: '600',
//     color: '#059669',
//   },
//   pendingBadge: {
//     backgroundColor: '#fef3c7',
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 12,
//   },
//   pendingBadgeText: {
//     fontSize: 10,
//     fontWeight: '600',
//     color: '#d97706',
//   },
//   meetingInfoDate: {
//     fontSize: 14,
//     color: colors.secondary,
//     marginTop: 4,
//   },
//   meetingInfoDescription: {
//     fontSize: 14,
//     color: colors.secondary,
//     marginTop: 4,
//   },
//   meetingActionButtons: {
//     marginTop: 8,
//   },
//   completeMeetingButton: {
//     backgroundColor: '#059669',
//     padding: 10,
//     borderRadius: 8,
//     alignItems: 'center',
//   },
//   uncompleteButton: {
//     backgroundColor: '#dc2626',
//   },
//   completeMeetingButtonText: {
//     color: '#fff',
//     fontWeight: '600',
//     fontSize: 14,
//   },
//   attendanceList: {
//     gap: 8,
//   },
//   attendanceItem: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     backgroundColor: colors.surface,
//     padding: 12,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: colors.border,
//   },
//   attendanceMemberInfo: {
//     flex: 1,
//   },
//   attendanceMemberName: {
//     fontSize: 14,
//     fontWeight: '500',
//     color: colors.text,
//   },
//   attendanceMemberPhone: {
//     fontSize: 12,
//     color: colors.secondary,
//   },
//   attendanceStatusText: {
//     fontSize: 10,
//     color: colors.secondary,
//     marginTop: 2,
//   },
//   penaltyBadge: {
//     backgroundColor: '#fef3c7',
//     paddingHorizontal: 6,
//     paddingVertical: 2,
//     borderRadius: 4,
//     marginTop: 2,
//     alignSelf: 'flex-start',
//   },
//   penaltyBadgeText: {
//     fontSize: 10,
//     color: '#d97706',
//     fontWeight: '600',
//   },
//   attendanceActions: {
//     flexDirection: 'row',
//     gap: 4,
//   },
//   attendanceButton: {
//     paddingHorizontal: 10,
//     paddingVertical: 6,
//     borderRadius: 6,
//     borderWidth: 1,
//   },
//   presentButton: {
//     borderColor: '#059669',
//     backgroundColor: '#f0fdf4',
//   },
//   absentButton: {
//     borderColor: '#dc2626',
//     backgroundColor: '#fef2f2',
//   },
//   attendanceButtonActive: {
//     backgroundColor: '#059669',
//     borderColor: '#059669',
//   },
//   attendanceButtonDisabled: {
//     opacity: 0.4,
//   },
//   attendanceButtonText: {
//     fontSize: 11,
//     fontWeight: '500',
//     color: colors.text,
//   },
//   attendanceButtonTextActive: {
//     color: '#fff',
//   },
//   attendanceButtonTextDisabled: {
//     color: colors.secondary,
//   },
//   attendanceSummary: {
//     backgroundColor: colors.surface,
//     padding: 16,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: colors.border,
//   },
//   attendanceSummaryTitle: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: colors.text,
//     marginBottom: 12,
//   },
//   attendanceSummaryStats: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//   },
//   attendanceSummaryStat: {
//     alignItems: 'center',
//   },
//   attendanceSummaryStatNumber: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: colors.text,
//   },
//   attendanceSummaryStatLabel: {
//     fontSize: 12,
//     color: colors.secondary,
//   },
//   attendanceCompletedNotice: {
//     fontSize: 12,
//     color: '#059669',
//     textAlign: 'center',
//     marginTop: 8,
//     fontWeight: '500',
//   },
//   trackingContainer: {
//     gap: 12,
//   },
//   trackingCard: {
//     backgroundColor: colors.surface,
//     padding: 16,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: colors.border,
//   },
//   trackingCardInactive: {
//     opacity: 0.6,
//   },
//   trackingHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 8,
//   },
//   trackingMemberInfo: {
//     flex: 1,
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   trackingMemberName: {
//     fontSize: 16,
//     fontWeight: '500',
//     color: colors.text,
//   },
//   trackingPercentage: {
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
//   percentageHigh: {
//     color: '#059669',
//   },
//   percentageMedium: {
//     color: '#f59e0b',
//   },
//   percentageLow: {
//     color: '#dc2626',
//   },
//   trackingBarContainer: {
//     height: 8,
//     backgroundColor: '#e5e7eb',
//     borderRadius: 4,
//     overflow: 'hidden',
//     marginBottom: 8,
//   },
//   trackingBar: {
//     height: '100%',
//     backgroundColor: colors.primary,
//     borderRadius: 4,
//   },
//   trackingStats: {
//     flexDirection: 'row',
//   },
//   trackingStat: {
//     fontSize: 12,
//     color: colors.secondary,
//   },
//   trackingPending: {
//     marginTop: 4,
//     paddingTop: 4,
//     borderTopWidth: 1,
//     borderTopColor: colors.border,
//   },
//   trackingPendingText: {
//     fontSize: 11,
//     color: '#f59e0b',
//     fontWeight: '500',
//   },
//   trackingNoDataText: {
//     fontSize: 11,
//     color: colors.secondary,
//     fontStyle: 'italic',
//   },
//   trackingPenaltyBadge: {
//     backgroundColor: '#fef3c7',
//     paddingHorizontal: 6,
//     paddingVertical: 2,
//     borderRadius: 4,
//   },
//   trackingPenaltyBadgeText: {
//     fontSize: 10,
//     color: '#d97706',
//     fontWeight: '600',
//   },
//   meetingList: {
//     paddingBottom: 8,
//   },
//   paginationContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingTop: 12,
//     paddingBottom: 4,
//     borderTopWidth: 1,
//     borderTopColor: colors.border,
//     marginTop: 4,
//   },
//   paginationButton: {
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     backgroundColor: colors.primary,
//     borderRadius: 6,
//     minWidth: 80,
//     alignItems: 'center',
//   },
//   paginationButtonDisabled: {
//     backgroundColor: colors.border,
//     opacity: 0.5,
//   },
//   paginationButtonText: {
//     color: '#fff',
//     fontSize: 12,
//     fontWeight: '600',
//   },
//   paginationText: {
//     fontSize: 14,
//     color: colors.text,
//     fontWeight: '500',
//   },
//   paginationCenter: {
//     alignItems: 'center',
//   },
//   paginationSubText: {
//     fontSize: 10,
//     color: colors.secondary,
//     marginTop: 2,
//   },
//   modalHeaderRight: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 12,
//   },
//   modalTotalCount: {
//     fontSize: 12,
//     color: colors.secondary,
//   },
//   caseCard: {
//     backgroundColor: colors.surface,
//     borderRadius: 12,
//     padding: 14,
//     marginBottom: 10,
//     borderWidth: 1,
//     borderColor: colors.border,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.05,
//     shadowRadius: 2,
//     elevation: 1,
//   },
//   caseHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 10,
//     paddingBottom: 8,
//     borderBottomWidth: 1,
//     borderBottomColor: colors.border,
//   },
//   caseMemberName: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: colors.text,
//   },
//   caseStatusBadge: {
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 12,
//   },
//   caseStatusText: {
//     fontSize: 10,
//     fontWeight: '600',
//     color: '#fff',
//   },
//   caseDetails: {
//     gap: 4,
//   },
//   caseDetailRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   caseDetailLabel: {
//     fontSize: 12,
//     color: colors.secondary,
//     width: 60,
//   },
//   caseDetailValue: {
//     fontSize: 12,
//     color: colors.text,
//     flex: 1,
//   },
//   casePenaltyAmount: {
//     fontWeight: '600',
//     color: '#dc2626',
//   },
//   casePaidAmount: {
//     fontWeight: '600',
//     color: '#059669',
//   },
//   caseBalanceAmount: {
//     fontWeight: '600',
//     color: '#f59e0b',
//   },
//   caseTypeBadge: {
//     paddingHorizontal: 8,
//     paddingVertical: 2,
//     borderRadius: 12,
//   },
//   caseTypeText: {
//     fontSize: 10,
//     fontWeight: '600',
//   },
//   caseActions: {
//     flexDirection: 'row',
//     gap: 6,
//     marginTop: 12,
//     paddingTop: 12,
//     borderTopWidth: 1,
//     borderTopColor: colors.border,
//   },
//   caseActionButton: {
//     paddingHorizontal: 10,
//     paddingVertical: 6,
//     borderRadius: 6,
//     flex: 1,
//     alignItems: 'center',
//     borderColor: '#8b5cf6',
//     backgroundColor: '#f5f3ff',
//   },
//   paymentButton: {
//     backgroundColor: '#dbeafe',
//   },
//   resolveButton: {
//     backgroundColor: '#d1fae5',
//   },
//   waiveButton: {
//     backgroundColor: '#fef3c7',
//   },
//   caseActionButtonText: {
//     fontSize: 11,
//     fontWeight: '600',
//     color: colors.text,
//   },
//   caseResolvedBadge: {
//     backgroundColor: '#d1fae5',
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 6,
//     flex: 1,
//     alignItems: 'center',
//   },
//   caseResolvedText: {
//     fontSize: 12,
//     fontWeight: '600',
//     color: '#059669',
//   },
//   caseWaivedBadge: {
//     backgroundColor: '#fef3c7',
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 6,
//     flex: 1,
//     alignItems: 'center',
//   },
//   caseWaivedText: {
//     fontSize: 12,
//     fontWeight: '600',
//     color: '#d97706',
//   },
//   casesList: {
//     gap: 4,
//   },
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 20,
//   },
//   modalContent: {
//     backgroundColor: colors.surface,
//     borderRadius: 16,
//     padding: 20,
//     width: '100%',
//     maxWidth: 400,
//     maxHeight: '90%',
//   },
//   modalHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 16,
//     paddingBottom: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: colors.border,
//   },
//   modalTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: colors.text,
//   },
//   modalClose: {
//     fontSize: 20,
//     color: colors.secondary,
//     padding: 4,
//   },
//   modalBody: {
//     gap: 12,
//   },
//   modalField: {
//     gap: 4,
//   },
//   modalLabel: {
//     fontSize: 14,
//     fontWeight: '500',
//     color: colors.text,
//   },
//   modalInput: {
//     borderWidth: 1,
//     borderColor: colors.border,
//     borderRadius: 8,
//     padding: 12,
//     fontSize: 16,
//     color: colors.text,
//     backgroundColor: colors.background,
//   },
//   modalTextArea: {
//     minHeight: 80,
//     textAlignVertical: 'top',
//   },
//   memberSelector: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: colors.border,
//     borderRadius: 8,
//     padding: 12,
//     backgroundColor: colors.background,
//   },
//   memberSelectorText: {
//     fontSize: 16,
//     color: colors.text,
//   },
//   placeholderText: {
//     color: colors.secondary,
//   },
//   memberSelectorArrow: {
//     fontSize: 16,
//     color: colors.secondary,
//   },
//   typeSelector: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 6,
//   },
//   typeButton: {
//     flex: 1,
//     minWidth: '45%',
//     padding: 10,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: colors.border,
//     alignItems: 'center',
//     backgroundColor: colors.background,
//   },
//   selectedTypeButton: {
//     backgroundColor: colors.primary,
//     borderColor: colors.primary,
//   },
//   typeButtonText: {
//     fontSize: 12,
//     color: colors.text,
//     fontWeight: '500',
//   },
//   selectedTypeText: {
//     color: '#fff',
//   },
//   submitButton: {
//     backgroundColor: colors.primary,
//     padding: 14,
//     borderRadius: 8,
//     alignItems: 'center',
//     marginTop: 4,
//   },
//   disabledButton: {
//     opacity: 0.6,
//   },
//   submitButtonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   paymentInfo: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingVertical: 6,
//     borderBottomWidth: 1,
//     borderBottomColor: colors.border,
//   },
//   paymentBalanceInfo: {
//     borderBottomWidth: 0,
//     marginBottom: 4,
//   },
//   paymentInfoLabel: {
//     fontSize: 14,
//     color: colors.secondary,
//   },
//   paymentInfoValue: {
//     fontSize: 14,
//     fontWeight: '500',
//     color: colors.text,
//   },
//   balanceAmount: {
//     color: '#f59e0b',
//     fontWeight: '700',
//   },
//   paymentHint: {
//     fontSize: 12,
//     color: colors.secondary,
//     marginTop: 2,
//   },
//   paymentMethodInfo: {
//     backgroundColor: '#f0fdf4',
//     padding: 10,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: '#bbf7d0',
//   },
//   paymentMethodText: {
//     fontSize: 14,
//     color: '#065f46',
//     fontWeight: '500',
//   },
//   memberList: {
//     gap: 8,
//   },
//   memberCard: {
//     padding: 12,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: colors.border,
//     backgroundColor: colors.background,
//   },
//   selectedMemberCard: {
//     borderColor: colors.primary,
//     backgroundColor: colors.primary + '15',
//   },
//   memberCardName: {
//     fontSize: 16,
//     fontWeight: '500',
//     color: colors.text,
//   },
//   memberCardPhone: {
//     fontSize: 12,
//     color: colors.secondary,
//     marginTop: 2,
//   },
//   emptyState: {
//     alignItems: 'center',
//     paddingVertical: 40,
//   },
//   emptyEmoji: {
//     fontSize: 48,
//     marginBottom: 12,
//   },
//   emptyText: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: colors.text,
//   },
//   emptySubtext: {
//     fontSize: 14,
//     color: colors.secondary,
//     marginTop: 4,
//   },
//   meetingSelectorItem: {
//     padding: 12,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: colors.border,
//     marginBottom: 8,
//     backgroundColor: colors.background,
//   },
//   meetingSelectorItemSelected: {
//     borderColor: colors.primary,
//     backgroundColor: colors.primary + '15',
//   },
//   meetingSelectorItemHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   meetingSelectorItemTitle: {
//     fontSize: 16,
//     fontWeight: '500',
//     color: colors.text,
//     flex: 1,
//   },
//   meetingSelectorItemCompleted: {
//     fontSize: 14,
//     marginLeft: 8,
//   },
//   meetingSelectorItemPending: {
//     fontSize: 14,
//     marginLeft: 8,
//   },
//   meetingSelectorItemDate: {
//     fontSize: 14,
//     color: colors.secondary,
//     marginTop: 4,
//   },
//   meetingSelectorItemStatus: {
//     fontSize: 12,
//     marginTop: 4,
//   },
//   statusCompleted: {
//     color: '#059669',
//   },
//   statusPending: {
//     color: '#d97706',
//   },
//   memberDetailName: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: colors.text,
//     textAlign: 'center',
//   },
//   memberDetailPhone: {
//     fontSize: 14,
//     color: colors.secondary,
//     textAlign: 'center',
//     marginTop: 4,
//   },
//   memberDetailStats: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     marginTop: 16,
//   },
//   memberDetailStat: {
//     alignItems: 'center',
//   },
//   memberDetailStatNumber: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: colors.text,
//   },
//   memberDetailStatLabel: {
//     fontSize: 12,
//     color: colors.secondary,
//   },
//   memberDetailBarContainer: {
//     height: 8,
//     backgroundColor: '#e5e7eb',
//     borderRadius: 4,
//     overflow: 'hidden',
//     marginTop: 16,
//   },
//   memberDetailBar: {
//     height: '100%',
//     backgroundColor: colors.primary,
//     borderRadius: 4,
//   },
//   memberDetailMeetings: {
//     marginTop: 16,
//   },
//   memberDetailMeetingsTitle: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: colors.text,
//     marginBottom: 8,
//   },
//   memberDetailNoMeetings: {
//     fontSize: 14,
//     color: colors.secondary,
//     textAlign: 'center',
//     padding: 20,
//   },
//   memberDetailMeetingItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: 8,
//     borderBottomWidth: 1,
//     borderBottomColor: colors.border,
//   },
//   memberDetailMeetingStatus: {
//     fontSize: 16,
//     marginRight: 12,
//   },
//   memberDetailMeetingInfo: {
//     flex: 1,
//   },
//   memberDetailMeetingText: {
//     fontSize: 14,
//     color: colors.text,
//   },
//   memberDetailMeetingDate: {
//     fontSize: 12,
//     color: colors.secondary,
//   },
// });