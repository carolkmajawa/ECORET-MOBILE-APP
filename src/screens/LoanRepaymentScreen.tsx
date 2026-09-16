// src/screens/LoanRepaymentScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
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
  KeyboardAvoidingView,
  Platform,
  Modal,
  RefreshControl,
} from 'react-native';
import { colors } from '../theme/colors';
import { loanAPI, groupAPI, BASE_URL } from '../api/endpoints';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Loan {
  id: string;
  member_name: string;
  amount: number;
  balance: number;
  total_payable: number;
  total_paid: number;
  due_date: string;
  status: string;
  loan_type: string;
  purpose: string;
  interest_rate?: number;
  duration_months?: number;
  request_date?: string;
  approval_date?: string;
}

interface Repayment {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  transaction_reference: string;
  notes?: string;
  member_name?: string;
}

interface ECORETBankAccount {
  id: string;
  name: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  branch: string;
  bank_code?: string;
  account_type?: string;
  account_type_display?: string;
  balance: number;
  is_default: boolean;
  status: string;
  status_display: string;
}

type RepaymentTab = 'upcoming' | 'history' | 'ecoret';

// ============ CROSS-PLATFORM ALERT HELPER ============
// Alert.alert has no UI on Expo/React Native Web — it silently no-ops
// (or just console.warns), so any flow that depends on an Alert button's
// onPress (like a "Confirm" step gating an API call) will never fire on web.
// This wraps Alert.alert for native and falls back to window.confirm /
// window.alert on web so the same call sites work everywhere.
type CrossAlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

function crossAlert(title: string, message?: string, buttons?: CrossAlertButton[]) {
  if (Platform.OS === 'web') {
    const fullMessage = message ? `${title}\n\n${message}` : title;

    if (buttons && buttons.length > 1) {
      // Multi-button (e.g. Cancel / Confirm) -> map to window.confirm
      const proceed = window.confirm(fullMessage);
      const actionButton = buttons.find((b) => b.style !== 'cancel');
      const cancelButton = buttons.find((b) => b.style === 'cancel');
      if (proceed) {
        actionButton?.onPress?.();
      } else {
        cancelButton?.onPress?.();
      }
    } else {
      window.alert(fullMessage);
      buttons?.[0]?.onPress?.();
    }
    return;
  }

  Alert.alert(title, message, buttons as any);
}

export default function LoanRepaymentScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<RepaymentTab>('upcoming');

  // Group and loan data
  const [group, setGroup] = useState<any>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [repayments, setRepayments] = useState<Repayment[]>([]);

  // ECORET repayment
  const [ecoretAccounts, setEcoretAccounts] = useState<ECORETBankAccount[]>([]);
  const [selectedEcoretAccount, setSelectedEcoretAccount] = useState<ECORETBankAccount | null>(null);
  const [ecoretLoan, setEcoretLoan] = useState<Loan | null>(null);
  const [ecoretAmount, setEcoretAmount] = useState('');
  const [showEcoretAccountSelector, setShowEcoretAccountSelector] = useState(false);

  // Group repayment form
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Collapse state
  const [showCompleted, setShowCompleted] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // ============ LOAD REPAYMENTS ============
  const loadRepayments = async (loanId: string) => {
    try {
      console.log('📡 Fetching repayments for loan:', loanId);

      if (!loanId) {
        console.log('⚠️ No loan ID provided');
        setRepayments([]);
        return;
      }

      const response = await loanAPI.getLoanRepayments(loanId);
      console.log('📊 Repayments response status:', response.status);

      if (response.data) {
        let repaymentData = [];
        if (Array.isArray(response.data)) {
          repaymentData = response.data;
        } else if (response.data.results) {
          repaymentData = response.data.results;
        }

        console.log(`📊 Found ${repaymentData.length} repayments in response`);

        if (repaymentData.length > 0) {
          const mappedRepayments = repaymentData.map((r: any) => ({
            id: r.id || `repay-${Date.now()}`,
            amount: parseFloat(r.amount) || 0,
            payment_date: r.payment_date || r.created_at || new Date().toISOString(),
            payment_method: r.payment_method || 'cash',
            transaction_reference: r.transaction_reference || '',
            notes: r.notes || '',
            member_name: r.member_name || 'Unknown',
          }));

          setRepayments(mappedRepayments);
          console.log(`✅ Loaded ${mappedRepayments.length} repayments`);
        } else {
          console.log('ℹ️ No repayments found for this loan');
          setRepayments([]);
        }
      }
    } catch (error: any) {
      console.error('❌ Error loading repayments:', error);
      setRepayments([]);
    }
  };

  // ============ LOAD DATA ============
  const loadData = async () => {
    try {
      setLoading(true);
      console.log('📡 Loading repayment data...');

      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        crossAlert('Authentication Error', 'Please log in again.');
        setLoading(false);
        return;
      }

      const groupsResponse = await groupAPI.getGroups();
      let groupsData = [];
      if (Array.isArray(groupsResponse.data)) {
        groupsData = groupsResponse.data;
      } else if (groupsResponse.data.results) {
        groupsData = groupsResponse.data.results;
      }

      if (groupsData.length > 0) {
        setGroup(groupsData[0]);
        await loadLoansForGroup(groupsData[0].id);
        await loadEcoretAccounts();
      } else {
        crossAlert('No Group', 'You are not assigned to any group. Please contact the administrator.');
      }
    } catch (error) {
      console.error('❌ Error loading data:', error);
      crossAlert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ============ LOAD LOANS FOR GROUP ============
  const loadLoansForGroup = async (groupId: string) => {
    try {
      console.log('📡 Fetching loans for group:', groupId);
      // getAllLoans() follows pagination and returns every loan, not just page 1.
      // Using the raw getLoans() here previously meant any loan sitting past the
      // first page (e.g. an already-active ECORET loan) was silently invisible.
      const loansData: any[] = await loanAPI.getAllLoans();

      const groupLoans = loansData.filter((loan: any) => {
        const loanGroup = loan.group || loan.group_id || loan.groupId || loan.group_name || '';
        return loanGroup === groupId;
      });

      console.log(`📊 Found ${groupLoans.length} loans for group`);

      const mappedLoans: Loan[] = groupLoans.map((loan: any) => ({
        id: loan.id,
        member_name: loan.member_name || 'Unknown Member',
        amount: parseFloat(loan.amount) || 0,
        balance: parseFloat(loan.balance) || parseFloat(loan.amount) || 0,
        total_payable: parseFloat(loan.total_payable) || 0,
        total_paid: parseFloat(loan.total_paid) || 0,
        due_date: loan.due_date || '',
        status: loan.status || 'pending',
        loan_type: loan.loan_type || 'group_loan',
        purpose: loan.purpose || '',
        interest_rate: parseFloat(loan.interest_rate) || 0,
        duration_months: loan.duration_months || 0,
        request_date: loan.request_date || loan.created_at || '',
        approval_date: loan.approval_date || '',
      }));

      setLoans(mappedLoans);

      // TEMP DEBUG — remove once the ECORET tab is confirmed working
      console.log(
        '🔍 All mapped loans (id / loan_type / status):',
        mappedLoans.map((l) => ({ id: l.id, loan_type: l.loan_type, status: l.status })),
      );
      console.log('🔍 Raw group loans from API (pre-mapping):', groupLoans);

      // Find ECORET loan
      const ecoretLoanData = mappedLoans.find(
        (l) =>
          l.loan_type === 'ecoret_loan' &&
          (l.status === 'active' || l.status === 'approved' || l.status === 'disbursed'),
      );
      if (ecoretLoanData) {
        setEcoretLoan(ecoretLoanData);
        await loadRepayments(ecoretLoanData.id);
      }

      // Update selected loan with new balance
      if (selectedLoan) {
        const updatedSelectedLoan = mappedLoans.find((l) => l.id === selectedLoan.id);
        if (updatedSelectedLoan) {
          setSelectedLoan(updatedSelectedLoan);
          await loadRepayments(updatedSelectedLoan.id);
        } else {
          const activeLoans = mappedLoans.filter(
            (l) =>
              (l.loan_type === 'group_loan' || l.loan_type === 'member_loan') &&
              (l.status === 'active' || l.status === 'approved' || l.status === 'disbursed'),
          );
          if (activeLoans.length > 0) {
            setSelectedLoan(activeLoans[0]);
            await loadRepayments(activeLoans[0].id);
          }
        }
      } else {
        const activeLoans = mappedLoans.filter(
          (l) =>
            (l.loan_type === 'group_loan' || l.loan_type === 'member_loan') &&
            (l.status === 'active' || l.status === 'approved' || l.status === 'disbursed'),
        );
        if (activeLoans.length > 0) {
          setSelectedLoan(activeLoans[0]);
          await loadRepayments(activeLoans[0].id);
        } else if (mappedLoans.length > 0) {
          setSelectedLoan(mappedLoans[0]);
          await loadRepayments(mappedLoans[0].id);
        }
      }

      console.log(`✅ Loaded ${mappedLoans.length} loans`);
    } catch (error) {
      console.error('❌ Error loading loans:', error);
    }
  };

  // ============ LOAD ECORET ACCOUNTS ============
  const loadEcoretAccounts = async () => {
    try {
      console.log('📡 Fetching ECORET accounts...');

      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(`${BASE_URL}/ecoret-accounts/`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();

      let accountsData = [];
      if (Array.isArray(data)) {
        accountsData = data;
      } else if (data.results && Array.isArray(data.results)) {
        accountsData = data.results;
      }

      const mappedAccounts: ECORETBankAccount[] = accountsData.map((acc: any) => ({
        id: acc.id,
        name: acc.name || 'ECORET Account',
        bank_name: acc.bank_name || 'ECORET Bank',
        account_number: acc.account_number || 'N/A',
        account_name: acc.account_name || 'ECORET Microfinance',
        branch: acc.bank_branch || 'Main Branch',
        bank_code: acc.bank_code || '',
        account_type: acc.account_type || 'main',
        account_type_display: acc.account_type_display || 'Main Account',
        balance: parseFloat(acc.balance) || 0,
        is_default: acc.is_default || false,
        status: acc.status || 'active',
        status_display: acc.status_display || 'Active',
      }));

      setEcoretAccounts(mappedAccounts);

      if (mappedAccounts.length > 0) {
        const defaultAccount = mappedAccounts.find((a) => a.is_default) || mappedAccounts[0];
        setSelectedEcoretAccount(defaultAccount);
      }
    } catch (error: any) {
      console.error('❌ Error fetching ECORET accounts:', error);
    }
  };

  // ============ REFRESH ============
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (group) {
      await loadLoansForGroup(group.id);
    }
    setRefreshing(false);
  }, [group]);

  // ============ HANDLE LOAN SELECT ============
  const handleLoanSelect = async (loan: Loan) => {
    setSelectedLoan(loan);
    setAmount('');
    setReceiptNumber('');
    setNotes('');
    await loadRepayments(loan.id);
  };

  // ============ VALIDATE GROUP REPAYMENT ============
  const validateGroupRepayment = (): string | null => {
    if (!selectedLoan) {
      return 'Please select a loan to repay';
    }

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      return 'Please enter a valid repayment amount';
    }

    if (amountNum > selectedLoan.balance && selectedLoan.balance > 0) {
      return `Amount exceeds loan balance of MK${selectedLoan.balance.toLocaleString()}`;
    }

    if (!receiptNumber.trim()) {
      return 'Please enter a receipt number';
    }

    return null;
  };

  // ============ VALIDATE ECORET REPAYMENT ============
  const validateEcoretRepayment = (): string | null => {
    if (!ecoretLoan) {
      return 'No ECORET loan found for this group';
    }

    const amountNum = parseFloat(ecoretAmount);
    if (!amountNum || amountNum <= 0) {
      return 'Please enter a valid repayment amount';
    }

    if (amountNum > ecoretLoan.balance && ecoretLoan.balance > 0) {
      return `Amount exceeds loan balance of MK${ecoretLoan.balance.toLocaleString()}`;
    }

    if (!selectedEcoretAccount) {
      return 'Please select an ECORET bank account';
    }

    return null;
  };

  // ============ SUBMIT GROUP REPAYMENT (the actual API call) ============
  const submitGroupRepayment = async () => {
    try {
      setSubmitting(true);

      if (!selectedLoan) {
        crossAlert('Error', 'No loan selected');
        setSubmitting(false);
        return;
      }

      const amountNum = parseFloat(amount);

      const repaymentData = {
        amount: amountNum,
        payment_method: paymentMethod,
        transaction_reference: receiptNumber || `REC-${Date.now()}`,
        notes: notes || `Repayment by ${selectedLoan.member_name}`,
      };

      console.log('📤 Repayment data:', JSON.stringify(repaymentData, null, 2));

      const response = await loanAPI.recordRepayment(selectedLoan.id, repaymentData);

      console.log('📥 Response:', response.data);

      // Refresh the loan data to update balances
      if (group) {
        await loadLoansForGroup(group.id);
      }

      crossAlert(
        '✅ Repayment Recorded',
        `Repayment of MK${amountNum.toLocaleString()} for ${selectedLoan.member_name} has been recorded successfully.\n\nReceipt: ${
          receiptNumber || 'N/A'
        }`,
        [
          {
            text: 'OK',
            onPress: () => {
              setAmount('');
              setReceiptNumber('');
              setNotes('');
            },
          },
        ],
      );
    } catch (error: any) {
      console.error('❌ Error:', error);
      crossAlert('Error', error?.response?.data?.error || 'Failed to record repayment');
    } finally {
      setSubmitting(false);
    }
  };

  // ============ HANDLE GROUP REPAYMENT (validate -> confirm -> submit) ============
  const handleGroupRepayment = async () => {
    const validationError = validateGroupRepayment();
    if (validationError) {
      crossAlert('Validation Error', validationError);
      return;
    }

    const amountNum = parseFloat(amount);

    crossAlert(
      'Confirm Repayment',
      `You are about to record a repayment of MK${amountNum.toLocaleString()}\n\n` +
        `Member: ${selectedLoan?.member_name}\n` +
        `Current Balance: MK${selectedLoan?.balance.toLocaleString()}\n` +
        `Payment Method: ${paymentMethod === 'cash' ? 'Cash' : 'Bank Transfer'}\n` +
        `Receipt Number: ${receiptNumber || 'N/A'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: submitGroupRepayment },
      ],
    );
  };

  // ============ SUBMIT ECORET REPAYMENT (the actual API call) ============
  const submitEcoretRepayment = async () => {
    try {
      setSubmitting(true);

      if (!ecoretLoan) {
        crossAlert('Error', 'No ECORET loan found');
        setSubmitting(false);
        return;
      }

      const amountNum = parseFloat(ecoretAmount);

      const repaymentData = {
        amount: amountNum,
        payment_method: 'bank_transfer',
        notes: `ECORET loan repayment for ${group?.group_name}`,
        ecoret_account_id: selectedEcoretAccount?.id,
      };

      console.log('📤 ECORET Repayment data:', JSON.stringify(repaymentData, null, 2));

      const response = await loanAPI.recordRepayment(ecoretLoan.id, repaymentData);

      console.log('📥 Response:', response.data);

      // Refresh loan data
      if (group) {
        await loadLoansForGroup(group.id);
      }

      crossAlert(
        '✅ Repayment Recorded',
        `ECORET repayment of MK${amountNum.toLocaleString()} has been recorded successfully.\n\nTransaction Reference: ${
          response.data?.reference || 'N/A'
        }`,
        [
          {
            text: 'OK',
            onPress: () => {
              setEcoretAmount('');
            },
          },
        ],
      );
    } catch (error: any) {
      console.error('❌ Error:', error);
      crossAlert('Error', error?.response?.data?.error || 'Failed to record repayment');
    } finally {
      setSubmitting(false);
    }
  };

  // ============ HANDLE ECORET REPAYMENT (validate -> confirm -> submit) ============
  const handleEcoretRepayment = async () => {
    const validationError = validateEcoretRepayment();
    if (validationError) {
      crossAlert('Validation Error', validationError);
      return;
    }

    const amountNum = parseFloat(ecoretAmount);

    crossAlert(
      'Confirm ECORET Repayment',
      `You are about to repay MK${amountNum.toLocaleString()} to ECORET\n\n` +
        `Loan Balance: MK${ecoretLoan?.balance.toLocaleString()}\n` +
        `Due Date: ${ecoretLoan?.due_date ? new Date(ecoretLoan.due_date).toLocaleDateString() : 'N/A'}\n` +
        `Bank: ${selectedEcoretAccount?.bank_name}\n` +
        `Account: ${selectedEcoretAccount?.account_number}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: submitEcoretRepayment },
      ],
    );
  };

  // ============ HANDLE ECORET ACCOUNT SELECT ============
  const handleEcoretAccountSelect = (account: ECORETBankAccount) => {
    setSelectedEcoretAccount(account);
    setShowEcoretAccountSelector(false);
  };

  // ============ GET STATUS COLOR ============
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'approved':
      case 'disbursed':
        return colors.success;
      case 'completed':
        return colors.primary;
      case 'defaulted':
        return colors.error;
      case 'pending':
        return colors.warning;
      default:
        return colors.secondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'approved':
        return 'Approved';
      case 'disbursed':
        return 'Disbursed';
      case 'completed':
        return 'Completed ✅';
      case 'defaulted':
        return 'Defaulted';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  };

  // ============ RENDER UPCOMING LOANS ============
  const renderUpcomingLoans = () => {
    const groupLoans = loans.filter((l) => l.loan_type === 'group_loan' || l.loan_type === 'member_loan');
    const activeLoans = groupLoans.filter((l) => l.status !== 'completed');
    const completedLoans = groupLoans.filter((l) => l.status === 'completed');

    return (
      <ScrollView
        style={styles.tabContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeLoans.length === 0 && completedLoans.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>No Group Loans Found</Text>
            <Text style={styles.emptySubtext}>No member loans have been approved for this group yet.</Text>
          </View>
        ) : (
          <>
            {activeLoans.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Active Loans</Text>
                  <Text style={styles.sectionCount}>{activeLoans.length} loans</Text>
                </View>
                {activeLoans.map((loan) => (
                  <TouchableOpacity
                    key={loan.id}
                    style={[styles.loanCard, selectedLoan?.id === loan.id && styles.loanCardSelected]}
                    onPress={() => handleLoanSelect(loan)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.loanCardHeader}>
                      <Text style={styles.loanMemberName}>{loan.member_name}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(loan.status)}20` }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(loan.status) }]}>
                          {getStatusText(loan.status)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.loanPurpose} numberOfLines={2}>
                      {loan.purpose}
                    </Text>
                    <View style={styles.loanCardDetails}>
                      <View style={styles.loanDetailItem}>
                        <Text style={styles.loanDetailLabel}>Amount</Text>
                        <Text style={styles.loanDetailValue}>MK {loan.amount.toLocaleString()}</Text>
                      </View>
                      <View style={styles.loanDetailItem}>
                        <Text style={styles.loanDetailLabel}>Balance</Text>
                        <Text
                          style={[styles.loanDetailValue, { color: loan.balance > 0 ? colors.error : colors.success }]}
                        >
                          MK {loan.balance.toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.loanDetailItem}>
                        <Text style={styles.loanDetailLabel}>Due Date</Text>
                        <Text style={styles.loanDetailValue}>
                          {loan.due_date ? new Date(loan.due_date).toLocaleDateString() : 'N/A'}
                        </Text>
                      </View>
                    </View>
                    {selectedLoan?.id === loan.id && (
                      <View style={styles.selectedIndicator}>
                        <Text style={styles.selectedIndicatorText}>✓ Selected for repayment</Text>
                      </View>
                    )}
                    {loan.balance <= 0 && (
                      <View style={styles.paidBadge}>
                        <Text style={styles.paidBadgeText}>💰 Fully Paid</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </>
            )}

            {completedLoans.length > 0 && (
              <>
                <TouchableOpacity
                  style={styles.collapseHeader}
                  onPress={() => setShowCompleted(!showCompleted)}
                  activeOpacity={0.7}
                >
                  <View style={styles.collapseHeaderLeft}>
                    <Text style={styles.sectionTitle}>Completed Loans</Text>
                    <Text style={styles.sectionCount}>{completedLoans.length} loans</Text>
                  </View>
                  <Text style={styles.collapseArrow}>{showCompleted ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {showCompleted &&
                  completedLoans.map((loan) => (
                    <View key={loan.id} style={[styles.loanCard, styles.completedCard]}>
                      <View style={styles.loanCardHeader}>
                        <Text style={styles.loanMemberName}>{loan.member_name}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: `${colors.primary}20` }]}>
                          <Text style={[styles.statusText, { color: colors.primary }]}>✅ Completed</Text>
                        </View>
                      </View>
                      <Text style={styles.loanPurpose} numberOfLines={2}>
                        {loan.purpose}
                      </Text>
                      <View style={styles.loanCardDetails}>
                        <View style={styles.loanDetailItem}>
                          <Text style={styles.loanDetailLabel}>Amount</Text>
                          <Text style={styles.loanDetailValue}>MK {loan.amount.toLocaleString()}</Text>
                        </View>
                        <View style={styles.loanDetailItem}>
                          <Text style={styles.loanDetailLabel}>Paid</Text>
                          <Text style={[styles.loanDetailValue, { color: colors.success }]}>
                            MK {loan.total_paid.toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.loanDetailItem}>
                          <Text style={styles.loanDetailLabel}>Completed</Text>
                          <Text style={styles.loanDetailValue}>
                            {loan.approval_date ? new Date(loan.approval_date).toLocaleDateString() : 'N/A'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
              </>
            )}

            {selectedLoan && selectedLoan.balance > 0 && selectedLoan.status !== 'completed' && (
              <View style={styles.repaymentForm}>
                <Text style={styles.formTitle}>💰 Record Repayment</Text>
                <Text style={styles.formSubtitle}>
                  {selectedLoan.member_name} • Balance: MK {selectedLoan.balance.toLocaleString()}
                </Text>

                <View style={styles.fieldContainer}>
                  <Text style={[styles.label, styles.requiredLabel]}>Amount (MK)</Text>
                  <TextInput
                    style={styles.input}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="Enter repayment amount"
                    keyboardType="numeric"
                    placeholderTextColor={colors.secondary}
                  />
                  <Text style={styles.helperText}>Max: MK{selectedLoan.balance.toLocaleString()}</Text>
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={[styles.label, styles.requiredLabel]}>Payment Method</Text>
                  <View style={styles.methodRow}>
                    <TouchableOpacity
                      style={[styles.methodButton, paymentMethod === 'cash' && styles.methodButtonActive]}
                      onPress={() => setPaymentMethod('cash')}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[styles.methodButtonText, paymentMethod === 'cash' && styles.methodButtonTextActive]}
                      >
                        💵 Cash
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.methodButton, paymentMethod === 'bank_transfer' && styles.methodButtonActive]}
                      onPress={() => setPaymentMethod('bank_transfer')}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.methodButtonText,
                          paymentMethod === 'bank_transfer' && styles.methodButtonTextActive,
                        ]}
                      >
                        🏦 Bank Transfer
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={[styles.label, styles.requiredLabel]}>
                    {paymentMethod === 'cash' ? 'Receipt Number' : 'Transaction Reference'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={receiptNumber}
                    onChangeText={setReceiptNumber}
                    placeholder={paymentMethod === 'cash' ? 'Enter cash receipt number' : 'Enter transaction reference'}
                    placeholderTextColor={colors.secondary}
                  />
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Notes (Optional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Add any additional notes"
                    placeholderTextColor={colors.secondary}
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                  onPress={handleGroupRepayment}
                  disabled={submitting}
                  activeOpacity={0.7}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.submitButtonText}>Record Repayment</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {selectedLoan && selectedLoan.balance <= 0 && selectedLoan.status === 'completed' && (
              <View style={styles.paidMessage}>
                <Text style={styles.paidMessageIcon}>✅</Text>
                <Text style={styles.paidMessageText}>This loan has been fully paid!</Text>
                <Text style={styles.paidMessageSubtext}>
                  {selectedLoan.member_name} has completed repayment of MK{selectedLoan.amount.toLocaleString()}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    );
  };

  // ============ RENDER REPAYMENT HISTORY ============
  const renderRepaymentHistory = () => {
    return (
      <ScrollView
        style={styles.tabContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {repayments.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No Repayments</Text>
            <Text style={styles.emptySubtext}>No repayments have been recorded yet.</Text>
          </View>
        ) : (
          <>
            <View style={styles.historyHeader}>
              <View>
                <Text style={styles.sectionTitle}>Repayment History</Text>
                {selectedLoan && (
                  <Text style={styles.historyMemberName}>
                    {selectedLoan.member_name} • {selectedLoan.purpose}
                  </Text>
                )}
              </View>
              <View style={styles.historyTotalContainer}>
                <Text style={styles.historyTotalLabel}>Total Paid</Text>
                <Text style={styles.historyTotal}>
                  MK {repayments.reduce((sum, r) => sum + r.amount, 0).toLocaleString()}
                </Text>
              </View>
            </View>

            {repayments.map((repayment, index) => (
              <View key={repayment.id || index} style={styles.historyCard}>
                <View style={styles.historyCardHeader}>
                  <Text style={styles.historyAmount}>MK {repayment.amount.toLocaleString()}</Text>
                  <Text style={styles.historyDate}>
                    {repayment.payment_date ? new Date(repayment.payment_date).toLocaleDateString() : 'N/A'}
                  </Text>
                </View>
                <View style={styles.historyDetails}>
                  <View style={styles.historyDetailItem}>
                    <Text style={styles.historyDetailLabel}>Method:</Text>
                    <Text style={styles.historyDetailValue}>
                      {repayment.payment_method === 'cash' ? '💵 Cash' : '🏦 Bank Transfer'}
                    </Text>
                  </View>
                  {repayment.transaction_reference && (
                    <View style={styles.historyDetailItem}>
                      <Text style={styles.historyDetailLabel}>Reference:</Text>
                      <Text style={styles.historyDetailValue}>{repayment.transaction_reference}</Text>
                    </View>
                  )}
                </View>
                {repayment.notes && <Text style={styles.historyNotes}>📝 {repayment.notes}</Text>}
                <View style={styles.historyDivider} />
              </View>
            ))}
          </>
        )}
      </ScrollView>
    );
  };

  // ============ RENDER ECORET REPAYMENT ============
  const renderEcoretRepayment = () => {
    return (
      <ScrollView
        style={styles.tabContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {!ecoretLoan ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏛️</Text>
            <Text style={styles.emptyText}>No ECORET Loan</Text>
            <Text style={styles.emptySubtext}>Your group does not have an active ECORET loan.</Text>
          </View>
        ) : (
          <>
            <View style={styles.ecoretLoanCard}>
              <View style={styles.loanCardHeader}>
                <Text style={styles.ecoretLoanTitle}>ECORET Loan</Text>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(ecoretLoan.status)}20` }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(ecoretLoan.status) }]}>
                    {getStatusText(ecoretLoan.status)}
                  </Text>
                </View>
              </View>
              <Text style={styles.loanPurpose}>{ecoretLoan.purpose}</Text>
              <View style={styles.ecoretLoanDetails}>
                <View style={styles.loanDetailItem}>
                  <Text style={styles.loanDetailLabel}>Amount</Text>
                  <Text style={styles.loanDetailValue}>MK {ecoretLoan.amount.toLocaleString()}</Text>
                </View>
                <View style={styles.loanDetailItem}>
                  <Text style={styles.loanDetailLabel}>Balance</Text>
                  <Text
                    style={[styles.loanDetailValue, { color: ecoretLoan.balance > 0 ? colors.error : colors.success }]}
                  >
                    MK {ecoretLoan.balance.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.loanDetailItem}>
                  <Text style={styles.loanDetailLabel}>Due Date</Text>
                  <Text style={styles.loanDetailValue}>
                    {ecoretLoan.due_date ? new Date(ecoretLoan.due_date).toLocaleDateString() : 'N/A'}
                  </Text>
                </View>
              </View>
            </View>

            {ecoretLoan.balance > 0 && ecoretLoan.status !== 'completed' && (
              <View style={styles.repaymentForm}>
                <Text style={styles.formTitle}>🏛️ Repay ECORET Loan</Text>
                <Text style={styles.formSubtitle}>Balance: MK {ecoretLoan.balance.toLocaleString()}</Text>

                <View style={styles.fieldContainer}>
                  <Text style={[styles.label, styles.requiredLabel]}>ECORET Bank Account</Text>
                  <TouchableOpacity
                    style={styles.selectorButton}
                    onPress={() => setShowEcoretAccountSelector(true)}
                    activeOpacity={0.7}
                  >
                    <View>
                      <Text style={styles.selectorText}>{selectedEcoretAccount?.name || 'Select an account'}</Text>
                      <Text style={styles.selectorSubtext}>
                        {selectedEcoretAccount?.bank_name} - {selectedEcoretAccount?.account_number}
                      </Text>
                    </View>
                    <Text style={styles.arrowText}>▼</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={[styles.label, styles.requiredLabel]}>Amount (MK)</Text>
                  <TextInput
                    style={styles.input}
                    value={ecoretAmount}
                    onChangeText={setEcoretAmount}
                    placeholder="Enter repayment amount"
                    keyboardType="numeric"
                    placeholderTextColor={colors.secondary}
                  />
                  <Text style={styles.helperText}>Max: MK{ecoretLoan.balance.toLocaleString()}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                  onPress={handleEcoretRepayment}
                  disabled={submitting || !selectedEcoretAccount}
                  activeOpacity={0.7}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.submitButtonText}>Pay ECORET</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {ecoretLoan.balance <= 0 && ecoretLoan.status === 'completed' && (
              <View style={styles.paidMessage}>
                <Text style={styles.paidMessageIcon}>✅</Text>
                <Text style={styles.paidMessageText}>ECORET Loan Fully Paid!</Text>
                <Text style={styles.paidMessageSubtext}>
                  Your group has completed repayment of MK{ecoretLoan.amount.toLocaleString()}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    );
  };

  // ============ LOADING STATE ============
  if (loading) {
    return (
      <SafeAreaView style={styles.centerContent}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  // ============ MAIN RENDER ============
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>💰 Loan Repayments</Text>
            <Text style={styles.headerSubtitle}>{group?.group_name || 'Group'}</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
            onPress={() => setActiveTab('upcoming')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>📊 Upcoming</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.tabActive]}
            onPress={() => setActiveTab('history')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>📋 History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'ecoret' && styles.tabActive]}
            onPress={() => setActiveTab('ecoret')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'ecoret' && styles.tabTextActive]}>🏛️ ECORET</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'upcoming' && renderUpcomingLoans()}
        {activeTab === 'history' && renderRepaymentHistory()}
        {activeTab === 'ecoret' && renderEcoretRepayment()}

        {/* ECORET Account Selector Modal */}
        <Modal
          visible={showEcoretAccountSelector}
          transparent
          animationType="slide"
          onRequestClose={() => setShowEcoretAccountSelector(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select ECORET Account</Text>
                <TouchableOpacity onPress={() => setShowEcoretAccountSelector(false)} activeOpacity={0.7}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              {ecoretAccounts.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No ECORET accounts available</Text>
                </View>
              ) : (
                <ScrollView>
                  {ecoretAccounts.map((account) => (
                    <TouchableOpacity
                      key={account.id}
                      style={[styles.modalItem, selectedEcoretAccount?.id === account.id && styles.modalItemSelected]}
                      onPress={() => handleEcoretAccountSelect(account)}
                      activeOpacity={0.7}
                    >
                      <View>
                        <Text style={styles.modalItemText}>
                          {account.name}
                          {account.is_default && ' ⭐'}
                        </Text>
                        <Text style={styles.modalItemSubtext}>
                          {account.bank_name} - {account.account_number}
                        </Text>
                        <Text style={styles.modalItemSubtext}>{account.account_name}</Text>
                        <Text style={styles.modalItemSubtext}>Status: {account.status_display}</Text>
                      </View>
                      {selectedEcoretAccount?.id === account.id && <Text style={styles.modalItemCheck}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============ STYLES ============
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 24,
    color: colors.text,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.secondary,
  },
  headerSpacer: {
    width: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
  },
  tabTextActive: {
    color: '#fff',
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  sectionCount: {
    fontSize: 12,
    color: colors.secondary,
  },
  loanCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loanCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  completedCard: {
    opacity: 0.7,
  },
  loanCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  loanMemberName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  loanPurpose: {
    fontSize: 13,
    color: colors.secondary,
    marginBottom: 8,
  },
  loanCardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  loanDetailItem: {
    flex: 1,
  },
  loanDetailLabel: {
    fontSize: 10,
    color: colors.secondary,
    textTransform: 'uppercase',
  },
  loanDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  selectedIndicator: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.primary + '30',
  },
  selectedIndicatorText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  paidBadge: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.success + '30',
  },
  paidBadgeText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
  },
  collapseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  collapseHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  collapseArrow: {
    fontSize: 16,
    color: colors.secondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.secondary,
    textAlign: 'center',
    marginTop: 4,
  },
  repaymentForm: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 13,
    color: colors.secondary,
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  requiredLabel: {
    color: colors.text,
  },
  input: {
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
    color: colors.text,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 11,
    color: colors.secondary,
    marginTop: 4,
  },
  methodRow: {
    flexDirection: 'row',
    gap: 10,
  },
  methodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  methodButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  methodButtonText: {
    fontSize: 13,
    color: colors.secondary,
  },
  methodButtonTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  paidMessage: {
    backgroundColor: colors.success + '10',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  paidMessageIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  paidMessageText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.success,
  },
  paidMessageSubtext: {
    fontSize: 13,
    color: colors.secondary,
    textAlign: 'center',
    marginTop: 4,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    marginTop: 8,
  },
  historyMemberName: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 2,
  },
  historyTotalContainer: {
    alignItems: 'flex-end',
  },
  historyTotalLabel: {
    fontSize: 10,
    color: colors.secondary,
    textTransform: 'uppercase',
  },
  historyTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  historyDate: {
    fontSize: 12,
    color: colors.secondary,
  },
  historyDetails: {
    marginTop: 6,
  },
  historyDetailItem: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 2,
  },
  historyDetailLabel: {
    fontSize: 12,
    color: colors.secondary,
  },
  historyDetailValue: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  historyNotes: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 6,
    fontStyle: 'italic',
  },
  historyDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginTop: 8,
  },
  selectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectorText: {
    fontSize: 14,
    color: colors.text,
  },
  selectorSubtext: {
    fontSize: 11,
    color: colors.secondary,
    marginTop: 2,
  },
  arrowText: {
    fontSize: 16,
    color: colors.secondary,
  },
  ecoretLoanCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  ecoretLoanTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  ecoretLoanDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
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
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
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
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalItemSelected: {
    backgroundColor: colors.primary + '10',
  },
  modalItemText: {
    fontSize: 16,
    color: colors.text,
  },
  modalItemSubtext: {
    fontSize: 12,
    color: colors.secondary,
  },
  modalItemCheck: {
    fontSize: 18,
    color: colors.primary,
  },
});