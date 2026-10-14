import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../theme/colors';
import { groupAPI, ledgerAPI } from '../api/endpoints';

interface Member {
  id: string;
  full_name: string;
  phone_number: string;
}

interface SavingTransaction {
  id: string;
  member_id: string;
  member_name: string;
  amount: number;
  transaction_type: 'deposit' | 'withdrawal';
  transaction_date: string;
  notes: string;
  reference_number: string;
  recorded_by: string;
}

type ViewType = 'deposits' | 'withdrawals' | 'history' | 'social' | 'statement';

// Reference numbers are generated automatically, e.g. DEP-20261012-K3F9QX
type RefPrefix = 'DEP' | 'WTH' | 'SOC';

const generateReference = (prefix: RefPrefix): string => {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${date}-${rand}`;
};

export function SavingsScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeView, setActiveView] = useState<ViewType>('deposits');
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [savings, setSavings] = useState<SavingTransaction[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [totalDeposits, setTotalDeposits] = useState(0);
  const [totalWithdrawals, setTotalWithdrawals] = useState(0);
  const [totalSocial, setTotalSocial] = useState(0);
  const [balance, setBalance] = useState(0);

  const [socialMember, setSocialMember] = useState<Member | null>(null);
  const [socialAmount, setSocialAmount] = useState('');
  const [socialDescription, setSocialDescription] = useState('');
  const [showSocialMemberSelector, setShowSocialMemberSelector] = useState(false);
  const [submittingSocial, setSubmittingSocial] = useState(false);
  const [socialSubView, setSocialSubView] = useState<'list' | 'detail'>('list');
  const [socialSelectedMember, setSocialSelectedMember] = useState<Member | null>(null);
  const [showSocialHistoryModal, setShowSocialHistoryModal] = useState(false);
  const [groupSocialMax, setGroupSocialMax] = useState<number>(0);
  const [selectedMemberForStatement, setSelectedMemberForStatement] = useState<Member | null>(null);
  const [memberTransactions, setMemberTransactions] = useState<SavingTransaction[]>([]);
  const [showStatementModal, setShowStatementModal] = useState(false);

  const isFirstLoad = useRef(true);
  const isDataLoaded = useRef(false);

  const loadGroupAndData = useCallback(async () => {
    try {
      if (isFirstLoad.current) setLoading(true);
      console.log('📡 Loading group and data...');

      const response = await groupAPI.getGroups();
      const results = Array.isArray(response.data) ? response.data : response.data.results || [];

      if (results.length > 0) {
        const group = results[0];
        setGroupId(group.id);
        setGroupSocialMax(parseFloat(group.social_max_contribution) || 0);
        await loadMembers(group.id);
        await loadSavingsData(group.id);
        isDataLoaded.current = true;
      } else {
        Alert.alert('No Group', 'You are not assigned to any group yet.');
        isDataLoaded.current = false;
      }
    } catch (error) {
      console.error('Failed to load group:', error);
      Alert.alert('Error', 'Failed to load group data');
    } finally {
      if (isFirstLoad.current) {
        setLoading(false);
        isFirstLoad.current = false;
      }
    }
  }, []);

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

  const loadSavingsData = async (groupIdParam?: string) => {
    try {
      const groupIdToUse = groupIdParam || groupId;

      if (!groupIdToUse) {
        console.log('⚠️ No groupId available, skipping load');
        return;
      }

      console.log('📡 Fetching ledger entries for savings...');
      const response = await ledgerAPI.getEntries(groupIdToUse);

      let allEntries = [];
      if (Array.isArray(response.data)) {
        allEntries = response.data;
      } else if (response.data?.results) {
        allEntries = response.data.results;
      } else {
        allEntries = response.data || [];
      }

      if (allEntries.length === 0) {
        setSavings([]);
        setTotalDeposits(0);
        setTotalWithdrawals(0);
        setTotalSocial(0);
        setBalance(0);
        return;
      }

      const transactions: SavingTransaction[] = allEntries.map((s: any) => {
        let memberName = 'Unknown Member';
        if (s.member_name) {
          memberName = s.member_name;
        } else if (s.member_details) {
          memberName = s.member_details.full_name || 'Unknown Member';
        } else if (s.member && typeof s.member === 'object') {
          memberName = s.member.full_name || 'Unknown Member';
        }

        let memberId = s.member || s.member_id || '';
        if (typeof memberId === 'object' && memberId.id) {
          memberId = memberId.id;
        }

        const amount = parseFloat(s.amount) || 0;
        let transactionType: 'deposit' | 'withdrawal' = 'deposit';
        if (s.transaction_type === 'withdrawal' || s.transaction_type === 'withdraw') {
          transactionType = 'withdrawal';
        }

        return {
          id: s.id || `txn_${Date.now()}_${Math.random()}`,
          member_id: memberId,
          member_name: memberName,
          amount: amount,
          transaction_type: transactionType,
          transaction_date: s.recorded_at || s.transaction_date || s.created_at || new Date().toISOString(),
          notes: s.description || s.notes || '',
          reference_number: s.reference_number || s.id || '',
          recorded_by: s.recorded_by || '',
        };
      });

      transactions.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
      setSavings(transactions);

      const deposits = transactions.filter(t => t.transaction_type === 'deposit');
      const withdrawals = transactions.filter(t => t.transaction_type === 'withdrawal');

      const socialTxns = transactions.filter(t =>
        t.notes && (t.notes.includes('SOCIAL:') || t.notes.toLowerCase().includes('social'))
      );

      const totalDep = deposits.reduce((sum, t) => sum + t.amount, 0);
      const totalWith = withdrawals.reduce((sum, t) => sum + t.amount, 0);
      const totalSoc = socialTxns.reduce((sum, t) => sum + t.amount, 0);

      setTotalDeposits(totalDep);
      setTotalWithdrawals(totalWith);
      setTotalSocial(totalSoc);
      setBalance(totalDep - totalWith);

      console.log('✅ Savings data loaded:', {
        transactions: transactions.length,
        deposits: totalDep,
        withdrawals: totalWith,
        social: totalSoc,
        balance: totalDep - totalWith,
      });
    } catch (error) {
      console.error('❌ Failed to load savings data:', error);
      setSavings([]);
    }
  };

  useEffect(() => {
    loadGroupAndData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isDataLoaded.current && groupId) {
        console.log('📡 Refreshing data on focus...');
        loadSavingsData(groupId);
      }
      return () => {};
    }, [groupId])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    if (groupId) {
      await loadSavingsData(groupId);
    } else {
      await loadGroupAndData();
    }
    setRefreshing(false);
  };

  // The member is passed in directly: calling setSocialMember() and then reading
  // socialMember in the same tick would still see the old (null) value.
  const handleSocialContribution = async (member: Member | null) => {
    if (!member) {
      Alert.alert('Error', 'Please select a member');
      return;
    }

    const amountValue = parseFloat(socialAmount);
    if (!amountValue || amountValue <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!socialDescription.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    if (!groupId) {
      Alert.alert('Error', 'Group ID is missing');
      return;
    }

    setSubmittingSocial(true);
    try {
      const data = {
        transaction_type: 'social_contribution',
        amount: amountValue,
        member: member.id,
        description: `SOCIAL: ${socialDescription.trim()}`,
        reference_number: generateReference('SOC'),
      };

      console.log('📤 Sending social contribution to ledger:', JSON.stringify(data, null, 2));

      const response = await ledgerAPI.addEntry(groupId, data);
      console.log('📥 Response:', response.data);

      Alert.alert(
        '✅ Success',
        `Social contribution of MK${amountValue.toLocaleString()} recorded for ${member.full_name}!`
      );

      setSocialMember(null);
      setSocialAmount('');
      setSocialDescription('');

      await loadSavingsData(groupId);
    } catch (error: any) {
      console.error('❌ Failed to save social contribution:', error);
      console.error('❌ Error response:', error?.response?.data);
      Alert.alert('❌ Error', error?.response?.data?.error || 'Failed to record social contribution. Please try again.');
    } finally {
      setSubmittingSocial(false);
    }
  };

  const handleAddTransaction = async () => {
    if (!selectedMember) {
      Alert.alert('Error', 'Please select a member');
      return;
    }

    const amountValue = parseFloat(amount);
    if (!amountValue || amountValue <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (transactionType === 'withdrawal' && amountValue > balance) {
      Alert.alert('Error', `Insufficient balance. Available balance: MK${balance.toLocaleString()}`);
      return;
    }

    if (!groupId) {
      Alert.alert('Error', 'Group ID is missing');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = {
        transaction_type: transactionType === 'deposit' ? 'deposit' : 'withdrawal',
        amount: amountValue,
        member: selectedMember.id,
        description: notes || `${transactionType === 'deposit' ? 'Deposit' : 'Withdrawal'} for ${selectedMember.full_name}`,
        reference_number: generateReference(transactionType === 'deposit' ? 'DEP' : 'WTH'),
      };

      console.log('📤 Sending transaction to ledger:', JSON.stringify(data, null, 2));

      const response = await ledgerAPI.addEntry(groupId, data);
      console.log('📥 Response:', response.data);

      Alert.alert(
        '✅ Success',
        `${transactionType === 'deposit' ? 'Deposit' : 'Withdrawal'} of MK${amountValue.toLocaleString()} recorded for ${selectedMember.full_name}!`
      );

      setShowAddModal(false);
      setSelectedMember(null);
      setAmount('');
      setNotes('');

      await loadSavingsData(groupId);
    } catch (error: any) {
      console.error('❌ Failed to save transaction:', error);
      console.error('❌ Error response:', error?.response?.data);
      Alert.alert('❌ Error', error?.response?.data?.error || 'Failed to record transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadMemberStatement = (member: Member) => {
    const memberTxns = savings.filter(t => t.member_id === member.id);
    memberTxns.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
    setMemberTransactions(memberTxns);
    setSelectedMemberForStatement(member);
    setShowStatementModal(true);
  };

  const getMemberBalance = (memberId: string) => {
    const memberTxns = savings.filter(t => t.member_id === memberId);
    const deposits = memberTxns.filter(t => t.transaction_type === 'deposit').reduce((sum, t) => sum + t.amount, 0);
    const withdrawals = memberTxns.filter(t => t.transaction_type === 'withdrawal').reduce((sum, t) => sum + t.amount, 0);
    return deposits - withdrawals;
  };

  const getMemberTotalDeposits = (memberId: string) => {
    return savings.filter(t => t.member_id === memberId && t.transaction_type === 'deposit')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getMemberTotalWithdrawals = (memberId: string) => {
    return savings.filter(t => t.member_id === memberId && t.transaction_type === 'withdrawal')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getMemberTotalSocial = (memberId: string) => {
    return savings.filter(t => t.member_id === memberId && t.notes && t.notes.includes('SOCIAL:'))
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getMemberSocialTransactions = (memberId: string) => {
    return savings
      .filter(t => t.member_id === memberId && t.notes && t.notes.includes('SOCIAL:'))
      .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
  };

  const filterTransactions = (transactions: SavingTransaction[]) => {
    if (!searchQuery) return transactions;
    const query = searchQuery.toLowerCase();
    return transactions.filter(t =>
      t.member_name.toLowerCase().includes(query) ||
      t.notes?.toLowerCase().includes(query) ||
      t.reference_number?.toLowerCase().includes(query)
    );
  };

  const getFilteredTransactions = () => {
    let filtered = savings;
    if (activeView === 'deposits') {
      filtered = savings.filter(t => t.transaction_type === 'deposit');
    } else if (activeView === 'withdrawals') {
      filtered = savings.filter(t => t.transaction_type === 'withdrawal');
    } else if (activeView === 'social') {
      filtered = savings.filter(t => t.notes && t.notes.includes('SOCIAL:'));
    }
    return filterTransactions(filtered);
  };

  const renderTransaction = ({ item }: { item: SavingTransaction }) => {
    const isDeposit = item.transaction_type === 'deposit';
    const isSocial = item.notes && item.notes.includes('SOCIAL:');

    let icon = '💰';
    let amountStyle = styles.depositAmount;
    let prefix = '+';
    let bgColor = '#d1fae5';

    if (!isDeposit) {
      icon = '💸';
      amountStyle = styles.withdrawalAmount;
      prefix = '-';
      bgColor = '#fee2e2';
    } else if (isSocial) {
      icon = '🤝';
      amountStyle = styles.socialAmount;
      prefix = '+';
      bgColor = '#fef3c7';
    }

    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionLeft}>
            <View style={[styles.transactionIcon, { backgroundColor: bgColor }]}>
              <Text style={styles.transactionIconText}>{icon}</Text>
            </View>
            <View>
              <Text style={styles.transactionMember}>{item.member_name}</Text>
              <Text style={styles.transactionDate}>
                {new Date(item.transaction_date).toLocaleDateString()}
                {item.reference_number && ` • Ref: ${item.reference_number}`}
              </Text>
              {isSocial && (
                <Text style={styles.transactionSocialLabel}>🤝 Social Contribution</Text>
              )}
            </View>
          </View>
          <View style={styles.transactionRight}>
            <Text style={[styles.transactionAmount, amountStyle]}>
              {prefix} MK{item.amount.toLocaleString()}
            </Text>
          </View>
        </View>
        {item.notes && <Text style={styles.transactionNotes}>{item.notes}</Text>}
      </View>
    );
  };

  const renderMemberCard = ({ item }: { item: Member }) => (
    <TouchableOpacity
      style={[styles.memberCard, selectedMember?.id === item.id && styles.selectedMemberCard]}
      onPress={() => {
        setSelectedMember(item);
        setShowMemberSelector(false);
      }}
      activeOpacity={0.7}
    >
      <Text style={styles.memberCardName}>{item.full_name}</Text>
      <Text style={styles.memberCardPhone}>{item.phone_number}</Text>
    </TouchableOpacity>
  );

  const renderSocialMemberCard = ({ item }: { item: Member }) => (
    <TouchableOpacity
      style={[styles.memberCard, socialMember?.id === item.id && styles.selectedMemberCard]}
      onPress={() => {
        setSocialMember(item);
        setShowSocialMemberSelector(false);
      }}
      activeOpacity={0.7}
    >
      <Text style={styles.memberCardName}>{item.full_name}</Text>
      <Text style={styles.memberCardPhone}>{item.phone_number}</Text>
    </TouchableOpacity>
  );

  const renderMemberForStatement = ({ item }: { item: Member }) => {
    const memberBalance = getMemberBalance(item.id);

    return (
      <TouchableOpacity
        style={styles.statementMemberCard}
        onPress={() => loadMemberStatement(item)}
        activeOpacity={0.7}
      >
        <View style={styles.statementMemberInfo}>
          <View style={styles.statementMemberAvatar}>
            <Text style={styles.statementMemberAvatarText}>
              {item.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.statementMemberDetails}>
            <Text style={styles.statementMemberName}>{item.full_name}</Text>
            <Text style={styles.statementMemberPhone}>{item.phone_number}</Text>
          </View>
        </View>
        <View style={styles.statementMemberStats}>
          <View style={styles.statementMemberStat}>
            <Text style={styles.statementMemberStatLabel}>Balance</Text>
            <Text style={[styles.statementMemberStatValue, memberBalance >= 0 ? styles.positive : styles.negative]}>
              MK{memberBalance.toLocaleString()}
            </Text>
          </View>
          <Icon name="chevron-forward" size={20} color={colors.secondary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderStatementTransaction = ({ item }: { item: SavingTransaction }) => {
    const isDeposit = item.transaction_type === 'deposit';
    const isSocial = item.notes && item.notes.includes('SOCIAL:');

    let icon = '💰';
    let amountStyle = styles.depositAmount;
    let prefix = '+';
    let bgColor = '#d1fae5';
    let label = 'Deposit';

    if (!isDeposit) {
      icon = '💸';
      amountStyle = styles.withdrawalAmount;
      prefix = '-';
      bgColor = '#fee2e2';
      label = 'Withdrawal';
    } else if (isSocial) {
      icon = '🤝';
      amountStyle = styles.socialAmount;
      prefix = '+';
      bgColor = '#fef3c7';
      label = 'Social';
    }

    return (
      <View style={styles.statementTransactionCard}>
        <View style={styles.statementTransactionLeft}>
          <View style={[styles.statementTransactionIcon, { backgroundColor: bgColor }]}>
            <Text style={styles.statementTransactionIconText}>{icon}</Text>
          </View>
          <View>
            <Text style={styles.statementTransactionType}>{label}</Text>
            <Text style={styles.statementTransactionDate}>
              {new Date(item.transaction_date).toLocaleDateString()}
            </Text>
            {item.notes && (
              <Text style={styles.statementTransactionNotes} numberOfLines={1}>{item.notes}</Text>
            )}
          </View>
        </View>
        <Text style={[styles.statementTransactionAmount, amountStyle]}>
          {prefix} MK{item.amount.toLocaleString()}
        </Text>
      </View>
    );
  };

  const getTotalForView = () => {
    if (activeView === 'deposits') return totalDeposits;
    if (activeView === 'withdrawals') return totalWithdrawals;
    if (activeView === 'social') return totalSocial;
    return savings.reduce((sum, t) => sum + t.amount, 0);
  };

  const getViewLabel = () => {
    if (activeView === 'deposits') return 'Total Deposits';
    if (activeView === 'withdrawals') return 'Total Withdrawals';
    if (activeView === 'social') return 'Total Social Fund';
    return 'Total Transactions';
  };

  const filteredTransactions = getFilteredTransactions();

  if (activeView === 'social') {
    const memberSocialTotal = socialSelectedMember ? getMemberTotalSocial(socialSelectedMember.id) : 0;
    const memberSocialBalance = groupSocialMax - memberSocialTotal;
    const memberSocialTxns = socialSelectedMember ? getMemberSocialTransactions(socialSelectedMember.id) : [];

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (socialSubView === 'detail') {
                setSocialSubView('list');
                setSocialSelectedMember(null);
              } else {
                navigation.goBack();
              }
            }}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {socialSubView === 'list' ? 'Social Contribution' : socialSelectedMember?.full_name || 'Member'}
          </Text>
          <TouchableOpacity
            style={styles.headerBackToSavings}
            onPress={() => {
              setActiveView('deposits');
              setSocialSubView('list');
              setSocialSelectedMember(null);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.headerBackToSavingsText}>Savings</Text>
          </TouchableOpacity>
        </View>

        {socialSubView === 'list' ? (
          <>
            <View style={styles.socialSummaryCard}>
              <View style={styles.socialSummaryIcon}>
                <Text style={styles.socialSummaryIconText}>🤝</Text>
              </View>
              <View>
                <Text style={styles.socialSummaryLabel}>Total Social Fund</Text>
                <Text style={styles.socialSummaryAmount}>MK{totalSocial.toLocaleString()}</Text>
              </View>
            </View>

            <FlatList
              data={members}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.statementListContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              renderItem={({ item }) => {
                const total = getMemberTotalSocial(item.id);
                return (
                  <TouchableOpacity
                    style={styles.statementMemberCard}
                    onPress={() => {
                      setSocialSelectedMember(item);
                      setSocialSubView('detail');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.statementMemberInfo}>
                      <View style={[styles.statementMemberAvatar, { backgroundColor: '#f59e0b' }]}>
                        <Text style={styles.statementMemberAvatarText}>
                          {item.full_name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.statementMemberDetails}>
                        <Text style={styles.statementMemberName}>{item.full_name}</Text>
                        <Text style={styles.statementMemberPhone}>{item.phone_number}</Text>
                      </View>
                    </View>
                    <View style={styles.statementMemberStats}>
                      <View style={styles.statementMemberStat}>
                        <Text style={styles.statementMemberStatLabel}>Contributed</Text>
                        <Text style={[styles.statementMemberStatValue, styles.socialAmount]}>
                          MK{total.toLocaleString()}
                        </Text>
                      </View>
                      <Icon name="chevron-forward" size={20} color={colors.secondary} />
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>👤</Text>
                  <Text style={styles.emptyText}>No members found</Text>
                </View>
              }
            />
          </>
        ) : (
          <ScrollView contentContainerStyle={styles.socialFormContainer} showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              style={styles.statementStatsContainer}
              onPress={() => setShowSocialHistoryModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.statementStatItem}>
                <Text style={styles.statementStatLabel}>Total Contributed</Text>
                <Text style={[styles.statementStatValue, styles.socialAmount]}>
                  MK{memberSocialTotal.toLocaleString()}
                </Text>
              </View>
              <View style={styles.statementStatDivider} />
              <View style={styles.statementStatItem}>
                <Text style={styles.statementStatLabel}>Max Contribution</Text>
                <Text style={styles.statementStatValue}>MK{groupSocialMax.toLocaleString()}</Text>
              </View>
              <View style={styles.statementStatDivider} />
              <View style={styles.statementStatItem}>
                <Text style={styles.statementStatLabel}>Balance</Text>
                <Text style={[styles.statementStatValue, memberSocialBalance >= 0 ? styles.positive : styles.negative]}>
                  MK{memberSocialBalance.toLocaleString()}
                </Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.socialTapHint}>Tap above to view transaction history</Text>

            <View style={styles.socialFormCard}>
              <Text style={styles.socialFormTitle}>Record Social Contribution</Text>
              <Text style={styles.socialFormSubtitle}>for {socialSelectedMember?.full_name}</Text>

              <View style={styles.socialField}>
                <Text style={styles.socialLabel}>Fund Description *</Text>
                <TextInput
                  style={[styles.socialInput, styles.socialTextArea]}
                  value={socialDescription}
                  onChangeText={setSocialDescription}
                  placeholder="Enter purpose of contribution (e.g., Funeral, Wedding, Emergency)"
                  placeholderTextColor={colors.secondary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.socialField}>
                <Text style={styles.socialLabel}>Amount (MK) *</Text>
                <View style={styles.socialAmountInputContainer}>
                  <Text style={styles.socialCurrencyPrefix}>MK</Text>
                  <TextInput
                    style={[styles.socialInput, styles.socialAmountInput]}
                    value={socialAmount}
                    onChangeText={setSocialAmount}
                    placeholder="0.00"
                    keyboardType="numeric"
                    placeholderTextColor={colors.secondary}
                  />
                </View>
                <Text style={styles.socialHint}>Cash payment only</Text>
              </View>

              <Text style={styles.socialHint}>Reference number is generated automatically</Text>

              <TouchableOpacity
                style={[styles.socialSubmitButton, submittingSocial && styles.socialSubmitDisabled]}
                onPress={() => handleSocialContribution(socialSelectedMember)}
                disabled={submittingSocial}
                activeOpacity={0.7}
              >
                {submittingSocial ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Icon name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.socialSubmitText}>Record Contribution</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        <Modal
          visible={showSocialHistoryModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowSocialHistoryModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, styles.statementModalContent]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{socialSelectedMember?.full_name} — Social History</Text>
                <TouchableOpacity onPress={() => setShowSocialHistoryModal(false)} activeOpacity={0.7}>
                  <Icon name="close" size={24} color={colors.secondary} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={memberSocialTxns}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.statementTransactionList}
                renderItem={({ item }) => (
                  <View style={styles.statementTransactionCard}>
                    <View style={styles.statementTransactionLeft}>
                      <View style={[styles.statementTransactionIcon, { backgroundColor: '#fef3c7' }]}>
                        <Text style={styles.statementTransactionIconText}>🤝</Text>
                      </View>
                      <View>
                        <Text style={styles.statementTransactionType}>
                          {item.notes?.replace('SOCIAL:', '').trim() || 'Social contribution'}
                        </Text>
                        <Text style={styles.statementTransactionDate}>
                          {new Date(item.transaction_date).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.statementTransactionAmount, styles.socialAmount]}>
                      MK{item.amount.toLocaleString()}
                    </Text>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={styles.statementEmptyState}>
                    <Text style={styles.statementEmptyIcon}>📭</Text>
                    <Text style={styles.statementEmptyText}>No social contributions yet</Text>
                  </View>
                }
              />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  if (activeView === 'statement') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Member Statements</Text>
          <TouchableOpacity
            style={styles.headerBackToSavings}
            onPress={() => setActiveView('deposits')}
            activeOpacity={0.7}
          >
            <Text style={styles.headerBackToSavingsText}>Savings</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.subtitleContainer}>
          <Text style={styles.subtitle}>View individual member savings history and balances</Text>
        </View>

        <View style={styles.statementSummaryContainer}>
          <View style={styles.statementSummaryItem}>
            <Text style={styles.statementSummaryLabel}>Total Members</Text>
            <Text style={styles.statementSummaryValue}>{members.length}</Text>
          </View>
          <View style={styles.statementSummaryDivider} />
          <View style={styles.statementSummaryItem}>
            <Text style={styles.statementSummaryLabel}>Total Balance</Text>
            <Text style={[styles.statementSummaryValue, styles.balanceAmount]}>
              MK{balance.toLocaleString()}
            </Text>
          </View>
        </View>

        <FlatList
          data={members}
          renderItem={renderMemberForStatement}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.statementListContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>👤</Text>
              <Text style={styles.emptyText}>No members found</Text>
            </View>
          }
        />

        <Modal
          visible={showStatementModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowStatementModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, styles.statementModalContent]}>
              <View style={styles.modalHeader}>
                <View style={styles.statementModalHeaderLeft}>
                  <View style={styles.statementModalAvatar}>
                    <Text style={styles.statementModalAvatarText}>
                      {selectedMemberForStatement?.full_name?.charAt(0).toUpperCase() || 'M'}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.statementModalName}>{selectedMemberForStatement?.full_name || 'Member'}</Text>
                    <Text style={styles.statementModalPhone}>{selectedMemberForStatement?.phone_number || ''}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setShowStatementModal(false)}
                  activeOpacity={0.7}
                >
                  <Icon name="close" size={24} color={colors.secondary} />
                </TouchableOpacity>
              </View>

              {selectedMemberForStatement && (
                <View style={styles.statementStatsContainer}>
                  <View style={styles.statementStatItem}>
                    <Text style={styles.statementStatLabel}>Deposits</Text>
                    <Text style={[styles.statementStatValue, styles.depositAmount]}>
                      MK{getMemberTotalDeposits(selectedMemberForStatement.id).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.statementStatDivider} />
                  <View style={styles.statementStatItem}>
                    <Text style={styles.statementStatLabel}>Withdrawals</Text>
                    <Text style={[styles.statementStatValue, styles.withdrawalAmount]}>
                      MK{getMemberTotalWithdrawals(selectedMemberForStatement.id).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.statementStatDivider} />
                  <View style={styles.statementStatItem}>
                    <Text style={styles.statementStatLabel}>Social</Text>
                    <Text style={[styles.statementStatValue, styles.socialAmount]}>
                      MK{getMemberTotalSocial(selectedMemberForStatement.id).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.statementStatDivider} />
                  <View style={styles.statementStatItem}>
                    <Text style={styles.statementStatLabel}>Balance</Text>
                    <Text style={[styles.statementStatValue, styles.balanceAmount]}>
                      MK{getMemberBalance(selectedMemberForStatement.id).toLocaleString()}
                    </Text>
                  </View>
                </View>
              )}

              <Text style={styles.statementTransactionHistoryTitle}>Transaction History</Text>
              <FlatList
                data={memberTransactions}
                renderItem={renderStatementTransaction}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.statementTransactionList}
                ListEmptyComponent={
                  <View style={styles.statementEmptyState}>
                    <Text style={styles.statementEmptyIcon}>📭</Text>
                    <Text style={styles.statementEmptyText}>No transactions found</Text>
                  </View>
                }
                showsVerticalScrollIndicator={false}
              />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Savings Collection</Text>
        <TouchableOpacity
          style={styles.headerStatementButton}
          onPress={() => setActiveView('statement')}
          activeOpacity={0.7}
        >
          <Icon name="document-text-outline" size={20} color="#FFFFFF" />
          <Text style={styles.headerStatementText}>Statement</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.subtitleContainer}>
        <Text style={styles.subtitle}>Manage member savings, withdrawals, and social contributions</Text>
      </View>

      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, styles.depositSummary]}>
          <Text style={styles.summaryLabel}>Deposits</Text>
          <Text style={[styles.summaryValue, styles.depositAmount]}>
            MK{totalDeposits.toLocaleString()}
          </Text>
        </View>
        <View style={[styles.summaryCard, styles.withdrawalSummary]}>
          <Text style={styles.summaryLabel}>Withdrawals</Text>
          <Text style={[styles.summaryValue, styles.withdrawalAmount]}>
            MK{totalWithdrawals.toLocaleString()}
          </Text>
        </View>
        <View style={[styles.summaryCard, styles.socialSummary]}>
          <Text style={styles.summaryLabel}>Social Fund</Text>
          <Text style={[styles.summaryValue, styles.socialAmount]}>
            MK{totalSocial.toLocaleString()}
          </Text>
        </View>
        <View style={[styles.summaryCard, styles.balanceSummary]}>
          <Text style={styles.summaryLabel}>Balance</Text>
          <Text style={[styles.summaryValue, styles.balanceAmount]}>
            MK{balance.toLocaleString()}
          </Text>
        </View>
      </View>

      <View style={styles.tabContainer}>
        {['deposits', 'withdrawals', 'social', 'history', 'statement'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeView === tab && styles.activeTab]}
            onPress={() => {
              setActiveView(tab as ViewType);
              if (tab === 'social') {
                setSocialSubView('list');
                setSocialSelectedMember(null);
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeView === tab && styles.activeTabText]}>
              {tab === 'social' ? 'Social' : tab === 'statement' ? 'Statement' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {getViewLabel()}: MK{getTotalForView().toLocaleString()}
        </Text>
        <Text style={styles.statsCount}>
          {filteredTransactions.length} transactions
        </Text>
      </View>

      <View style={styles.actionContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
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
        {(activeView === 'deposits' || activeView === 'withdrawals') && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setTransactionType(activeView === 'withdrawals' ? 'withdrawal' : 'deposit');
              setShowAddModal(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyText}>No transactions found</Text>
          </View>
        }
      />

      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowAddModal(false);
          setSelectedMember(null);
          setAmount('');
          setNotes('');
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Record {transactionType === 'deposit' ? 'Deposit' : 'Withdrawal'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddModal(false);
                  setSelectedMember(null);
                  setAmount('');
                  setNotes('');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    transactionType === 'deposit' && styles.selectedTypeButton,
                  ]}
                  onPress={() => setTransactionType('deposit')}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.typeButtonText,
                    transactionType === 'deposit' && styles.selectedTypeText,
                  ]}>
                    💰 Deposit/Share's
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    transactionType === 'withdrawal' && styles.selectedTypeButton,
                  ]}
                  onPress={() => setTransactionType('withdrawal')}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.typeButtonText,
                    transactionType === 'withdrawal' && styles.selectedTypeText,
                  ]}>
                    💸 Withdrawal
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Member *</Text>
                <TouchableOpacity
                  style={styles.memberSelector}
                  onPress={() => setShowMemberSelector(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.memberSelectorText, !selectedMember && styles.placeholderText]}>
                    {selectedMember?.full_name || 'Select a member'}
                  </Text>
                  <Text style={styles.memberSelectorArrow}>▼</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Amount (MK) *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="Enter amount"
                  keyboardType="numeric"
                  placeholderTextColor={colors.secondary}
                />
              </View>

              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Notes</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalTextArea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add notes (optional)"
                  placeholderTextColor={colors.secondary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <Text style={styles.socialHint}>Reference number is generated automatically</Text>

              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.disabledButton]}
                onPress={handleAddTransaction}
                disabled={isSubmitting}
                activeOpacity={0.7}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    Record {transactionType === 'deposit' ? 'Deposit' : 'Withdrawal'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showMemberSelector}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMemberSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Member</Text>
              <TouchableOpacity
                onPress={() => setShowMemberSelector(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={members}
              renderItem={renderMemberCard}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.memberList}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

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
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.primary,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerStatementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  headerStatementText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  headerBackToSavings: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  headerBackToSavingsText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  subtitleContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: colors.secondary,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 6,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  depositSummary: {
    backgroundColor: '#d1fae5',
    borderColor: '#a7f3d0',
  },
  withdrawalSummary: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
  },
  socialSummary: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  balanceSummary: {
    backgroundColor: '#dbeafe',
    borderColor: '#bfdbfe',
  },
  summaryLabel: {
    fontSize: 9,
    color: colors.secondary,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 2,
  },
  depositAmount: {
    color: '#059669',
  },
  withdrawalAmount: {
    color: '#dc2626',
  },
  socialAmount: {
    color: '#d97706',
  },
  balanceAmount: {
    color: '#1d4ed8',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginRight: 2,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 12,
    color: colors.secondary,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '600',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statsText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
  },
  socialTapHint: {
    fontSize: 11,
    color: colors.secondary,
    textAlign: 'center',
    marginTop: -8,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  statsCount: {
    fontSize: 12,
    color: colors.secondary,
  },
  actionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginVertical: 8,
  },
  searchBar: {
    flex: 1,
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
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  transactionCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  transactionSocialLabel: {
    fontSize: 10,
    color: '#d97706',
    fontWeight: '600',
    marginTop: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  transactionIconText: {
    fontSize: 16,
  },
  transactionMember: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  transactionDate: {
    fontSize: 11,
    color: colors.secondary,
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  transactionNotes: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 4,
    marginLeft: 46,
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
    paddingBottom: 8,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 6,
  },
  typeButton: {
    flex: 1,
    padding: 8,
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

  socialFormContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  socialSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  socialSummaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  socialSummaryIconText: {
    fontSize: 24,
  },
  socialSummaryLabel: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '500',
  },
  socialSummaryAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#92400e',
  },
  socialFormCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  socialFormTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  socialFormSubtitle: {
    fontSize: 13,
    color: colors.secondary,
    marginBottom: 16,
  },
  socialField: {
    marginBottom: 14,
  },
  socialLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 6,
  },
  socialInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
  },
  socialTextArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  socialAmountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  socialCurrencyPrefix: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  socialAmountInput: {
    flex: 1,
    padding: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: 'transparent',
  },
  socialHint: {
    fontSize: 11,
    color: colors.secondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  socialSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.background,
  },
  socialSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  socialMemberAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  socialMemberAvatarSmallText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  socialSelectorText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  socialSelectorSubtext: {
    fontSize: 11,
    color: colors.secondary,
  },
  socialSelectorPlaceholder: {
    fontSize: 15,
    color: colors.secondary,
  },
  socialSubmitButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  socialSubmitDisabled: {
    opacity: 0.6,
  },
  socialSubmitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  socialRecentContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  socialRecentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  socialRecentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  socialRecentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  socialRecentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  socialRecentAvatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#d97706',
  },
  socialRecentName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  socialRecentDesc: {
    fontSize: 12,
    color: colors.secondary,
  },
  socialRecentRight: {
    alignItems: 'flex-end',
  },
  socialRecentAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d97706',
  },
  socialRecentDate: {
    fontSize: 11,
    color: colors.secondary,
    marginTop: 2,
  },

  statementSummaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statementSummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  statementSummaryLabel: {
    fontSize: 11,
    color: colors.secondary,
    fontWeight: '500',
  },
  statementSummaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 2,
  },
  statementSummaryDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  statementListContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statementMemberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statementMemberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statementMemberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statementMemberAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statementMemberDetails: {
    flex: 1,
  },
  statementMemberName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  statementMemberPhone: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 2,
  },
  statementMemberStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statementMemberStat: {
    alignItems: 'flex-end',
  },
  statementMemberStatLabel: {
    fontSize: 9,
    color: colors.secondary,
  },
  statementMemberStatValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  positive: {
    color: '#059669',
  },
  negative: {
    color: '#dc2626',
  },
  statementModalContent: {
    maxHeight: '90%',
  },
  statementModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statementModalAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statementModalAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statementModalName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  statementModalPhone: {
    fontSize: 12,
    color: colors.secondary,
  },
  statementStatsContainer: {
    flexDirection: 'row',
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statementStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  statementStatLabel: {
    fontSize: 9,
    color: colors.secondary,
    textTransform: 'uppercase',
  },
  statementStatValue: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
  statementStatDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  statementTransactionHistoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  statementTransactionList: {
    paddingBottom: 20,
  },
  statementTransactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statementTransactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statementTransactionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  statementTransactionIconText: {
    fontSize: 14,
  },
  statementTransactionType: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  statementTransactionDate: {
    fontSize: 10,
    color: colors.secondary,
    marginTop: 1,
  },
  statementTransactionNotes: {
    fontSize: 11,
    color: colors.secondary,
    marginTop: 1,
  },
  statementTransactionAmount: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  statementEmptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  statementEmptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statementEmptyText: {
    fontSize: 14,
    color: colors.secondary,
  },
});