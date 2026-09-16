import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { groupAPI, loanAPI } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import { colors } from '../theme/colors';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface Group {
  id: string;
  group_name: string;
  group_code: string;
  is_active: boolean;
  member_count?: number;
}

interface Loan {
  id: string;
  amount: number;
  total_payable: number;
  balance: number;
  due_date: string;
  status: string;
  loan_type: string;
  purpose: string;
  member_name: string;
}

interface GroupStats {
  members: number;
  savings: number;
  loans: number;
  activeLoans: number;
}

export default function HomeScreen({ navigation }: any) {
  const { logout, user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [address, setAddress] = useState('');
  const [groupStats, setGroupStats] = useState<GroupStats>({
    members: 0,
    savings: 0,
    loans: 0,
    activeLoans: 0,
  });
  const [ecoretLoan, setEcoretLoan] = useState<Loan | null>(null);
  const [totalPaid, setTotalPaid] = useState(0);
  const [daysRemaining, setDaysRemaining] = useState(0);

  const loadGroup = useCallback(async () => {
    try {
      setError('');
      console.log('Loading group...');
      const response = await groupAPI.getGroups();
      
      let results: any[] = [];
      if (Array.isArray(response.data)) {
        results = response.data;
      } else if (response.data?.results) {
        results = response.data.results;
      }

      if (results && results.length > 0) {
        const groupData = results[0];
        console.log('Group found:', groupData.group_name);
        setGroup(groupData);

        const memberCount = groupData.member_count || 0;
        setGroupStats((prev) => ({ ...prev, members: memberCount }));

        await Promise.all([
          loadLedgerSummary(groupData.id),
          loadApprovedLoansCount(groupData.id),
          loadEcoretLoan(groupData.id),
        ]);

        return groupData;
      } else {
        console.log('No groups found');
        setGroup(null);
        return null;
      }
    } catch (err: any) {
      console.error('Error loading group:', err);
      setError('Could not load group info.');
      return null;
    }
  }, []);

  const loadLedgerSummary = async (groupId: string) => {
    try {
      const response = await groupAPI.getLedgerSummary(groupId);
      const totalSavings = parseFloat(response.data?.total_savings) || 0;
      setGroupStats((prev) => ({ ...prev, savings: totalSavings }));
    } catch (err) {
      console.error('Error loading ledger summary:', err);
      setGroupStats((prev) => ({ ...prev, savings: 0 }));
    }
  };

  const loadApprovedLoansCount = async (groupId: string) => {
    try {
      const allLoans = await loanAPI.getAllLoans();

      const approvedGroupLoans = allLoans.filter((loan: any) => {
        const loanGroup = loan.group || loan.group_id || loan.groupId || '';
        const matchesGroup = loanGroup === groupId || loanGroup === groupId.toString();
        return matchesGroup && loan.status === 'approved';
      });

      setGroupStats((prev) => ({ ...prev, loans: approvedGroupLoans.length }));
    } catch (err) {
      console.error('Error loading approved loans count:', err);
      setGroupStats((prev) => ({ ...prev, loans: 0 }));
    }
  };

  const loadEcoretLoan = async (groupId: string) => {
    try {
      console.log('Loading ECORET loan for group:', groupId);

      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        console.log('No token found');
        return;
      }

      const allLoans = await loanAPI.getAllLoans();
      console.log('Total loans fetched:', allLoans.length);

      const groupLoans = allLoans.filter((loan: any) => {
        const loanGroup = loan.group || loan.group_id || loan.groupId || '';
        return loanGroup === groupId || loanGroup === groupId.toString();
      });

      const mappedLoans: Loan[] = groupLoans.map((loan: any) => ({
        id: loan.id,
        member_name: loan.member_name || loan.member?.full_name || 'Unknown Member',
        amount: parseFloat(loan.amount) || 0,
        balance: parseFloat(loan.balance) || parseFloat(loan.amount) || 0,
        total_payable: parseFloat(loan.total_payable) || 0,
        total_paid: parseFloat(loan.total_paid) || 0,
        due_date: loan.due_date || '',
        status: loan.status || 'pending',
        loan_type: loan.loan_type || 'group_loan',
        purpose: loan.purpose || '',
      }));

      const ecoretLoanData = mappedLoans.find(
        (l) =>
          l.loan_type === 'ecoret_loan' &&
          (l.status === 'active' || l.status === 'approved' || l.status === 'disbursed'),
      );

      if (ecoretLoanData) {
        console.log('ECORET loan found:', ecoretLoanData.id);
        setEcoretLoan(ecoretLoanData);

        try {
          const repayResponse = await loanAPI.getLoanRepayments(ecoretLoanData.id);
          let repaymentData: any[] = [];
          if (Array.isArray(repayResponse.data)) {
            repaymentData = repayResponse.data;
          } else if (repayResponse.data?.results) {
            repaymentData = repayResponse.data.results;
          }

          const total = repaymentData.reduce((sum: number, r: any) => sum + (parseFloat(r.amount) || 0), 0);
          setTotalPaid(total);
        } catch (e) {
          console.log('Could not load repayments:', e);
        }

        if (ecoretLoanData.due_date) {
          const dueDate = new Date(ecoretLoanData.due_date);
          const today = new Date();
          const diffTime = dueDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setDaysRemaining(diffDays > 0 ? diffDays : 0);
        }
      } else {
        console.log('No ECORET loan found');
        setEcoretLoan(null);
        setTotalPaid(0);
      }
    } catch (err) {
      console.error('Error loading ECORET loan:', err);
      setEcoretLoan(null);
    }
  };

  const loadAllData = useCallback(async () => {
    setLoading(true);
    await loadGroup();
    setLoading(false);
  }, [loadGroup]);

  useEffect(() => {
    loadAllData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    setCreating(true);
    try {
      const groupData = {
        group_name: newGroupName.trim(),
        address: address.trim() || '',
        default_interest_rate: 10,
        social_max_contribution: 5000,
        savings_max_contribution: 10000,
        savings_min_contribution: 500,
        meeting_frequency: 'weekly',
        meeting_day: 'saturday',
        cycle_duration_months: 12,
      };

      const response = await groupAPI.createGroup(groupData);
      console.log('Group created:', response.data);

      setShowCreateModal(false);
      setNewGroupName('');
      setAddress('');
      setCreating(false);

      Alert.alert(
        'Success!',
        `Group "${newGroupName.trim()}" created successfully!`,
        [
          {
            text: 'OK',
            onPress: async () => {
              await loadAllData();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Failed to create group:', error);
      setCreating(false);
      Alert.alert(
        'Error',
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          'Failed to create group. Please try again.'
      );
    }
  };

  const formatCurrency = (amount: number): string => {
    if (!amount) return 'MKW 0';
    return `MKW ${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const navigateToMembers = () => {
    if (!group) {
      Alert.alert('No Group', 'Please create a group first');
      return;
    }
    navigation.navigate('MembersManagement', {
      groupId: group.id,
      groupName: group.group_name,
    });
  };

  const handleFeaturePress = (screen: string, params?: any) => {
    if (!group && screen !== 'Notifications' && screen !== 'MembersManagement') {
      Alert.alert('No Group', 'Please create a group first');
      return;
    }

    if (screen === 'Members') {
      navigateToMembers();
      return;
    }

    navigation.navigate(screen, params);
  };

  // ============ FIXED LOGOUT ============
  const handleLogout = () => {
    console.log('🔴 Logout button pressed');

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to log out?')) {
        performLogout();
      }
      return;
    }

    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: performLogout },
      ]
    );
  };

  const performLogout = async () => {
    try {
      console.log('🔄 Starting logout...');
      
      // 1. Call the logout from AuthContext (clears state)
      await logout();
      console.log('✅ AuthContext logout done');
      
      // 2. Clear AsyncStorage directly (double safety)
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('refresh_token');
      await AsyncStorage.removeItem('user');
      console.log('✅ AsyncStorage cleared');
      
      // 3. Navigate to Login - using replace to remove Home from stack
      console.log('🚀 Navigating to Login...');
      navigation.replace('Login');
      // or use: navigation.navigate('Login');
      
      console.log('✅ Logout complete');
    } catch (error) {
      console.error('❌ Logout error:', error);
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };

  const features = [
    { id: 'members', label: 'Members', icon: '👥', description: 'Register & manage', screen: 'MembersManagement' },
    { id: 'reports', label: 'Reports', icon: '📊', description: 'Statements & charts', screen: 'Reports' },
    { id: 'balance', label: 'Current Balance', icon: '💰', description: 'Balance & savings', screen: 'Savings' },
    { id: 'generator', label: 'Report Generator', icon: '📊', description: 'Generate cycle reports', screen: 'ReportGeneration'},
    { id: 'loan_apply', label: 'Loan Application', icon: '📝', description: 'Apply & OTP auth', screen: 'LoanRequest' },
    { id: 'repayments', label: 'Repayments', icon: '💸', description: 'Balance & schedule', screen: 'LoanRepayments' },
    { id: 'attendance', label: 'Attendance', icon: '📋', description: 'Meeting & tracking', screen: 'Attendance' },
    { id: 'ledger', label: 'Ledger', icon: '📒', description: 'Group audit trail', screen: 'GroupLedger' },
    { id: 'notifications', label: 'Notifications', icon: '🔔', description: 'Alerts & updates', screen: 'Notifications' },
    { id: 'profile', label: 'Group Settings', icon: '⚙️', description: 'Manage group settings', screen: 'Profile' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#ffffff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffffff"
            colors={['#ffffff']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>ECORET</Text>
            <Text style={styles.userRole}>
              {user?.role === 'admin' ? 'Admin' : 'Chairman'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={onRefresh} activeOpacity={0.7} style={styles.iconButton}>
              <Icon name="refresh" size={22} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} activeOpacity={0.7} style={styles.iconButton}>
              <Icon name="log-out-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Group Overview */}
        {group ? (
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.overviewCard}
            onPress={() => {}}
          >
            <View style={styles.overviewHeader}>
              <Text style={styles.overviewTitle}>GROUP OVERVIEW</Text>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Live</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <TouchableOpacity style={styles.statItem} onPress={navigateToMembers} activeOpacity={0.7}>
                <Text style={styles.statNumber}>{groupStats.members}</Text>
                <Text style={styles.statLabel}>Members</Text>
              </TouchableOpacity>
              <View style={styles.statDivider} />
              <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('GroupLedger')} activeOpacity={0.7}>
                <Text style={styles.statNumber}>{formatCurrency(groupStats.savings)}</Text>
                <Text style={styles.statLabel}>Total Savings</Text>
              </TouchableOpacity>
              <View style={styles.statDivider} />
              <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('LoanRepayments')} activeOpacity={0.7}>
                <Text style={styles.statNumber}>{groupStats.loans}</Text>
                <Text style={styles.statLabel}>Loans Out</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeEmoji}>👋</Text>
            <Text style={styles.welcomeTitle}>Welcome to ECORET!</Text>
            <Text style={styles.welcomeText}>
              Create your group to start managing members, savings, and loans
            </Text>
            <TouchableOpacity style={styles.createGroupButton} onPress={() => setShowCreateModal(true)} activeOpacity={0.7}>
              <Text style={styles.createGroupButtonText}>Create Group</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ECOMA Payments Section */}
        <View style={styles.paymentsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>ECOMA Payments</Text>
            <Text style={styles.sectionBadge}>Recent</Text>
          </View>

          {ecoretLoan && (ecoretLoan.status === 'active' || ecoretLoan.status === 'approved' || ecoretLoan.status === 'disbursed') ? (
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.paymentCard, styles.paymentCardWithShadow]}
              onPress={() => navigation.navigate('LoanRepayments')}
            >
              <View style={styles.paymentCardHeader}>
                <View style={styles.paymentCardIcon}>
                  <Text style={styles.paymentCardIconText}>🏛️</Text>
                </View>
                <View style={[styles.paymentCardBadge, { backgroundColor: ecoretLoan.status === 'approved' ? '#fef3c7' : '#dcfce7' }]}>
                  <Text style={[styles.paymentCardBadgeText, { color: ecoretLoan.status === 'approved' ? '#d97706' : '#16a34a' }]}>
                    {ecoretLoan.status === 'approved' ? 'Approved' :
                     ecoretLoan.status === 'disbursed' ? 'Disbursed' : 'Active'}
                  </Text>
                </View>
              </View>
              <View style={styles.paymentCardContent}>
                <Text style={styles.paymentCardAmount}>{formatCurrency(ecoretLoan.amount)}</Text>
                <Text style={styles.paymentCardDesc}>Due: {formatDate(ecoretLoan.due_date)}</Text>
                <Text style={styles.paymentCardDesc}>Total Payable: {formatCurrency(ecoretLoan.total_payable)}</Text>
                <Text style={styles.paymentCardSubDesc}>Requested by: {ecoretLoan.member_name || 'Unknown'}</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.paymentCardEmpty}>
              <Text style={styles.paymentCardEmptyIcon}>🏛️</Text>
              <Text style={styles.paymentCardEmptyText}>No Active ECORET Loan</Text>
              <Text style={styles.paymentCardEmptySubtext}>Your group has no active ECORET loan at the moment</Text>
            </View>
          )}

          {ecoretLoan && (ecoretLoan.status === 'active' || ecoretLoan.status === 'approved' || ecoretLoan.status === 'disbursed') && (
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.paymentCard, styles.paymentCardSecondary, styles.paymentCardWithShadow]}
              onPress={() => navigation.navigate('LoanRepayments')}
            >
              <View style={styles.paymentCardHeader}>
                <View style={[styles.paymentCardIcon, styles.paymentCardIconGreen]}>
                  <Text style={styles.paymentCardIconText}>💰</Text>
                </View>
                <View style={[styles.paymentCardBadge, styles.paymentCardBadgeGreen]}>
                  <Text style={[styles.paymentCardBadgeText, styles.paymentCardBadgeTextGreen]}>
                    {daysRemaining} days remaining
                  </Text>
                </View>
              </View>
              <View style={styles.paymentCardContent}>
                <View style={styles.paymentCardRow}>
                  <View style={styles.paymentCardCol}>
                    <Text style={styles.paymentCardLabel}>Amount</Text>
                    <Text style={styles.paymentCardValue}>{formatCurrency(ecoretLoan.amount)}</Text>
                  </View>
                  <View style={styles.paymentCardDivider} />
                  <View style={styles.paymentCardCol}>
                    <Text style={styles.paymentCardLabel}>Paid</Text>
                    <Text style={[styles.paymentCardValue, styles.paymentCardValueGreen]}>
                      {formatCurrency(totalPaid)}
                    </Text>
                  </View>
                </View>
                <View style={styles.paymentCardProgress}>
                  <View style={[styles.paymentCardProgressBar, { width: ecoretLoan.total_payable > 0 ? `${Math.min((totalPaid / ecoretLoan.total_payable) * 100, 100)}%` : '0%' }]} />
                </View>
                <View style={styles.paymentCardRow}>
                  <Text style={styles.paymentCardLabel}>Balance</Text>
                  <Text style={[styles.paymentCardValue, ecoretLoan.balance > 0 ? styles.paymentCardValueRed : styles.paymentCardValueGreen]}>
                    {formatCurrency(ecoretLoan.balance)}
                  </Text>
                </View>
                {ecoretLoan.status === 'approved' && (
                  <View style={styles.approvedBadge}>
                    <Text style={styles.approvedBadgeText}>⏳ Awaiting Disbursement</Text>
                  </View>
                )}
                {ecoretLoan.status === 'disbursed' && (
                  <View style={[styles.approvedBadge, { borderTopColor: '#dcfce7' }]}>
                    <Text style={[styles.approvedBadgeText, { color: '#16a34a' }]}>✅ Disbursed - Repayment Active</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Core Modules Grid */}
        <View style={styles.modulesSection}>
          <Text style={styles.sectionTitle}>CORE MODULES</Text>
          <View style={styles.modulesGrid}>
            {features.map((feature) => (
              <TouchableOpacity
                key={feature.id}
                activeOpacity={0.8}
                style={[
                  styles.moduleCard,
                  styles.moduleCardWithShadow,
                  !group && feature.id !== 'notifications' && styles.disabledCard
                ]}
                onPress={() => handleFeaturePress(feature.screen)}
              >
                <Text style={styles.moduleIcon}>{feature.icon}</Text>
                <Text style={styles.moduleLabel}>{feature.label}</Text>
                <Text style={styles.moduleDescription}>{feature.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      {/* Create Group Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide" onRequestClose={() => { setShowCreateModal(false); setNewGroupName(''); setAddress(''); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Create New Group</Text>
              <Text style={styles.modalSubtitle}>Set up your ECORET group</Text>

              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Group Name *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={newGroupName}
                  onChangeText={setNewGroupName}
                  placeholder="Enter group name"
                  placeholderTextColor={colors.secondary}
                />
              </View>

              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Address</Text>
                <TextInput
                  style={styles.modalInput}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="City/T.A/Village"
                  placeholderTextColor={colors.secondary}
                  multiline
                />
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>📌 What happens next?</Text>
                <Text style={styles.infoBullet}>• You will be the group chairman</Text>
                <Text style={styles.infoBullet}>• A group code will be generated</Text>
                <Text style={styles.infoBullet}>• You can start adding members</Text>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => { setShowCreateModal(false); setNewGroupName(''); setAddress(''); }} activeOpacity={0.7}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.submitModalButton]} onPress={handleCreateGroup} disabled={creating} activeOpacity={0.7}>
                  <Text style={styles.submitModalButtonText}>{creating ? 'Creating...' : 'Create Group'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B6B80',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B6B80',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1,
  },
  userRole: {
    fontSize: 12,
    color: '#b0d4e0',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginLeft: 4,
  },
  overviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#0B6B80',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    boxShadow: '0px 4px 12px rgba(11, 107, 128, 0.3)',
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  overviewTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 0.5,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#16a34a',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 2,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a2332',
  },
  statLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e5e7eb',
  },
  welcomeCard: {
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#93c5fd',
    shadowColor: '#0B6B80',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    boxShadow: '0px 4px 12px rgba(11, 107, 128, 0.2)',
  },
  welcomeEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 6,
  },
  welcomeText: {
    fontSize: 13,
    color: '#1e40af',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18,
  },
  createGroupButton: {
    backgroundColor: '#0B6B80',
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#0B6B80',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    boxShadow: '0px 2px 8px rgba(11, 107, 128, 0.3)',
  },
  createGroupButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  paymentsSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  sectionBadge: {
    fontSize: 10,
    color: '#b0d4e0',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  paymentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  paymentCardWithShadow: {
    shadowColor: '#0B6B80',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    boxShadow: '0px 4px 12px rgba(11, 107, 128, 0.25)',
  },
  paymentCardSecondary: {
    borderColor: '#dbeafe',
    backgroundColor: '#f0f9ff',
  },
  paymentCardEmpty: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  paymentCardEmptyIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  paymentCardEmptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  paymentCardEmptySubtext: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 2,
  },
  paymentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentCardIconGreen: {
    backgroundColor: '#f0fdf4',
  },
  paymentCardIconText: {
    fontSize: 16,
  },
  paymentCardBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  paymentCardBadgeGreen: {
    backgroundColor: '#dbeafe',
  },
  paymentCardBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#16a34a',
  },
  paymentCardBadgeTextGreen: {
    color: '#0B6B80',
  },
  paymentCardContent: {
    gap: 2,
  },
  paymentCardAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a2332',
  },
  paymentCardDesc: {
    fontSize: 12,
    color: '#1a2332',
  },
  paymentCardSubDesc: {
    fontSize: 11,
    color: '#6b7280',
  },
  paymentCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  paymentCardCol: {
    flex: 1,
  },
  paymentCardDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e5e7eb',
  },
  paymentCardLabel: {
    fontSize: 10,
    color: '#6b7280',
  },
  paymentCardValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a2332',
  },
  paymentCardValueGreen: {
    color: '#16a34a',
  },
  paymentCardValueRed: {
    color: '#dc2626',
  },
  paymentCardProgress: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginVertical: 6,
    overflow: 'hidden',
  },
  paymentCardProgressBar: {
    height: '100%',
    backgroundColor: '#0B6B80',
    borderRadius: 2,
  },
  approvedBadge: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#fef3c7',
    alignItems: 'center',
  },
  approvedBadgeText: {
    fontSize: 11,
    color: '#d97706',
    fontWeight: '600',
  },
  modulesSection: {
    marginBottom: 8,
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  moduleCard: {
    width: (width - 48) / 4,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 6,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#0B6B80',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    boxShadow: '0px 3px 10px rgba(11, 107, 128, 0.2)',
  },
  moduleCardWithShadow: {
    shadowColor: '#0B6B80',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    boxShadow: '0px 3px 10px rgba(11, 107, 128, 0.2)',
  },
  disabledCard: {
    opacity: 0.4,
  },
  moduleIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  moduleLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1a2332',
    textAlign: 'center',
  },
  moduleDescription: {
    fontSize: 7,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 1,
  },
  error: {
    color: '#fca5a5',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.25)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a2332',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 16,
  },
  modalField: {
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a2332',
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#1a2332',
    backgroundColor: '#f9fafb',
  },
  infoBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  infoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 2,
  },
  infoBullet: {
    fontSize: 11,
    color: '#166534',
    paddingLeft: 6,
    marginBottom: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: '#1a2332',
    fontWeight: '600',
  },
  submitModalButton: {
    backgroundColor: '#0B6B80',
  },
  submitModalButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});





// import React, { useEffect, useState, useCallback } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
//   ActivityIndicator,
//   Alert,
//   RefreshControl,
//   SafeAreaView,
//   Modal,
//   TextInput,
//   KeyboardAvoidingView,
//   Platform,
//   Dimensions,
// } from 'react-native';
// import { groupAPI, loanAPI } from '../api/endpoints';
// import { useAuth } from '../auth/AuthContext';
// import { colors } from '../theme/colors';
// import Icon from 'react-native-vector-icons/Ionicons';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const { width } = Dimensions.get('window');

// interface Group {
//   id: string;
//   group_name: string;
//   group_code: string;
//   is_active: boolean;
//   member_count?: number;
// }

// interface Loan {
//   id: string;
//   amount: number;
//   total_payable: number;
//   balance: number;
//   due_date: string;
//   status: string;
//   loan_type: string;
//   purpose: string;
//   member_name: string;
// }

// interface GroupStats {
//   members: number;
//   savings: number;
//   loans: number;
//   activeLoans: number;
// }

// export default function HomeScreen({ navigation }: any) {
//   const { logout, user } = useAuth();
//   const [group, setGroup] = useState<Group | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [error, setError] = useState('');
//   const [showCreateModal, setShowCreateModal] = useState(false);
//   const [creating, setCreating] = useState(false);
//   const [newGroupName, setNewGroupName] = useState('');
//   const [address, setAddress] = useState('');
//   const [groupStats, setGroupStats] = useState<GroupStats>({
//     members: 0,
//     savings: 0,
//     loans: 0,
//     activeLoans: 0,
//   });
//   const [ecoretLoan, setEcoretLoan] = useState<Loan | null>(null);
//   const [totalPaid, setTotalPaid] = useState(0);
//   const [daysRemaining, setDaysRemaining] = useState(0);

//   const loadGroup = useCallback(async () => {
//     try {
//       setError('');
//       console.log('Loading group...');
//       const response = await groupAPI.getGroups();
      
//       let results: any[] = [];
//       if (Array.isArray(response.data)) {
//         results = response.data;
//       } else if (response.data?.results) {
//         results = response.data.results;
//       }

//       if (results && results.length > 0) {
//         const groupData = results[0];
//         console.log('Group found:', groupData.group_name);
//         setGroup(groupData);

//         const memberCount = groupData.member_count || 0;
//         setGroupStats((prev) => ({ ...prev, members: memberCount }));

//         await Promise.all([
//           loadLedgerSummary(groupData.id),
//           loadApprovedLoansCount(groupData.id),
//           loadEcoretLoan(groupData.id),
//         ]);

//         return groupData;
//       } else {
//         console.log('No groups found');
//         setGroup(null);
//         return null;
//       }
//     } catch (err: any) {
//       console.error('Error loading group:', err);
//       setError('Could not load group info.');
//       return null;
//     }
//   }, []);

//   const loadLedgerSummary = async (groupId: string) => {
//     try {
//       const response = await groupAPI.getLedgerSummary(groupId);
//       const totalSavings = parseFloat(response.data?.total_savings) || 0;
//       setGroupStats((prev) => ({ ...prev, savings: totalSavings }));
//     } catch (err) {
//       console.error('Error loading ledger summary:', err);
//       setGroupStats((prev) => ({ ...prev, savings: 0 }));
//     }
//   };

//   const loadApprovedLoansCount = async (groupId: string) => {
//     try {
//       const allLoans = await loanAPI.getAllLoans();

//       const approvedGroupLoans = allLoans.filter((loan: any) => {
//         const loanGroup = loan.group || loan.group_id || loan.groupId || '';
//         const matchesGroup = loanGroup === groupId || loanGroup === groupId.toString();
//         return matchesGroup && loan.status === 'approved';
//       });

//       setGroupStats((prev) => ({ ...prev, loans: approvedGroupLoans.length }));
//     } catch (err) {
//       console.error('Error loading approved loans count:', err);
//       setGroupStats((prev) => ({ ...prev, loans: 0 }));
//     }
//   };

//   const loadEcoretLoan = async (groupId: string) => {
//     try {
//       console.log('Loading ECORET loan for group:', groupId);

//       const token = await AsyncStorage.getItem('access_token');
//       if (!token) {
//         console.log('No token found');
//         return;
//       }

//       const allLoans = await loanAPI.getAllLoans();
//       console.log('Total loans fetched:', allLoans.length);

//       const groupLoans = allLoans.filter((loan: any) => {
//         const loanGroup = loan.group || loan.group_id || loan.groupId || '';
//         return loanGroup === groupId || loanGroup === groupId.toString();
//       });

//       const mappedLoans: Loan[] = groupLoans.map((loan: any) => ({
//         id: loan.id,
//         member_name: loan.member_name || loan.member?.full_name || 'Unknown Member',
//         amount: parseFloat(loan.amount) || 0,
//         balance: parseFloat(loan.balance) || parseFloat(loan.amount) || 0,
//         total_payable: parseFloat(loan.total_payable) || 0,
//         total_paid: parseFloat(loan.total_paid) || 0,
//         due_date: loan.due_date || '',
//         status: loan.status || 'pending',
//         loan_type: loan.loan_type || 'group_loan',
//         purpose: loan.purpose || '',
//       }));

//       const ecoretLoanData = mappedLoans.find(
//         (l) =>
//           l.loan_type === 'ecoret_loan' &&
//           (l.status === 'active' || l.status === 'approved' || l.status === 'disbursed'),
//       );

//       if (ecoretLoanData) {
//         console.log('ECORET loan found:', ecoretLoanData.id);
//         setEcoretLoan(ecoretLoanData);

//         try {
//           const repayResponse = await loanAPI.getLoanRepayments(ecoretLoanData.id);
//           let repaymentData: any[] = [];
//           if (Array.isArray(repayResponse.data)) {
//             repaymentData = repayResponse.data;
//           } else if (repayResponse.data?.results) {
//             repaymentData = repayResponse.data.results;
//           }

//           const total = repaymentData.reduce((sum: number, r: any) => sum + (parseFloat(r.amount) || 0), 0);
//           setTotalPaid(total);
//         } catch (e) {
//           console.log('Could not load repayments:', e);
//         }

//         if (ecoretLoanData.due_date) {
//           const dueDate = new Date(ecoretLoanData.due_date);
//           const today = new Date();
//           const diffTime = dueDate.getTime() - today.getTime();
//           const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
//           setDaysRemaining(diffDays > 0 ? diffDays : 0);
//         }
//       } else {
//         console.log('No ECORET loan found');
//         setEcoretLoan(null);
//         setTotalPaid(0);
//       }
//     } catch (err) {
//       console.error('Error loading ECORET loan:', err);
//       setEcoretLoan(null);
//     }
//   };

//   const loadAllData = useCallback(async () => {
//     setLoading(true);
//     await loadGroup();
//     setLoading(false);
//   }, [loadGroup]);

//   useEffect(() => {
//     loadAllData();
//   }, []);

//   const onRefresh = async () => {
//     setRefreshing(true);
//     await loadAllData();
//     setRefreshing(false);
//   };

//   const handleCreateGroup = async () => {
//     if (!newGroupName.trim()) {
//       Alert.alert('Error', 'Please enter a group name');
//       return;
//     }

//     setCreating(true);
//     try {
//       const groupData = {
//         group_name: newGroupName.trim(),
//         address: address.trim() || '',
//         default_interest_rate: 10,
//         social_max_contribution: 5000,
//         savings_max_contribution: 10000,
//         savings_min_contribution: 500,
//         meeting_frequency: 'weekly',
//         meeting_day: 'saturday',
//         cycle_duration_months: 12,
//       };

//       const response = await groupAPI.createGroup(groupData);
//       console.log('Group created:', response.data);

//       setShowCreateModal(false);
//       setNewGroupName('');
//       setAddress('');
//       setCreating(false);

//       Alert.alert(
//         'Success!',
//         `Group "${newGroupName.trim()}" created successfully!`,
//         [
//           {
//             text: 'OK',
//             onPress: async () => {
//               await loadAllData();
//             },
//           },
//         ]
//       );
//     } catch (error: any) {
//       console.error('Failed to create group:', error);
//       setCreating(false);
//       Alert.alert(
//         'Error',
//         error?.response?.data?.error ||
//           error?.response?.data?.message ||
//           'Failed to create group. Please try again.'
//       );
//     }
//   };

//   const formatCurrency = (amount: number): string => {
//     if (!amount) return 'MKW 0';
//     return `MKW ${amount.toLocaleString()}`;
//   };

//   const formatDate = (dateString: string): string => {
//     if (!dateString) return 'N/A';
//     const date = new Date(dateString);
//     return date.toLocaleDateString('en-US', {
//       day: 'numeric',
//       month: 'short',
//       year: 'numeric',
//     });
//   };

//   const navigateToMembers = () => {
//     if (!group) {
//       Alert.alert('No Group', 'Please create a group first');
//       return;
//     }
//     navigation.navigate('MembersManagement', {
//       groupId: group.id,
//       groupName: group.group_name,
//     });
//   };

//   const handleFeaturePress = (screen: string, params?: any) => {
//     if (!group && screen !== 'Notifications' && screen !== 'MembersManagement') {
//       Alert.alert('No Group', 'Please create a group first');
//       return;
//     }

//     if (screen === 'Members') {
//       navigateToMembers();
//       return;
//     }

//     navigation.navigate(screen, params);
//   };

//   // ============ FIXED LOGOUT WITH DEBUG LOGS ============
//   const handleLogout = () => {
//     console.log('🔴 Logout button pressed');
    
//     Alert.alert('Log Out', 'Are you sure you want to log out?', [
//       { 
//         text: 'Cancel', 
//         style: 'cancel',
//         onPress: () => console.log('❌ Logout cancelled')
//       },
//       {
//         text: 'Log Out',
//         style: 'destructive',
//         onPress: () => {
//           console.log('✅ Logout confirmed, proceeding...');
//           performLogout();
//         },
//       },
//     ]);
//   };

//   const performLogout = async () => {
//     try {
//       console.log('🔄 Starting logout process...');
      
//       // Clear AsyncStorage items
//       console.log('🗑️ Clearing AsyncStorage...');
//       await AsyncStorage.removeItem('access_token');
//       await AsyncStorage.removeItem('refresh_token');
//       await AsyncStorage.removeItem('user');
//       console.log('✅ AsyncStorage cleared');
      
//       // Call the logout function from context
//       console.log('📤 Calling logout from context...');
//       await logout();
//       console.log('✅ Context logout completed');
      
//       // Reset navigation to Login screen
//       console.log('🚀 Navigating to Login...');
//       navigation.reset({
//         index: 0,
//         routes: [{ name: 'Login' }],
//       });
//       console.log('✅ Navigation reset complete');
//     } catch (err) {
//       console.error('❌ Logout error:', err);
//       Alert.alert('Error', 'Failed to log out. Please try again.');
//     }
//   };

//   const features = [
//     { id: 'members', label: 'Members', icon: '👥', description: 'Register & manage', screen: 'MembersManagement' },
//     { id: 'reports', label: 'Reports', icon: '📊', description: 'Statements & charts', screen: 'Reports' },
//     { id: 'balance', label: 'Current Balance', icon: '💰', description: 'Balance & savings', screen: 'Savings' },
//     { id: 'loan_apply', label: 'Loan Application', icon: '📝', description: 'Apply & OTP auth', screen: 'LoanRequest' },
//     { id: 'repayments', label: 'Repayments', icon: '💸', description: 'Balance & schedule', screen: 'LoanRepayments' },
//     { id: 'attendance', label: 'Attendance', icon: '📋', description: 'Meeting & tracking', screen: 'Attendance' },
//     { id: 'ledger', label: 'Ledger', icon: '📒', description: 'Group audit trail', screen: 'GroupLedger' },
//     { id: 'notifications', label: 'Notifications', icon: '🔔', description: 'Alerts & updates', screen: 'Notifications' },
//     { id: 'profile', label: 'Group Settings', icon: '⚙️', description: 'Manage group settings', screen: 'Profile' },
//   ];

//   if (loading) {
//     return (
//       <SafeAreaView style={styles.centered}>
//         <ActivityIndicator size="large" color="#ffffff" />
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       <ScrollView
//         contentContainerStyle={styles.scrollContent}
//         refreshControl={
//           <RefreshControl
//             refreshing={refreshing}
//             onRefresh={onRefresh}
//             tintColor="#ffffff"
//             colors={['#ffffff']}
//           />
//         }
//         showsVerticalScrollIndicator={false}
//       >
//         {/* Header */}
//         <View style={styles.header}>
//           <View>
//             <Text style={styles.appName}>ECORET</Text>
//             <Text style={styles.userRole}>
//               {user?.role === 'admin' ? 'Admin' : 'Chairman'}
//             </Text>
//           </View>
//           <View style={styles.headerActions}>
//             <TouchableOpacity onPress={onRefresh} activeOpacity={0.7} style={styles.iconButton}>
//               <Icon name="refresh" size={22} color="#ffffff" />
//             </TouchableOpacity>
//             <TouchableOpacity onPress={handleLogout} activeOpacity={0.7} style={styles.iconButton}>
//               <Icon name="log-out-outline" size={24} color={colors.primary} />
//             </TouchableOpacity>
//           </View>
//         </View>

//         {/* Group Overview */}
//         {group ? (
//           <TouchableOpacity
//             activeOpacity={0.85}
//             style={styles.overviewCard}
//             onPress={() => {}}
//           >
//             <View style={styles.overviewHeader}>
//               <Text style={styles.overviewTitle}>GROUP OVERVIEW</Text>
//               <View style={styles.liveBadge}>
//                 <View style={styles.liveDot} />
//                 <Text style={styles.liveText}>Live</Text>
//               </View>
//             </View>

//             <View style={styles.statsRow}>
//               <TouchableOpacity style={styles.statItem} onPress={navigateToMembers} activeOpacity={0.7}>
//                 <Text style={styles.statNumber}>{groupStats.members}</Text>
//                 <Text style={styles.statLabel}>Members</Text>
//               </TouchableOpacity>
//               <View style={styles.statDivider} />
//               <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('GroupLedger')} activeOpacity={0.7}>
//                 <Text style={styles.statNumber}>{formatCurrency(groupStats.savings)}</Text>
//                 <Text style={styles.statLabel}>Total Savings</Text>
//               </TouchableOpacity>
//               <View style={styles.statDivider} />
//               <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('LoanRepayments')} activeOpacity={0.7}>
//                 <Text style={styles.statNumber}>{groupStats.loans}</Text>
//                 <Text style={styles.statLabel}>Loans Out</Text>
//               </TouchableOpacity>
//             </View>
//           </TouchableOpacity>
//         ) : (
//           <View style={styles.welcomeCard}>
//             <Text style={styles.welcomeEmoji}>👋</Text>
//             <Text style={styles.welcomeTitle}>Welcome to ECORET!</Text>
//             <Text style={styles.welcomeText}>
//               Create your group to start managing members, savings, and loans
//             </Text>
//             <TouchableOpacity style={styles.createGroupButton} onPress={() => setShowCreateModal(true)} activeOpacity={0.7}>
//               <Text style={styles.createGroupButtonText}>Create Group</Text>
//             </TouchableOpacity>
//           </View>
//         )}

//         {/* ECOMA Payments Section */}
//         <View style={styles.paymentsSection}>
//           <View style={styles.sectionHeader}>
//             <Text style={styles.sectionTitle}>ECOMA Payments</Text>
//             <Text style={styles.sectionBadge}>Recent</Text>
//           </View>

//           {ecoretLoan && (ecoretLoan.status === 'active' || ecoretLoan.status === 'approved' || ecoretLoan.status === 'disbursed') ? (
//             <TouchableOpacity
//               activeOpacity={0.85}
//               style={[styles.paymentCard, styles.paymentCardWithShadow]}
//               onPress={() => navigation.navigate('LoanRepayments')}
//             >
//               <View style={styles.paymentCardHeader}>
//                 <View style={styles.paymentCardIcon}>
//                   <Text style={styles.paymentCardIconText}>🏛️</Text>
//                 </View>
//                 <View style={[styles.paymentCardBadge, { backgroundColor: ecoretLoan.status === 'approved' ? '#fef3c7' : '#dcfce7' }]}>
//                   <Text style={[styles.paymentCardBadgeText, { color: ecoretLoan.status === 'approved' ? '#d97706' : '#16a34a' }]}>
//                     {ecoretLoan.status === 'approved' ? 'Approved' :
//                      ecoretLoan.status === 'disbursed' ? 'Disbursed' : 'Active'}
//                   </Text>
//                 </View>
//               </View>
//               <View style={styles.paymentCardContent}>
//                 <Text style={styles.paymentCardAmount}>{formatCurrency(ecoretLoan.amount)}</Text>
//                 <Text style={styles.paymentCardDesc}>Due: {formatDate(ecoretLoan.due_date)}</Text>
//                 <Text style={styles.paymentCardDesc}>Total Payable: {formatCurrency(ecoretLoan.total_payable)}</Text>
//                 <Text style={styles.paymentCardSubDesc}>Requested by: {ecoretLoan.member_name || 'Unknown'}</Text>
//               </View>
//             </TouchableOpacity>
//           ) : (
//             <View style={styles.paymentCardEmpty}>
//               <Text style={styles.paymentCardEmptyIcon}>🏛️</Text>
//               <Text style={styles.paymentCardEmptyText}>No Active ECORET Loan</Text>
//               <Text style={styles.paymentCardEmptySubtext}>Your group has no active ECORET loan at the moment</Text>
//             </View>
//           )}

//           {ecoretLoan && (ecoretLoan.status === 'active' || ecoretLoan.status === 'approved' || ecoretLoan.status === 'disbursed') && (
//             <TouchableOpacity
//               activeOpacity={0.85}
//               style={[styles.paymentCard, styles.paymentCardSecondary, styles.paymentCardWithShadow]}
//               onPress={() => navigation.navigate('LoanRepayments')}
//             >
//               <View style={styles.paymentCardHeader}>
//                 <View style={[styles.paymentCardIcon, styles.paymentCardIconGreen]}>
//                   <Text style={styles.paymentCardIconText}>💰</Text>
//                 </View>
//                 <View style={[styles.paymentCardBadge, styles.paymentCardBadgeGreen]}>
//                   <Text style={[styles.paymentCardBadgeText, styles.paymentCardBadgeTextGreen]}>
//                     {daysRemaining} days remaining
//                   </Text>
//                 </View>
//               </View>
//               <View style={styles.paymentCardContent}>
//                 <View style={styles.paymentCardRow}>
//                   <View style={styles.paymentCardCol}>
//                     <Text style={styles.paymentCardLabel}>Amount</Text>
//                     <Text style={styles.paymentCardValue}>{formatCurrency(ecoretLoan.amount)}</Text>
//                   </View>
//                   <View style={styles.paymentCardDivider} />
//                   <View style={styles.paymentCardCol}>
//                     <Text style={styles.paymentCardLabel}>Paid</Text>
//                     <Text style={[styles.paymentCardValue, styles.paymentCardValueGreen]}>
//                       {formatCurrency(totalPaid)}
//                     </Text>
//                   </View>
//                 </View>
//                 <View style={styles.paymentCardProgress}>
//                   <View style={[styles.paymentCardProgressBar, { width: ecoretLoan.total_payable > 0 ? `${Math.min((totalPaid / ecoretLoan.total_payable) * 100, 100)}%` : '0%' }]} />
//                 </View>
//                 <View style={styles.paymentCardRow}>
//                   <Text style={styles.paymentCardLabel}>Balance</Text>
//                   <Text style={[styles.paymentCardValue, ecoretLoan.balance > 0 ? styles.paymentCardValueRed : styles.paymentCardValueGreen]}>
//                     {formatCurrency(ecoretLoan.balance)}
//                   </Text>
//                 </View>
//                 {ecoretLoan.status === 'approved' && (
//                   <View style={styles.approvedBadge}>
//                     <Text style={styles.approvedBadgeText}>⏳ Awaiting Disbursement</Text>
//                   </View>
//                 )}
//                 {ecoretLoan.status === 'disbursed' && (
//                   <View style={[styles.approvedBadge, { borderTopColor: '#dcfce7' }]}>
//                     <Text style={[styles.approvedBadgeText, { color: '#16a34a' }]}>✅ Disbursed - Repayment Active</Text>
//                   </View>
//                 )}
//               </View>
//             </TouchableOpacity>
//           )}
//         </View>

//         {/* Core Modules Grid */}
//         <View style={styles.modulesSection}>
//           <Text style={styles.sectionTitle}>CORE MODULES</Text>
//           <View style={styles.modulesGrid}>
//             {features.map((feature) => (
//               <TouchableOpacity
//                 key={feature.id}
//                 activeOpacity={0.8}
//                 style={[
//                   styles.moduleCard,
//                   styles.moduleCardWithShadow,
//                   !group && feature.id !== 'notifications' && styles.disabledCard
//                 ]}
//                 onPress={() => handleFeaturePress(feature.screen)}
//               >
//                 <Text style={styles.moduleIcon}>{feature.icon}</Text>
//                 <Text style={styles.moduleLabel}>{feature.label}</Text>
//                 <Text style={styles.moduleDescription}>{feature.description}</Text>
//               </TouchableOpacity>
//             ))}
//           </View>
//         </View>

//         {error ? <Text style={styles.error}>{error}</Text> : null}
//       </ScrollView>

//       {/* Create Group Modal */}
//       <Modal visible={showCreateModal} transparent animationType="slide" onRequestClose={() => { setShowCreateModal(false); setNewGroupName(''); setAddress(''); }}>
//         <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
//           <View style={styles.modalOverlay}>
//             <View style={styles.modalContent}>
//               <Text style={styles.modalTitle}>Create New Group</Text>
//               <Text style={styles.modalSubtitle}>Set up your ECORET group</Text>

//               <View style={styles.modalField}>
//                 <Text style={styles.modalLabel}>Group Name *</Text>
//                 <TextInput
//                   style={styles.modalInput}
//                   value={newGroupName}
//                   onChangeText={setNewGroupName}
//                   placeholder="Enter group name"
//                   placeholderTextColor={colors.secondary}
//                 />
//               </View>

//               <View style={styles.modalField}>
//                 <Text style={styles.modalLabel}>Address</Text>
//                 <TextInput
//                   style={styles.modalInput}
//                   value={address}
//                   onChangeText={setAddress}
//                   placeholder="City/T.A/Village"
//                   placeholderTextColor={colors.secondary}
//                   multiline
//                 />
//               </View>

//               <View style={styles.infoBox}>
//                 <Text style={styles.infoText}>📌 What happens next?</Text>
//                 <Text style={styles.infoBullet}>• You will be the group chairman</Text>
//                 <Text style={styles.infoBullet}>• A group code will be generated</Text>
//                 <Text style={styles.infoBullet}>• You can start adding members</Text>
//               </View>

//               <View style={styles.modalActions}>
//                 <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => { setShowCreateModal(false); setNewGroupName(''); setAddress(''); }} activeOpacity={0.7}>
//                   <Text style={styles.cancelButtonText}>Cancel</Text>
//                 </TouchableOpacity>
//                 <TouchableOpacity style={[styles.modalButton, styles.submitModalButton]} onPress={handleCreateGroup} disabled={creating} activeOpacity={0.7}>
//                   <Text style={styles.submitModalButtonText}>{creating ? 'Creating...' : 'Create Group'}</Text>
//                 </TouchableOpacity>
//               </View>
//             </View>
//           </View>
//         </KeyboardAvoidingView>
//       </Modal>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#0B6B80',
//   },
//   scrollContent: {
//     padding: 16,
//     paddingBottom: 40,
//   },
//   centered: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#0B6B80',
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 16,
//   },
//   appName: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#ffffff',
//     letterSpacing: 1,
//   },
//   userRole: {
//     fontSize: 12,
//     color: '#b0d4e0',
//     marginTop: 2,
//   },
//   headerActions: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   iconButton: {
//     padding: 8,
//     marginLeft: 4,
//   },
  
//   // Overview Card - using boxShadow for web, shadow* for native
//   overviewCard: {
//     backgroundColor: '#ffffff',
//     borderRadius: 12,
//     padding: 16,
//     marginBottom: 16,
//     borderWidth: 2,
//     borderColor: '#e5e7eb',
//     // Native shadow
//     shadowColor: '#0B6B80',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//     elevation: 6,
//     // Web boxShadow
//     boxShadow: '0px 4px 12px rgba(11, 107, 128, 0.3)',
//   },
//   overviewHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   overviewTitle: {
//     fontSize: 12,
//     fontWeight: '700',
//     color: '#6b7280',
//     letterSpacing: 0.5,
//   },
//   liveBadge: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#dcfce7',
//     paddingHorizontal: 8,
//     paddingVertical: 3,
//     borderRadius: 10,
//   },
//   liveDot: {
//     width: 6,
//     height: 6,
//     borderRadius: 3,
//     backgroundColor: '#22c55e',
//     marginRight: 4,
//   },
//   liveText: {
//     fontSize: 10,
//     fontWeight: '600',
//     color: '#16a34a',
//   },
//   statsRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     alignItems: 'center',
//   },
//   statItem: {
//     alignItems: 'center',
//     flex: 1,
//     paddingVertical: 2,
//   },
//   statNumber: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#1a2332',
//   },
//   statLabel: {
//     fontSize: 10,
//     color: '#6b7280',
//     marginTop: 2,
//   },
//   statDivider: {
//     width: 1,
//     height: 30,
//     backgroundColor: '#e5e7eb',
//   },
  
//   // Welcome Card
//   welcomeCard: {
//     backgroundColor: '#dbeafe',
//     borderRadius: 12,
//     padding: 20,
//     marginBottom: 16,
//     alignItems: 'center',
//     borderWidth: 2,
//     borderColor: '#93c5fd',
//     shadowColor: '#0B6B80',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.2,
//     shadowRadius: 8,
//     elevation: 4,
//     boxShadow: '0px 4px 12px rgba(11, 107, 128, 0.2)',
//   },
//   welcomeEmoji: {
//     fontSize: 40,
//     marginBottom: 8,
//   },
//   welcomeTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#1e40af',
//     marginBottom: 6,
//   },
//   welcomeText: {
//     fontSize: 13,
//     color: '#1e40af',
//     textAlign: 'center',
//     marginBottom: 12,
//     lineHeight: 18,
//   },
//   createGroupButton: {
//     backgroundColor: '#0B6B80',
//     paddingHorizontal: 28,
//     paddingVertical: 10,
//     borderRadius: 20,
//     shadowColor: '#0B6B80',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.3,
//     shadowRadius: 4,
//     elevation: 3,
//     boxShadow: '0px 2px 8px rgba(11, 107, 128, 0.3)',
//   },
//   createGroupButtonText: {
//     color: '#fff',
//     fontSize: 14,
//     fontWeight: '600',
//   },
  
//   // Payments Section
//   paymentsSection: {
//     marginBottom: 16,
//   },
//   sectionHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 10,
//   },
//   sectionTitle: {
//     fontSize: 15,
//     fontWeight: 'bold',
//     color: '#ffffff',
//   },
//   sectionBadge: {
//     fontSize: 10,
//     color: '#b0d4e0',
//     backgroundColor: 'rgba(255,255,255,0.2)',
//     paddingHorizontal: 8,
//     paddingVertical: 2,
//     borderRadius: 10,
//     borderWidth: 1,
//     borderColor: 'rgba(255,255,255,0.3)',
//   },
  
//   // Payment Cards
//   paymentCard: {
//     backgroundColor: '#ffffff',
//     borderRadius: 10,
//     padding: 14,
//     marginBottom: 8,
//     borderWidth: 2,
//     borderColor: '#e5e7eb',
//   },
//   paymentCardWithShadow: {
//     shadowColor: '#0B6B80',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.25,
//     shadowRadius: 8,
//     elevation: 5,
//     boxShadow: '0px 4px 12px rgba(11, 107, 128, 0.25)',
//   },
//   paymentCardSecondary: {
//     borderColor: '#dbeafe',
//     backgroundColor: '#f0f9ff',
//   },
//   paymentCardEmpty: {
//     backgroundColor: '#ffffff',
//     borderRadius: 10,
//     padding: 16,
//     alignItems: 'center',
//     borderWidth: 2,
//     borderColor: '#e5e7eb',
//     borderStyle: 'dashed',
//   },
//   paymentCardEmptyIcon: {
//     fontSize: 28,
//     marginBottom: 6,
//   },
//   paymentCardEmptyText: {
//     fontSize: 13,
//     fontWeight: '600',
//     color: '#6b7280',
//   },
//   paymentCardEmptySubtext: {
//     fontSize: 11,
//     color: '#6b7280',
//     textAlign: 'center',
//     marginTop: 2,
//   },
//   paymentCardHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 8,
//   },
//   paymentCardIcon: {
//     width: 32,
//     height: 32,
//     borderRadius: 16,
//     backgroundColor: '#fef2f2',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   paymentCardIconGreen: {
//     backgroundColor: '#f0fdf4',
//   },
//   paymentCardIconText: {
//     fontSize: 16,
//   },
//   paymentCardBadge: {
//     paddingHorizontal: 8,
//     paddingVertical: 2,
//     borderRadius: 10,
//   },
//   paymentCardBadgeGreen: {
//     backgroundColor: '#dbeafe',
//   },
//   paymentCardBadgeText: {
//     fontSize: 9,
//     fontWeight: '600',
//     color: '#16a34a',
//   },
//   paymentCardBadgeTextGreen: {
//     color: '#0B6B80',
//   },
//   paymentCardContent: {
//     gap: 2,
//   },
//   paymentCardAmount: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: '#1a2332',
//   },
//   paymentCardDesc: {
//     fontSize: 12,
//     color: '#1a2332',
//   },
//   paymentCardSubDesc: {
//     fontSize: 11,
//     color: '#6b7280',
//   },
//   paymentCardRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginTop: 4,
//   },
//   paymentCardCol: {
//     flex: 1,
//   },
//   paymentCardDivider: {
//     width: 1,
//     height: 24,
//     backgroundColor: '#e5e7eb',
//   },
//   paymentCardLabel: {
//     fontSize: 10,
//     color: '#6b7280',
//   },
//   paymentCardValue: {
//     fontSize: 13,
//     fontWeight: '600',
//     color: '#1a2332',
//   },
//   paymentCardValueGreen: {
//     color: '#16a34a',
//   },
//   paymentCardValueRed: {
//     color: '#dc2626',
//   },
//   paymentCardProgress: {
//     height: 4,
//     backgroundColor: '#e5e7eb',
//     borderRadius: 2,
//     marginVertical: 6,
//     overflow: 'hidden',
//   },
//   paymentCardProgressBar: {
//     height: '100%',
//     backgroundColor: '#0B6B80',
//     borderRadius: 2,
//   },
//   approvedBadge: {
//     marginTop: 6,
//     paddingTop: 6,
//     borderTopWidth: 1,
//     borderTopColor: '#fef3c7',
//     alignItems: 'center',
//   },
//   approvedBadgeText: {
//     fontSize: 11,
//     color: '#d97706',
//     fontWeight: '600',
//   },
  
//   // Modules Section
//   modulesSection: {
//     marginBottom: 8,
//   },
//   modulesGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     justifyContent: 'space-between',
//     marginTop: 10,
//   },
  
//   // Module Cards
//   moduleCard: {
//     width: (width - 48) / 4,
//     backgroundColor: '#ffffff',
//     borderRadius: 10,
//     paddingVertical: 12,
//     paddingHorizontal: 6,
//     marginBottom: 10,
//     alignItems: 'center',
//     borderWidth: 2,
//     borderColor: '#e5e7eb',
//     shadowColor: '#0B6B80',
//     shadowOffset: { width: 0, height: 3 },
//     shadowOpacity: 0.2,
//     shadowRadius: 6,
//     elevation: 4,
//     boxShadow: '0px 3px 10px rgba(11, 107, 128, 0.2)',
//   },
//   moduleCardWithShadow: {
//     shadowColor: '#0B6B80',
//     shadowOffset: { width: 0, height: 3 },
//     shadowOpacity: 0.2,
//     shadowRadius: 6,
//     elevation: 4,
//     boxShadow: '0px 3px 10px rgba(11, 107, 128, 0.2)',
//   },
//   disabledCard: {
//     opacity: 0.4,
//   },
//   moduleIcon: {
//     fontSize: 20,
//     marginBottom: 4,
//   },
//   moduleLabel: {
//     fontSize: 10,
//     fontWeight: '600',
//     color: '#1a2332',
//     textAlign: 'center',
//   },
//   moduleDescription: {
//     fontSize: 7,
//     color: '#6b7280',
//     textAlign: 'center',
//     marginTop: 1,
//   },
//   error: {
//     color: '#fca5a5',
//     marginBottom: 10,
//     textAlign: 'center',
//   },
  
//   // Modal Styles
//   modalContainer: {
//     flex: 1,
//   },
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 20,
//   },
//   modalContent: {
//     backgroundColor: '#fff',
//     padding: 20,
//     borderRadius: 12,
//     width: '100%',
//     maxWidth: 400,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.25,
//     shadowRadius: 8,
//     elevation: 5,
//     boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.25)',
//   },
//   modalTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#1a2332',
//     marginBottom: 4,
//   },
//   modalSubtitle: {
//     fontSize: 13,
//     color: '#6b7280',
//     marginBottom: 16,
//   },
//   modalField: {
//     marginBottom: 12,
//   },
//   modalLabel: {
//     fontSize: 13,
//     fontWeight: '600',
//     color: '#1a2332',
//     marginBottom: 4,
//   },
//   modalInput: {
//     borderWidth: 1,
//     borderColor: '#e5e7eb',
//     borderRadius: 8,
//     padding: 10,
//     fontSize: 14,
//     color: '#1a2332',
//     backgroundColor: '#f9fafb',
//   },
//   infoBox: {
//     backgroundColor: '#f0fdf4',
//     borderRadius: 8,
//     padding: 10,
//     marginBottom: 12,
//     borderWidth: 1,
//     borderColor: '#bbf7d0',
//   },
//   infoText: {
//     fontSize: 12,
//     fontWeight: '600',
//     color: '#166534',
//     marginBottom: 2,
//   },
//   infoBullet: {
//     fontSize: 11,
//     color: '#166534',
//     paddingLeft: 6,
//     marginBottom: 1,
//   },
//   modalActions: {
//     flexDirection: 'row',
//     gap: 6,
//     marginTop: 6,
//   },
//   modalButton: {
//     flex: 1,
//     padding: 12,
//     borderRadius: 8,
//     alignItems: 'center',
//   },
//   cancelButton: {
//     backgroundColor: '#f3f4f6',
//   },
//   cancelButtonText: {
//     color: '#1a2332',
//     fontWeight: '600',
//   },
//   submitModalButton: {
//     backgroundColor: '#0B6B80',
//   },
//   submitModalButtonText: {
//     color: '#fff',
//     fontWeight: '600',
//   },
// });