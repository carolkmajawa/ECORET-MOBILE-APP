// src/screens/LoanRequestScreen.tsx - COMPLETE FIXED
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Alert,
  Modal,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { loanAPI, groupAPI } from '../api/endpoints';
import { colors } from '../theme/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Tab = 'new' | 'status' | 'members' | 'all';
type DisbursementMethod = 'cash' | 'bank_transfer' | 'mobile_money' | 'wait';

interface LoanRequestItem {
  id: string;
  amount: string;
  purpose: string;
  status: 'pending' | 'approved' | 'declined' | 'active' | 'completed';
  created_at: string;
  decision_notes?: string;
  due_date?: string;
  total_payable?: string;
  interest_rate?: string;
  member_name?: string;
  disbursement_method?: string;
  approved_amount?: string;
  document?: string;
}

interface MemberLoan {
  id: string;
  member: string;
  member_name: string;
  amount: string;
  purpose: string;
  status: string;
  request_date: string;
  interest_rate?: string;
  total_payable?: string;
}

interface MemberBankDetails {
  member_bank_details: {
    member_name: string;
    member_phone: string;
    bank_name: string;
    bank_account_name: string;
    bank_account_number: string;
    mobile_money_provider: string;
    mobile_money_number: string;
    has_bank_details: boolean;
    has_mobile_money: boolean;
  };
  loan_amount: number;
  loan_purpose: string;
}

// react-native-web's Alert.alert doesn't reliably support multi-button
// confirmations with onPress callbacks - use the browser's native
// confirm() on web, and RN's Alert on iOS/Android.
function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmLabel = 'OK'
) {
  if (Platform.OS === 'web') {
    const confirmed = window.confirm(`${title}\n\n${message}`);
    if (confirmed) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, onPress: onConfirm },
  ]);
}

export function LoanRequestScreen() {
  const navigation = useNavigation();
  const [tab, setTab] = useState<Tab>('members');

  // --- New request form state ---
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [supportingDocument, setSupportingDocument] = useState<{ uri: string; name: string; type: string } | null>(null);

  const MIN_NOTES_LENGTH = 200;

  // --- Status list state ---
  const [requests, setRequests] = useState<LoanRequestItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [listError, setListError] = useState('');

  // --- Member requests (group_loan, from USSD) state ---
  const [memberLoans, setMemberLoans] = useState<MemberLoan[]>([]);
  const [loadingMemberLoans, setLoadingMemberLoans] = useState(true);
  const [refreshingMembers, setRefreshingMembers] = useState(false);
  const [memberLoansError, setMemberLoansError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // --- All loans state ---
  const [allLoans, setAllLoans] = useState<LoanRequestItem[]>([]);
  const [loadingAllLoans, setLoadingAllLoans] = useState(true);
  const [refreshingAllLoans, setRefreshingAllLoans] = useState(false);
  const [allLoansError, setAllLoansError] = useState('');

  // --- Group info ---
  const [groupId, setGroupId] = useState<string | null>(null);

  // --- Disbursement modal state ---
  const [disbursementLoan, setDisbursementLoan] = useState<MemberLoan | null>(null);
  const [disbursementMethod, setDisbursementMethod] = useState<DisbursementMethod>('cash');
  const [bankDetails, setBankDetails] = useState<MemberBankDetails | null>(null);
  const [loadingBankDetails, setLoadingBankDetails] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [transferReference, setTransferReference] = useState('');
  const [mobileMoneyProvider, setMobileMoneyProvider] = useState<'airtel' | 'tnm'>('airtel');
  const [transactionId, setTransactionId] = useState('');
  const [mobileMoneyPin, setMobileMoneyPin] = useState('');
  const [waitReason, setWaitReason] = useState('');
  const [disbursing, setDisbursing] = useState(false);

  // ==================== REFERENCE AUTO-GENERATION ====================
  const generateReference = (prefix: string) =>
    `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

  // ==================== LOAD GROUP ID ====================
  const loadGroupId = async () => {
    try {
      const response = await groupAPI.getGroups();
      let groupsData = [];
      if (Array.isArray(response.data)) {
        groupsData = response.data;
      } else if (response.data?.results) {
        groupsData = response.data.results;
      }
      if (groupsData.length > 0) {
        setGroupId(groupsData[0].id);
      }
    } catch (error) {
      console.error('Error loading group:', error);
    }
  };

  // ==================== LOAD REQUESTS (ECORET) ====================
  const loadRequests = useCallback(async () => {
    try {
      setListError('');
      const { data } = await loanAPI.getLoanRequests();
      const results = Array.isArray(data) ? data : data.results;
      setRequests(results ?? []);
    } catch (err) {
      setListError('Could not load your loan requests.');
    }
  }, []);

  // ==================== LOAD MEMBER LOANS (GROUP LOANS - PENDING) ====================
  const loadMemberLoans = useCallback(async () => {
    try {
      setMemberLoansError('');
      console.log('📡 Fetching pending member loans...');

      const { data } = await loanAPI.getLoansFiltered({
        loan_type: 'group_loan',
        status: 'pending',
      });

      console.log('📊 Member loans response:', JSON.stringify(data, null, 2));

      let results = [];
      if (Array.isArray(data)) {
        results = data;
      } else if (data?.results) {
        results = data.results;
      }

      if (groupId && results.length > 0) {
        results = results.filter((loan: any) => {
          const loanGroup = loan.group || loan.group_id || loan.groupId;
          return loanGroup === groupId;
        });
      }

      const mappedLoans: MemberLoan[] = results.map((loan: any) => ({
        id: loan.id,
        member: loan.member,
        member_name: loan.member_name || 'Unknown Member',
        amount: loan.amount,
        purpose: loan.purpose || '',
        status: loan.status || 'pending',
        request_date: loan.created_at || loan.request_date || new Date().toISOString(),
        interest_rate: loan.interest_rate,
        total_payable: loan.total_payable,
      }));

      console.log(`📊 Found ${mappedLoans.length} pending member loans`);
      setMemberLoans(mappedLoans);

    } catch (error: any) {
      console.error('❌ Error loading member loans:', error);
      setMemberLoansError('Could not load member loan requests.');
    }
  }, [groupId]);

  // ==================== LOAD BANK DETAILS ====================
  const loadBankDetailsIfNeeded = async (loan: MemberLoan, method: DisbursementMethod) => {
    if (method !== 'bank_transfer' && method !== 'mobile_money') return;
    setLoadingBankDetails(true);
    try {
      const { data } = await loanAPI.getMemberBankDetails(loan.id);
      setBankDetails(data);
    } catch (err) {
      setBankDetails(null);
    } finally {
      setLoadingBankDetails(false);
    }
  };

  // ==================== HANDLE SELECT METHOD ====================
  const handleSelectMethod = async (method: DisbursementMethod) => {
    setDisbursementMethod(method);
    if (method === 'cash') setReceiptNumber(generateReference('RCPT'));
    if (method === 'bank_transfer') setTransferReference(generateReference('TXF'));
    if (disbursementLoan) {
      await loadBankDetailsIfNeeded(disbursementLoan, method);
    }
  };

  // ==================== RESET DISBURSEMENT FORM ====================
  const resetDisbursementForm = () => {
    setDisbursementMethod('cash');
    setBankDetails(null);
    setReceiptNumber('');
    setTransferReference('');
    setMobileMoneyProvider('airtel');
    setTransactionId('');
    setMobileMoneyPin('');
    setWaitReason('');
  };

  // ==================== OPEN DISBURSEMENT MODAL (with auto ref) ====================
  const openDisbursementModal = (loan: MemberLoan) => {
    setDisbursementLoan(loan);
    setDisbursementMethod('cash');
    setReceiptNumber(generateReference('RCPT'));
    setTransferReference(generateReference('TXF'));
  };

  // ==================== HANDLE CONFIRM DISBURSEMENT ====================
  const handleConfirmDisbursement = async () => {
    if (!disbursementLoan) return;

    setDisbursing(true);
    try {
      if (disbursementMethod === 'cash') {
        if (!receiptNumber.trim()) {
          Alert.alert('Error', 'Please enter a cash receipt number.');
          setDisbursing(false);
          return;
        }
        await loanAPI.chairmanDisburseCash(disbursementLoan.id, {
          receipt_number: receiptNumber.trim(),
        });
      } else if (disbursementMethod === 'bank_transfer') {
        if (!transferReference.trim()) {
          Alert.alert('Error', 'Please enter a transfer reference.');
          setDisbursing(false);
          return;
        }
        await loanAPI.chairmanDisburseBank(disbursementLoan.id, {
          transfer_reference: transferReference.trim(),
        });
      } else if (disbursementMethod === 'mobile_money') {
        if (!transactionId.trim()) {
          Alert.alert('Error', 'Please enter the mobile money transaction ID.');
          setDisbursing(false);
          return;
        }
        if (!mobileMoneyPin.trim()) {
          Alert.alert('Error', 'Please enter the PIN to confirm this disbursement.');
          setDisbursing(false);
          return;
        }
        await loanAPI.chairmanDisburseMobileMoney(disbursementLoan.id, {
          transaction_id: transactionId.trim(),
          mobile_money_provider: mobileMoneyProvider,
          pin: mobileMoneyPin.trim(),
        });
      } else if (disbursementMethod === 'wait') {
        if (!waitReason.trim()) {
          Alert.alert('Error', 'Please provide a reason for the delay.');
          setDisbursing(false);
          return;
        }
        await loanAPI.chairmanDisburseWait(disbursementLoan.id, {
          reason: waitReason.trim(),
        });
      }

      Alert.alert('✅ Success', 'Disbursement recorded successfully.');
      setDisbursementLoan(null);
      resetDisbursementForm();
      await Promise.all([loadMemberLoans(), loadAllLoans()]);
    } catch (err: any) {
      console.error('❌ Disbursement error:', err);
      const data = err?.response?.data;
      const message =
        data?.error ||
        (data && typeof data === 'object' ? Object.values(data)[0] : null) ||
        'Could not complete disbursement.';
      Alert.alert('Error', Array.isArray(message) ? message[0] : message);
    } finally {
      setDisbursing(false);
    }
  };

  // ==================== LOAD ALL LOANS ====================
  const loadAllLoans = useCallback(async () => {
    try {
      setAllLoansError('');
      console.log('📡 Fetching all group loans...');

      const { data } = await loanAPI.getLoansFiltered({
        loan_type: 'group_loan',
      });

      console.log('📊 All loans response:', JSON.stringify(data, null, 2));

      let results = [];
      if (Array.isArray(data)) {
        results = data;
      } else if (data?.results) {
        results = data.results;
      }

      if (groupId && results.length > 0) {
        results = results.filter((loan: any) => {
          const loanGroup = loan.group || loan.group_id || loan.groupId;
          return loanGroup === groupId;
        });
      }

      const mappedLoans: LoanRequestItem[] = results.map((loan: any) => ({
        id: loan.id,
        amount: loan.amount,
        purpose: loan.purpose || '',
        status: loan.status || 'pending',
        created_at: loan.created_at || loan.request_date || new Date().toISOString(),
        member_name: loan.member_name || 'Unknown Member',
        interest_rate: loan.interest_rate,
        total_payable: loan.total_payable,
        due_date: loan.due_date,
        disbursement_method: loan.disbursement_method,
      }));

      console.log(`📊 Found ${mappedLoans.length} total group loans`);
      setAllLoans(mappedLoans);

    } catch (error: any) {
      console.error('❌ Error loading all loans:', error);
      setAllLoansError('Could not load loans.');
    }
  }, [groupId]);

  // ==================== INITIAL LOAD ====================
  useEffect(() => {
    const loadAll = async () => {
      await loadGroupId();
      setLoadingRequests(true);
      setLoadingMemberLoans(true);
      setLoadingAllLoans(true);
      await Promise.all([loadRequests(), loadMemberLoans(), loadAllLoans()]);
      setLoadingRequests(false);
      setLoadingMemberLoans(false);
      setLoadingAllLoans(false);
    };
    loadAll();
  }, [loadRequests, loadMemberLoans, loadAllLoans]);

  // ==================== REFRESH FUNCTIONS ====================
  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const onRefreshMembers = async () => {
    setRefreshingMembers(true);
    await loadMemberLoans();
    setRefreshingMembers(false);
  };

  const onRefreshAllLoans = async () => {
    setRefreshingAllLoans(true);
    await loadAllLoans();
    setRefreshingAllLoans(false);
  };

  // ==================== HANDLE DECLINE - FIXED (web-safe confirm) ====================
  const handleDeclineMemberLoan = (loan: MemberLoan) => {
    console.log('🔴 Decline button clicked for loan:', loan.id);

    confirmAction(
      'Decline Loan Request',
      `Decline ${loan.member_name}'s request for MK ${Number(loan.amount).toLocaleString()}?`,
      async () => {
        console.log('🔴 User confirmed decline for loan:', loan.id);
        setProcessingId(loan.id);

        try {
          console.log(`📤 Calling declineLoan API for: ${loan.id}`);
          const response = await loanAPI.declineLoan(loan.id, {});
          console.log('📥 Decline response:', response.data);

          await Promise.all([loadMemberLoans(), loadAllLoans()]);
          Alert.alert('✅ Success', 'Loan request declined successfully');
        } catch (err: any) {
          console.error('❌ Error declining loan:', err);
          let errorMsg = 'Could not decline loan.';
          if (err?.response?.data?.error) {
            errorMsg = err.response.data.error;
          } else if (err?.response?.data?.message) {
            errorMsg = err.response.data.message;
          } else if (err?.message) {
            errorMsg = err.message;
          }
          Alert.alert('Error', errorMsg);
        } finally {
          setProcessingId(null);
        }
      },
      'Decline'
    );
  };

  // ==================== HANDLE APPROVE - FIXED (web-safe confirm) ====================
  const handleApproveMemberLoan = (loan: MemberLoan) => {
    console.log('🟢 Approve button clicked for loan:', loan.id);

    confirmAction(
      'Approve Loan Request',
      `Approve ${loan.member_name}'s request for MK ${Number(loan.amount).toLocaleString()}?`,
      async () => {
        console.log('🟢 User confirmed approve for loan:', loan.id);
        setProcessingId(loan.id);

        try {
          console.log(`📤 Calling approveLoan API for: ${loan.id}`);
          const response = await loanAPI.approveLoan(loan.id, {});
          console.log('📥 Approve response:', response.data);

          await Promise.all([loadMemberLoans(), loadAllLoans()]);
          Alert.alert('✅ Success', 'Loan approved successfully!');
        } catch (err: any) {
          console.error('❌ Error approving loan:', err);
          let errorMsg = 'Could not approve loan.';
          if (err?.response?.data?.error) {
            errorMsg = err.response.data.error;
          } else if (err?.response?.data?.message) {
            errorMsg = err.response.data.message;
          } else if (err?.message) {
            errorMsg = err.message;
          }
          Alert.alert('Error', errorMsg);
        } finally {
          setProcessingId(null);
        }
      },
      'Approve'
    );
  };

  // ==================== DOCUMENT PICKER ====================
  const pickSupportingDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        setSupportingDocument({
          uri: asset.uri,
          name: asset.name || 'document',
          type: asset.mimeType || 'application/octet-stream',
        });
      }
    } catch (error) {
      console.error('Document pick error:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  // ==================== SUBMIT LOAN REQUEST ====================
  const handleSubmit = async () => {
    setFormError('');

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setFormError('Please enter a valid loan amount.');
      return;
    }
    if (!purpose.trim()) {
      setFormError('Please describe the purpose of this loan.');
      return;
    }
    if (notes.trim().length < MIN_NOTES_LENGTH) {
      setFormError(
        `Additional notes are required and must be at least ${MIN_NOTES_LENGTH} characters (currently ${notes.trim().length}).`
      );
      return;
    }

    setSubmitting(true);
    try {
      if (supportingDocument) {
        const formData = new FormData();
        formData.append('amount', String(parsedAmount));
        formData.append('purpose', purpose.trim());
        formData.append('notes', notes.trim());

        if (Platform.OS === 'web') {
          const fileResponse = await fetch(supportingDocument.uri);
          const blob = await fileResponse.blob();
          const file = new File([blob], supportingDocument.name, { type: supportingDocument.type });
          formData.append('document', file);
        } else {
          formData.append('document', {
            uri: supportingDocument.uri,
            name: supportingDocument.name,
            type: supportingDocument.type,
          } as any);
        }

        await loanAPI.createLoanRequestMultipart(formData);
      } else {
        await loanAPI.createLoanRequest({
          amount: parsedAmount,
          purpose: purpose.trim(),
          notes: notes.trim(),
        });
      }

      Alert.alert('✅ Success', 'Your loan request has been submitted to ECORET.');
      setAmount('');
      setPurpose('');
      setNotes('');
      setSupportingDocument(null);
      await loadRequests();
      setTab('status');
    } catch (err: any) {
      const data = err?.response?.data;
      const firstFieldError =
        data && typeof data === 'object' ? Object.values(data)[0] : null;
      const message =
        (Array.isArray(firstFieldError) ? firstFieldError[0] : firstFieldError) ||
        data?.detail ||
        'Could not submit loan request. Please try again.';
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== HELPERS ====================
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return colors.success;
      case 'declined':
        return colors.error;
      case 'active':
        return colors.primary;
      case 'completed':
        return '#4CAF50';
      default:
        return colors.warning;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return 'checkmark-circle';
      case 'declined':
        return 'close-circle';
      case 'active':
        return 'sync';
      case 'completed':
        return 'checkmark-done-circle';
      default:
        return 'time';
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'approved':
        return styles.badgeApproved;
      case 'declined':
        return styles.badgeDeclined;
      case 'active':
        return styles.badgeActive;
      case 'completed':
        return styles.badgeCompleted;
      default:
        return styles.badgePending;
    }
  };

  const getStatusTextStyle = (status: string) => {
    switch (status) {
      case 'approved':
        return styles.textApproved;
      case 'declined':
        return styles.textDeclined;
      case 'active':
        return styles.textActive;
      case 'completed':
        return styles.textCompleted;
      default:
        return styles.textPending;
    }
  };

  // ==================== RENDER FUNCTIONS ====================
  const renderNewRequest = () => (
    <ScrollView contentContainerStyle={styles.formContent}>
      <Text style={styles.label}>Loan Amount (MK) *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 500000"
        placeholderTextColor={colors.textMuted}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
        editable={!submitting}
      />

      <Text style={styles.label}>Purpose *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="What is this loan for?"
        placeholderTextColor={colors.textMuted}
        value={purpose}
        onChangeText={setPurpose}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
        editable={!submitting}
      />

      <Text style={styles.label}>Additional Notes * (min. {MIN_NOTES_LENGTH} characters)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Provide full details ECORET should know about this request (at least 200 characters)"
        placeholderTextColor={colors.textMuted}
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={6}
        textAlignVertical="top"
        editable={!submitting}
      />
      <Text
        style={[
          styles.charCount,
          notes.trim().length >= MIN_NOTES_LENGTH && styles.charCountOk,
        ]}
      >
        {notes.trim().length} / {MIN_NOTES_LENGTH}
      </Text>

      <Text style={styles.label}>Supporting Document</Text>
      <TouchableOpacity style={styles.input} onPress={pickSupportingDocument} activeOpacity={0.7} disabled={submitting}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="document-attach-outline" size={18} color={colors.textMuted} />
          <Text style={{ color: supportingDocument ? colors.text : colors.textMuted, flexShrink: 1 }}>
            {supportingDocument ? supportingDocument.name : 'Attach a document (optional)'}
          </Text>
        </View>
      </TouchableOpacity>
      {supportingDocument && (
        <TouchableOpacity onPress={() => setSupportingDocument(null)} style={{ marginTop: 6 }} disabled={submitting}>
          <Text style={{ color: colors.error, fontSize: 12 }}>Remove document</Text>
        </TouchableOpacity>
      )}

      {formError ? <Text style={styles.error}>{formError}</Text> : null}

      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.disabledBtn]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>Submit Loan Request</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  const renderStatus = () => (
    <ScrollView
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {loadingRequests ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : listError ? (
        <Text style={styles.error}>{listError}</Text>
      ) : requests.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="document-text-outline" size={60} color={colors.secondary} />
          <Text style={styles.emptyText}>No loan requests yet</Text>
          <Text style={styles.emptySubtext}>Submit one from the "New Request" tab</Text>
        </View>
      ) : (
        requests.map((r) => (
          <View key={r.id} style={styles.requestCard}>
            <View style={styles.requestHeader}>
              <Text style={styles.requestAmount}>
                MK {Number(r.amount).toLocaleString()}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: `${getStatusColor(r.status)}20` },
                ]}
              >
                <Text style={[styles.statusText, { color: getStatusColor(r.status) }]}>
                  {r.status.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.requestPurpose}>{r.purpose}</Text>

            {r.document ? (
              <TouchableOpacity
                onPress={() => Alert.alert('Document', 'Open this link in a browser to view your attached document:\n\n' + r.document)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}
              >
                <Icon name="document-attach-outline" size={14} color={colors.primary} />
                <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>Document attached</Text>
              </TouchableOpacity>
            ) : null}

            {r.status === 'approved' && (r.total_payable || r.interest_rate || r.due_date || r.approved_amount) ? (
              <View style={styles.loanDetailsBox}>
                {r.approved_amount && Number(r.approved_amount) !== Number(r.amount) ? (
                  <View style={styles.loanDetailRow}>
                    <Text style={styles.loanDetailLabel}>Approved Amount</Text>
                    <Text style={styles.loanDetailValue}>
                      MK {Number(r.approved_amount).toLocaleString()}
                    </Text>
                  </View>
                ) : null}
                {r.interest_rate ? (
                  <View style={styles.loanDetailRow}>
                    <Text style={styles.loanDetailLabel}>Interest Rate</Text>
                    <Text style={styles.loanDetailValue}>{r.interest_rate}%</Text>
                  </View>
                ) : null}
                {r.total_payable ? (
                  <View style={styles.loanDetailRow}>
                    <Text style={styles.loanDetailLabel}>Total Payable</Text>
                    <Text style={styles.loanDetailValue}>
                      MK {Number(r.total_payable).toLocaleString()}
                    </Text>
                  </View>
                ) : null}
                {r.due_date ? (
                  <View style={styles.loanDetailRow}>
                    <Text style={styles.loanDetailLabel}>Due Date</Text>
                    <Text style={styles.loanDetailValue}>
                      {new Date(r.due_date).toLocaleDateString()}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            <Text style={styles.requestMeta}>
              Requested: {new Date(r.created_at).toLocaleDateString()}
            </Text>
            {r.decision_notes ? (
              <Text style={styles.decisionNotes}>Note: {r.decision_notes}</Text>
            ) : null}
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderMemberLoansTab = () => (
    <ScrollView
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshingMembers} onRefresh={onRefreshMembers} />
      }
    >
      {loadingMemberLoans ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : memberLoansError ? (
        <Text style={styles.error}>{memberLoansError}</Text>
      ) : memberLoans.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="people-outline" size={60} color={colors.secondary} />
          <Text style={styles.emptyText}>No pending member requests</Text>
          <Text style={styles.emptySubtext}>
            Members submit group loan requests via USSD on their phones
          </Text>
        </View>
      ) : (
        memberLoans.map((loan) => (
          <View key={loan.id} style={styles.requestCard}>
            <View style={styles.requestHeader}>
              <Text style={styles.requestAmount}>
                MK {Number(loan.amount).toLocaleString()}
              </Text>
              <View style={[styles.statusBadge, styles.badgePending]}>
                <Text style={[styles.statusText, styles.textPending]}>PENDING</Text>
              </View>
            </View>
            <Text style={styles.memberName}>{loan.member_name}</Text>
            <Text style={styles.requestPurpose}>{loan.purpose}</Text>
            <Text style={styles.requestMeta}>
              Requested: {new Date(loan.request_date).toLocaleDateString()}
            </Text>

            <View style={styles.memberActions}>
              <TouchableOpacity
                style={[styles.memberActionBtn, styles.approveBtn]}
                onPress={() => handleApproveMemberLoan(loan)}
                disabled={processingId === loan.id}
              >
                {processingId === loan.id ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.memberActionBtnText}>Approve</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.memberActionBtn, styles.declineBtn]}
                onPress={() => handleDeclineMemberLoan(loan)}
                disabled={processingId === loan.id}
              >
                <Text style={styles.memberActionBtnText}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderAllLoansTab = () => (
    <ScrollView
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshingAllLoans} onRefresh={onRefreshAllLoans} />
      }
    >
      {loadingAllLoans ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : allLoansError ? (
        <Text style={styles.error}>{allLoansError}</Text>
      ) : allLoans.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="document-text-outline" size={60} color={colors.secondary} />
          <Text style={styles.emptyText}>No loans found</Text>
          <Text style={styles.emptySubtext}>All group loans will appear here</Text>
        </View>
      ) : (
        allLoans.map((loan) => (
          <View key={loan.id} style={[styles.requestCard, styles.allLoanCard]}>
            <View style={styles.requestHeader}>
              <View>
                <Text style={styles.requestAmount}>
                  MK {Number(loan.amount).toLocaleString()}
                </Text>
                <Text style={styles.memberName}>{loan.member_name}</Text>
              </View>
              <View style={[styles.statusBadge, getStatusBadgeStyle(loan.status)]}>
                <Icon name={getStatusIcon(loan.status)} size={12} color={getStatusColor(loan.status)} />
                <Text style={[styles.statusText, getStatusTextStyle(loan.status)]}>
                  {loan.status.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.requestPurpose}>{loan.purpose}</Text>
            <Text style={styles.requestMeta}>
              Requested: {new Date(loan.created_at).toLocaleDateString()}
              {loan.disbursement_method && ` • Method: ${loan.disbursement_method}`}
            </Text>
            {loan.due_date && (
              <Text style={styles.requestMeta}>
                Due: {new Date(loan.due_date).toLocaleDateString()}
              </Text>
            )}
            {loan.status === 'active' && (
              <View style={styles.loanDetailsBox}>
                <Text style={styles.loanDetailValue}>
                  Balance: MK {Number(loan.total_payable).toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );

  // ==================== MAIN RENDER ====================
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
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Loans</Text>
          <Text style={styles.headerSubtitle}>Manage group loans</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'members' && styles.tabBtnActive]}
          onPress={() => setTab('members')}
        >
          <Text style={[styles.tabText, tab === 'members' && styles.tabTextActive]}>
            ⏳ Pending Loans
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'all' && styles.tabBtnActive]}
          onPress={() => setTab('all')}
        >
          <Text style={[styles.tabText, tab === 'all' && styles.tabTextActive]}>
            📋 All Group Loans
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'new' && styles.tabBtnActive]}
          onPress={() => setTab('new')}
        >
          <Text style={[styles.tabText, tab === 'new' && styles.tabTextActive]}>
            ➕ New Request
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'status' && styles.tabBtnActive]}
          onPress={() => setTab('status')}
        >
          <Text style={[styles.tabText, tab === 'status' && styles.tabTextActive]}>
            📊 Ecoret Loan Status
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'new' ? renderNewRequest() : tab === 'status' ? renderStatus() : tab === 'all' ? renderAllLoansTab() : renderMemberLoansTab()}

      {/* Disbursement Modal */}
      <Modal
        visible={!!disbursementLoan}
        transparent
        animationType="slide"
        onRequestClose={() => setDisbursementLoan(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Disburse Loan</Text>
                <TouchableOpacity onPress={() => setDisbursementLoan(null)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              {disbursementLoan && (
                <>
                  <Text style={styles.modalSubtitle}>
                    {disbursementLoan.member_name} — MK{' '}
                    {Number(disbursementLoan.amount).toLocaleString()}
                  </Text>

                  <Text style={styles.label}>Disbursement Method</Text>
                  <View style={styles.methodRow}>
                    {(['cash', 'bank_transfer', 'mobile_money', 'wait'] as DisbursementMethod[]).map(
                      (m) => (
                        <TouchableOpacity
                          key={m}
                          style={[
                            styles.methodBtn,
                            disbursementMethod === m && styles.methodBtnActive,
                          ]}
                          onPress={() => handleSelectMethod(m)}
                        >
                          <Text
                            style={[
                              styles.methodBtnText,
                              disbursementMethod === m && styles.methodBtnTextActive,
                            ]}
                          >
                            {m === 'cash'
                              ? '💵 Cash'
                              : m === 'bank_transfer'
                              ? '🏦 Bank'
                              : m === 'mobile_money'
                              ? '📱 Mobile Money'
                              : '⏳ Wait'}
                          </Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>

                  {loadingBankDetails ? (
                    <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
                  ) : null}

                  {disbursementMethod === 'cash' && (
                    <>
                      <Text style={styles.label}>Cash Receipt Number (auto-generated, editable) *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter receipt number"
                        placeholderTextColor={colors.textMuted}
                        value={receiptNumber}
                        onChangeText={setReceiptNumber}
                      />
                    </>
                  )}

                  {disbursementMethod === 'bank_transfer' && (
                    <>
                      {bankDetails?.member_bank_details.has_bank_details ? (
                        <View style={styles.loanDetailsBox}>
                          <View style={styles.loanDetailRow}>
                            <Text style={styles.loanDetailLabel}>Bank</Text>
                            <Text style={styles.loanDetailValue}>
                              {bankDetails.member_bank_details.bank_name}
                            </Text>
                          </View>
                          <View style={styles.loanDetailRow}>
                            <Text style={styles.loanDetailLabel}>Account Name</Text>
                            <Text style={styles.loanDetailValue}>
                              {bankDetails.member_bank_details.bank_account_name}
                            </Text>
                          </View>
                          <View style={styles.loanDetailRow}>
                            <Text style={styles.loanDetailLabel}>Account Number</Text>
                            <Text style={styles.loanDetailValue}>
                              {bankDetails.member_bank_details.bank_account_number}
                            </Text>
                          </View>
                        </View>
                      ) : bankDetails ? (
                        <Text style={styles.warningText}>
                          This member has no bank details on file.
                        </Text>
                      ) : null}
                      <Text style={styles.label}>Transfer Reference (auto-generated, editable) *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter transfer reference"
                        placeholderTextColor={colors.textMuted}
                        value={transferReference}
                        onChangeText={setTransferReference}
                      />
                    </>
                  )}

                  {disbursementMethod === 'mobile_money' && (
                    <>
                      {bankDetails?.member_bank_details.has_mobile_money ? (
                        <View style={styles.loanDetailsBox}>
                          <View style={styles.loanDetailRow}>
                            <Text style={styles.loanDetailLabel}>Registered Phone</Text>
                            <Text style={styles.loanDetailValue}>
                              {bankDetails.member_bank_details.member_phone}
                            </Text>
                          </View>
                          <View style={styles.loanDetailRow}>
                            <Text style={styles.loanDetailLabel}>Mobile Money Number</Text>
                            <Text style={styles.loanDetailValue}>
                              {bankDetails.member_bank_details.mobile_money_number}
                            </Text>
                          </View>
                        </View>
                      ) : bankDetails ? (
                        <Text style={styles.warningText}>
                          This member has no mobile money number on file.
                        </Text>
                      ) : null}

                      <Text style={styles.label}>Provider *</Text>
                      <View style={styles.methodRow}>
                        {(['airtel', 'tnm'] as const).map((p) => (
                          <TouchableOpacity
                            key={p}
                            style={[
                              styles.methodBtn,
                              mobileMoneyProvider === p && styles.methodBtnActive,
                            ]}
                            onPress={() => setMobileMoneyProvider(p)}
                          >
                            <Text
                              style={[
                                styles.methodBtnText,
                                mobileMoneyProvider === p && styles.methodBtnTextActive,
                              ]}
                            >
                              {p === 'airtel' ? 'Airtel Money' : 'TNM Mpamba'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <Text style={styles.label}>Transaction ID *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter mobile money transaction ID"
                        placeholderTextColor={colors.textMuted}
                        value={transactionId}
                        onChangeText={setTransactionId}
                      />

                      <Text style={styles.label}>PIN *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter PIN to confirm"
                        placeholderTextColor={colors.textMuted}
                        value={mobileMoneyPin}
                        onChangeText={setMobileMoneyPin}
                        secureTextEntry
                        keyboardType="numeric"
                      />
                    </>
                  )}

                  {disbursementMethod === 'wait' && (
                    <>
                      <Text style={styles.label}>Reason for Delay *</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Explain why disbursement is delayed"
                        placeholderTextColor={colors.textMuted}
                        value={waitReason}
                        onChangeText={setWaitReason}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                      />
                    </>
                  )}

                  <TouchableOpacity
                    style={[styles.submitBtn, disbursing && styles.disabledBtn]}
                    onPress={handleConfirmDisbursement}
                    disabled={disbursing}
                  >
                    {disbursing ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitBtnText}>Confirm Disbursement</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.primary,
  },
  backButton: { padding: 4 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  headerSpacer: { width: 36 },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabBtn: { paddingVertical: 12, paddingHorizontal: 16, marginRight: 8 },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontSize: 14, color: colors.textMuted },
  tabTextActive: { color: colors.primary, fontWeight: '600' },
  formContent: { padding: 20 },
  label: { fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  textArea: { minHeight: 80 },
  charCount: { fontSize: 12, color: colors.textMuted, textAlign: 'right', marginTop: 4 },
  charCountOk: { color: colors.success },
  error: { color: colors.error, marginTop: 16, textAlign: 'center' },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  disabledBtn: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  listContent: { padding: 20 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.text },
  emptySubtext: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  requestCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  allLoanCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  requestAmount: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  badgePending: { backgroundColor: `${colors.warning}20` },
  badgeApproved: { backgroundColor: `${colors.success}20` },
  badgeDeclined: { backgroundColor: `${colors.error}20` },
  badgeActive: { backgroundColor: `${colors.primary}20` },
  badgeCompleted: { backgroundColor: '#4CAF5020' },
  statusText: { fontSize: 11, fontWeight: '700' },
  textPending: { color: colors.warning },
  textApproved: { color: colors.success },
  textDeclined: { color: colors.error },
  textActive: { color: colors.primary },
  textCompleted: { color: '#4CAF50' },
  requestPurpose: { fontSize: 14, color: colors.text, marginBottom: 6 },
  requestMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  decisionNotes: { fontSize: 12, color: colors.text, marginTop: 8, fontStyle: 'italic' },
  loanDetailsBox: { backgroundColor: colors.background, borderRadius: 8, padding: 10, marginTop: 8, marginBottom: 4, gap: 4 },
  loanDetailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  loanDetailLabel: { fontSize: 12, color: colors.textMuted },
  loanDetailValue: { fontSize: 12, fontWeight: '600', color: colors.text },
  memberName: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 2 },
  memberActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  memberActionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  approveBtn: { backgroundColor: colors.success },
  declineBtn: { backgroundColor: colors.error },
  memberActionBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  modalClose: { fontSize: 20, color: colors.textMuted, padding: 4 },
  modalSubtitle: { fontSize: 14, color: colors.textMuted, marginBottom: 16 },
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  methodBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  methodBtnActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}15` },
  methodBtnText: { fontSize: 13, color: colors.textMuted },
  methodBtnTextActive: { color: colors.primary, fontWeight: '600' },
  warningText: { fontSize: 12, color: colors.warning, marginBottom: 8, fontStyle: 'italic' },
});
