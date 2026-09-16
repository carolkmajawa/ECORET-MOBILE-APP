// src/screens/GroupLedgerScreen.tsx - COMPLETE FIXED
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../theme/colors';
import { groupAPI } from '../api/endpoints';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface LedgerEntry {
  id: string;
  transaction_type: string;
  transaction_type_display: string;
  amount: number;
  balance: number;
  member_name?: string;
  description?: string;
  recorded_at: string;
  is_verified: boolean;
  is_auto_generated?: boolean;
  source_model?: string;
}

interface LedgerSummary {
  total_balance: number;
  total_income: number;
  total_expenses: number;
  total_savings: number;
  total_social_fund: number;
  total_loans_disbursed: number;
  total_loans_repaid: number;
  total_penalties: number;
  total_fines: number;
  total_withdrawals?: number;
  member_count: number;
  transaction_count: number;
}

interface GroupMember {
  id: string;
  full_name: string;
  phone_number: string;
}

export default function GroupLedgerScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [groupId, setGroupId] = useState<string>('');
  const [groupName, setGroupName] = useState<string>('');
  const [saving, setSaving] = useState(false);
  
  const [newEntry, setNewEntry] = useState({
    transaction_type: 'expense',
    amount: '',
    description: '',
    member_id: '',
  });
  
  const [filter, setFilter] = useState({
    transaction_type: '',
  });

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const groupsResponse = await groupAPI.getGroups();
      let groupsData = [];
      if (Array.isArray(groupsResponse.data)) {
        groupsData = groupsResponse.data;
      } else if (groupsResponse.data?.results) {
        groupsData = groupsResponse.data.results;
      }
      
      if (groupsData.length > 0) {
        const group = groupsData[0];
        setGroupId(group.id);
        setGroupName(group.group_name || 'Group');
        
        await loadMembers(group.id);
        await loadLedgerEntries(group.id);
        await loadLedgerSummary(group.id);
      }
      
    } catch (error: any) {
      console.error('Error loading ledger:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (groupId: string) => {
    try {
      const response = await groupAPI.getMembers(groupId);
      setMembers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setMembers([]);
    }
  };

  const loadLedgerEntries = async (groupId: string) => {
    try {
      const response = await groupAPI.getLedgerEntries(groupId);
      let entriesData = [];
      if (Array.isArray(response.data)) {
        entriesData = response.data;
      } else if (response.data?.results) {
        entriesData = response.data.results;
      }
      setEntries(entriesData);
    } catch (error) {
      setEntries([]);
    }
  };

  const loadLedgerSummary = async (groupId: string) => {
    try {
      const response = await groupAPI.getLedgerSummary(groupId);
      setSummary(response.data);
    } catch (error) {
      setSummary(null);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAddEntry = async () => {
    if (!groupId) {
      Alert.alert('Error', 'No group found');
      return;
    }

    const amount = parseFloat(newEntry.amount);
    if (!newEntry.amount || isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      setSaving(true);
      const memberId = newEntry.member_id || undefined;
      
      await groupAPI.addLedgerEntry(groupId, {
        group: groupId,
        transaction_type: newEntry.transaction_type,
        amount: amount,
        description: newEntry.description || undefined,
        member: memberId,
      });
      
      Alert.alert('✅ Success', 'Ledger entry added successfully');
      setShowAddModal(false);
      setNewEntry({
        transaction_type: 'expense',
        amount: '',
        description: '',
        member_id: '',
      });
      await loadData();
      
    } catch (error: any) {
      Alert.alert('Error', 'Failed to add ledger entry');
    } finally {
      setSaving(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      'savings_contribution': 'trending-up',
      'social_contribution': 'people',
      'loan_disbursement': 'cash-outline',
      'loan_repayment': 'cash',
      'loan_interest': 'trending-up',
      'late_fee': 'alert-circle',
      'meeting_fine': 'alert-circle',
      'expense': 'receipt-outline',
      'income': 'trending-up',
      'transfer': 'swap-horizontal',
      'refund': 'refresh',
      'deposit': 'trending-up',
      'withdrawal': 'arrow-down',
    };
    return icons[type] || 'document-text-outline';
  };

  const getTransactionColor = (type: string) => {
    const colorMap: { [key: string]: string } = {
      'savings_contribution': '#4CAF50',
      'social_contribution': '#2196F3',
      'loan_disbursement': '#FF5722',
      'loan_repayment': '#4CAF50',
      'loan_interest': '#FF9800',
      'late_fee': '#FF6B00',
      'meeting_fine': '#FF6B00',
      'expense': '#FF5722',
      'income': '#4CAF50',
      'transfer': '#9C27B0',
      'refund': '#2196F3',
      'deposit': '#4CAF50',
      'withdrawal': '#F44336',
    };
    return colorMap[type] || '#666';
  };

  const formatCurrency = (amount: number) => {
    if (amount === undefined || amount === null) return 'MK 0.00';
    return `MK ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch (e) {
      return dateString;
    }
  };

  const getSourceLabel = (source: string) => {
    const sourceMap: { [key: string]: string } = {
      'savings': '💰 Savings',
      'social': '🤝 Social Fund',
      'loan': '💸 Loan',
      'loan_repayment': '💵 Repayment',
      'attendance': '📋 Attendance',
      'participation': '📋 Meeting',
      'loan_late_fee': '⚠️ Late Fee',
    };
    return sourceMap[source] || '📝 Manual';
  };

  const renderSummaryCard = () => {
    if (!summary) {
      return (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Financial Summary</Text>
          <Text style={styles.summaryEmptyText}>No data available</Text>
        </View>
      );
    }

    return (
      <View style={styles.summaryContainer}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>Financial Summary</Text>
          <Text style={styles.summaryDate}>Updated: {new Date().toLocaleDateString()}</Text>
        </View>
      
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Balance</Text>
            <Text style={[styles.summaryValue, styles.balancePositive]}>
              {formatCurrency(summary.total_balance || 0)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Transactions</Text>
            <Text style={styles.summaryValue}>{summary.transaction_count || 0}</Text>
          </View>
        </View>
      
        <View style={styles.summaryGrid}>
          <View style={styles.summaryGridItem}>
            <Text style={styles.summaryGridLabel}>💰 Savings</Text>
            <Text style={styles.summaryGridValue}>
              {formatCurrency(summary.total_savings || 0)}
            </Text>
          </View>
          <View style={styles.summaryGridItem}>
            <Text style={styles.summaryGridLabel}>💸 Withdrawals</Text>
            <Text style={[styles.summaryGridValue, styles.expenseNegative]}>
              {formatCurrency(summary.total_withdrawals || 0)}
            </Text>
          </View>
          <View style={styles.summaryGridItem}>
            <Text style={styles.summaryGridLabel}>⚠️ Penalties</Text>
            <Text style={[styles.summaryGridValue, styles.penaltyColor]}>
              {formatCurrency(summary.total_penalties || 0)}
            </Text>
          </View>
          <View style={styles.summaryGridItem}>
            <Text style={styles.summaryGridLabel}>🤝 Social Fund</Text>
            <Text style={styles.summaryGridValue}>
              {formatCurrency(summary.total_social_fund || 0)}
            </Text>
          </View>
          <View style={styles.summaryGridItem}>
            <Text style={styles.summaryGridLabel}>📤 Expenses</Text>
            <Text style={[styles.summaryGridValue, styles.expenseNegative]}>
              {formatCurrency(summary.total_expenses || 0)}
            </Text>
          </View>
          <View style={styles.summaryGridItem}>
            <Text style={styles.summaryGridLabel}>💵 Loans Repaid</Text>
            <Text style={[styles.summaryGridValue, styles.incomePositive]}>
              {formatCurrency(summary.total_loans_repaid || 0)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderEntryItem = (item: LedgerEntry) => {
    if (!item) return null;
    
    const isDebit = ['expense', 'loan_disbursement', 'late_fee', 'meeting_fine', 'withdrawal'].includes(item.transaction_type);
    const isPenalty = ['late_fee', 'meeting_fine'].includes(item.transaction_type);
    
    return (
      <View key={item.id} style={styles.entryItem}>
        <View style={styles.entryLeft}>
          <View style={[styles.entryIcon, { backgroundColor: getTransactionColor(item.transaction_type) + '20' }]}>
            <Icon name={getTransactionIcon(item.transaction_type)} size={24} color={getTransactionColor(item.transaction_type)} />
          </View>
          <View style={styles.entryInfo}>
            <View style={styles.entryTitleRow}>
              <Text style={styles.entryTitle}>{item.transaction_type_display || item.transaction_type}</Text>
              {isPenalty && (
                <View style={styles.penaltyBadge}>
                  <Text style={styles.penaltyBadgeText}>⚠️ Penalty</Text>
                </View>
              )}
            </View>
            {item.member_name && (
              <Text style={styles.entryMember}>{item.member_name}</Text>
            )}
            {item.description && (
              <Text style={styles.entryDescription}>{item.description}</Text>
            )}
            <View style={styles.entryMeta}>
              <Text style={styles.entryDate}>{formatDate(item.recorded_at)}</Text>
              {item.is_auto_generated && (
                <View style={styles.autoBadge}>
                  <Icon name="sync" size={10} color="#2196F3" />
                  <Text style={styles.autoBadgeText}>Auto</Text>
                </View>
              )}
              {item.source_model && (
                <Text style={styles.sourceText}>{getSourceLabel(item.source_model)}</Text>
              )}
            </View>
          </View>
        </View>
        <View style={styles.entryRight}>
          <Text style={[
            styles.entryAmount,
            isDebit ? styles.entryAmountNegative : styles.entryAmountPositive
          ]}>
            {isDebit ? '-' : '+'}{formatCurrency(item.amount || 0)}
          </Text>
          <Text style={styles.entryBalance}>Balance: {formatCurrency(item.balance || 0)}</Text>
          {item.is_verified && (
            <View style={styles.verifiedBadge}>
              <Icon name="checkmark-circle" size={12} color="#4CAF50" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContent}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading ledger...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{groupName || 'Ledger'}</Text>
        <TouchableOpacity
          style={styles.headerAction}
          onPress={() => setShowFilterModal(true)}
          activeOpacity={0.7}
        >
          <Icon name="filter-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Icon name="information-circle" size={24} color={colors.primary} />
          <Text style={styles.infoBannerText}>
            ✅ Transactions from Savings, Loans, and Attendance are auto-recorded. Only expenses and income need manual entry.
          </Text>
        </View>

        {renderSummaryCard()}
        
        <View style={styles.entriesHeader}>
          <Text style={styles.entriesTitle}>Transactions</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.7}
          >
            <Icon name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="document-text-outline" size={60} color={colors.secondary} />
            <Text style={styles.emptyStateTitle}>No Transactions</Text>
            <Text style={styles.emptyStateText}>Add your first ledger entry</Text>
          </View>
        ) : (
          entries.map(renderEntryItem)
        )}
        
        <View style={styles.footer} />
      </ScrollView>

      {/* Add Entry Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Transaction</Text>
                <TouchableOpacity
                  onPress={() => setShowAddModal(false)}
                  activeOpacity={0.7}
                >
                  <Icon name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Type</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.typePicker}>
                      {[
                        { value: 'expense', label: '📤 Expense' },
                        { value: 'income', label: '📥 Income' },
                        { value: 'transfer', label: '🔄 Transfer' },
                        { value: 'refund', label: '↩️ Refund' },
                      ].map((type) => (
                        <TouchableOpacity
                          key={type.value}
                          style={[
                            styles.typeOption,
                            newEntry.transaction_type === type.value && styles.typeOptionSelected,
                          ]}
                          onPress={() => setNewEntry({ ...newEntry, transaction_type: type.value })}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.typeOptionText,
                            newEntry.transaction_type === type.value && styles.typeOptionTextSelected,
                          ]}>
                            {type.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Amount (MK)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newEntry.amount}
                    onChangeText={(text) => setNewEntry({ ...newEntry, amount: text })}
                    placeholder="0.00"
                    keyboardType="numeric"
                    placeholderTextColor={colors.secondary}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Description</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newEntry.description}
                    onChangeText={(text) => setNewEntry({ ...newEntry, description: text })}
                    placeholder="Enter description"
                    placeholderTextColor={colors.secondary}
                  />
                </View>

                {members.length > 0 && (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Member (Optional)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.memberPicker}>
                        <TouchableOpacity
                          style={[
                            styles.memberOption,
                            newEntry.member_id === '' && styles.memberOptionSelected,
                          ]}
                          onPress={() => setNewEntry({ ...newEntry, member_id: '' })}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.memberOptionText,
                            newEntry.member_id === '' && styles.memberOptionTextSelected,
                          ]}>
                            All
                          </Text>
                        </TouchableOpacity>
                        {members.map((member) => (
                          <TouchableOpacity
                            key={member.id}
                            style={[
                              styles.memberOption,
                              newEntry.member_id === member.id && styles.memberOptionSelected,
                            ]}
                            onPress={() => setNewEntry({ ...newEntry, member_id: member.id })}
                            activeOpacity={0.7}
                          >
                            <Text style={[
                              styles.memberOptionText,
                              newEntry.member_id === member.id && styles.memberOptionTextSelected,
                            ]}>
                              {member.full_name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={handleAddEntry}
                  disabled={saving}
                  activeOpacity={0.7}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>Add Entry</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filter</Text>
                <TouchableOpacity
                  onPress={() => setShowFilterModal(false)}
                  activeOpacity={0.7}
                >
                  <Icon name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Transaction Type</Text>
                  <View style={styles.filterOptions}>
                    {[
                      { value: '', label: 'All' },
                      { value: 'savings_contribution', label: 'Savings' },
                      { value: 'social_contribution', label: 'Social' },
                      { value: 'loan_disbursement', label: 'Loan' },
                      { value: 'loan_repayment', label: 'Repayment' },
                      { value: 'expense', label: 'Expense' },
                      { value: 'income', label: 'Income' },
                      { value: 'late_fee', label: 'Late Fee' },
                      { value: 'meeting_fine', label: 'Meeting Fine' },
                    ].map((type) => (
                      <TouchableOpacity
                        key={type.value}
                        style={[
                          styles.filterOption,
                          filter.transaction_type === type.value && styles.filterOptionSelected,
                        ]}
                        onPress={() => setFilter({ ...filter, transaction_type: type.value })}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.filterOptionText,
                          filter.transaction_type === type.value && styles.filterOptionTextSelected,
                        ]}>
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.applyFilterButton}
                  onPress={() => {
                    setShowFilterModal(false);
                    loadData();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.applyFilterButtonText}>Apply</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.clearFilterButton}
                  onPress={() => {
                    setFilter({ transaction_type: '' });
                    setShowFilterModal(false);
                    loadData();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.clearFilterButtonText}>Clear</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.secondary,
  },
  header: {
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
  headerAction: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    color: colors.secondary,
    lineHeight: 18,
  },
  summaryContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  summaryDate: {
    fontSize: 11,
    color: colors.secondary,
  },
  summaryEmptyText: {
    textAlign: 'center',
    color: colors.secondary,
    paddingVertical: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryItem: {
    flex: 1,
    padding: 12,
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.secondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  balancePositive: {
    color: colors.success,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryGridItem: {
    width: '48%',
    padding: 10,
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    marginBottom: 8,
  },
  summaryGridLabel: {
    fontSize: 11,
    color: colors.secondary,
    marginBottom: 2,
  },
  summaryGridValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  incomePositive: {
    color: colors.success,
  },
  expenseNegative: {
    color: colors.error,
  },
  penaltyColor: {
    color: '#FF6B00',
  },
  entriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  entriesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  entryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  entryLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  entryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  entryInfo: {
    flex: 1,
  },
  entryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  entryTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  penaltyBadge: {
    backgroundColor: '#FF6B00' + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  penaltyBadgeText: {
    fontSize: 9,
    color: '#FF6B00',
    fontWeight: '600',
  },
  entryMember: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  entryDescription: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 2,
  },
  entryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  entryDate: {
    fontSize: 11,
    color: colors.secondary,
  },
  autoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3' + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  autoBadgeText: {
    fontSize: 9,
    color: '#2196F3',
    fontWeight: '500',
  },
  sourceText: {
    fontSize: 10,
    color: colors.secondary,
    fontWeight: '400',
  },
  entryRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  entryAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  entryAmountPositive: {
    color: colors.success,
  },
  entryAmountNegative: {
    color: colors.error,
  },
  entryBalance: {
    fontSize: 11,
    color: colors.secondary,
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  verifiedText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '500',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.secondary,
    marginTop: 4,
  },
  footer: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    fontSize: 15,
    color: colors.text,
    minHeight: 44,
  },
  typePicker: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  typeOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  typeOptionSelected: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary,
  },
  typeOptionText: {
    fontSize: 13,
    color: colors.secondary,
  },
  typeOptionTextSelected: {
    color: colors.primary,
    fontWeight: '500',
  },
  memberPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
  },
  memberOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    marginBottom: 4,
  },
  memberOptionSelected: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary,
  },
  memberOptionText: {
    fontSize: 13,
    color: colors.secondary,
  },
  memberOptionTextSelected: {
    color: colors.primary,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterOptionSelected: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary,
  },
  filterOptionText: {
    fontSize: 12,
    color: colors.secondary,
  },
  filterOptionTextSelected: {
    color: colors.primary,
    fontWeight: '500',
  },
  applyFilterButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  applyFilterButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  clearFilterButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  clearFilterButtonText: {
    color: colors.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
});