// src/screens/LoanDisbursementScreen.tsx - COMPLETE FIXED
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  TextInput,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../theme/colors';
import { loanAPI } from '../api/endpoints';
import AsyncStorage from '@react-native-async-storage/async-storage';

type DisbursementMethod = 'cash' | 'bank_transfer' | 'mobile_money' | 'wait';

export default function LoanDisbursementScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  
  // Get loan data from route params
  const { loanId, memberName, amount, purpose } = route.params as {
    loanId: string;
    memberName: string;
    amount: string;
    purpose: string;
  };

  const [method, setMethod] = useState<DisbursementMethod>('cash');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [transferReference, setTransferReference] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [mobileMoneyProvider, setMobileMoneyProvider] = useState<'airtel' | 'tnm'>('airtel');
  const [mobileMoneyPin, setMobileMoneyPin] = useState('');
  const [waitReason, setWaitReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDisburse = () => {
    // Validate based on method
    if (method === 'cash' && !receiptNumber.trim()) {
      Alert.alert('Error', 'Please enter a cash receipt number.');
      return;
    }
    if (method === 'bank_transfer' && !transferReference.trim()) {
      Alert.alert('Error', 'Please enter a transfer reference.');
      return;
    }
    if (method === 'mobile_money') {
      if (!transactionId.trim()) {
        Alert.alert('Error', 'Please enter the mobile money transaction ID.');
        return;
      }
      if (!mobileMoneyPin.trim()) {
        Alert.alert('Error', 'Please enter the PIN to confirm this disbursement.');
        return;
      }
    }
    if (method === 'wait' && !waitReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for the delay.');
      return;
    }

    Alert.alert(
      'Confirm Disbursement',
      `Are you sure you want to disburse MK ${amount} to ${memberName} via ${method.replace('_', ' ')}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setIsProcessing(true);
            try {
              let response;
              
              if (method === 'cash') {
                response = await loanAPI.chairmanDisburseCash(loanId, {
                  receipt_number: receiptNumber.trim(),
                });
              } else if (method === 'bank_transfer') {
                response = await loanAPI.chairmanDisburseBank(loanId, {
                  transfer_reference: transferReference.trim(),
                });
              } else if (method === 'mobile_money') {
                response = await loanAPI.chairmanDisburseMobileMoney(loanId, {
                  transaction_id: transactionId.trim(),
                  mobile_money_provider: mobileMoneyProvider,
                  pin: mobileMoneyPin.trim(),
                });
              } else if (method === 'wait') {
                response = await loanAPI.chairmanDisburseWait(loanId, {
                  reason: waitReason.trim(),
                });
              }

              Alert.alert('✅ Success', 'Loan disbursed successfully!');
              navigation.goBack();
            } catch (error: any) {
              console.error('Disbursement error:', error);
              Alert.alert('Error', error?.response?.data?.error || 'Failed to disburse loan.');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Disburse Loan</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          {/* Loan Info */}
          <View style={styles.loanInfo}>
            <Text style={styles.memberName}>{memberName}</Text>
            <Text style={styles.loanPurpose}>{purpose}</Text>
          </View>

          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>Amount to Disburse</Text>
            <Text style={styles.amount}>MK {Number(amount).toLocaleString()}</Text>
          </View>

          {/* Payment Method */}
          <Text style={styles.sectionTitle}>Select Disbursement Method</Text>
          <View style={styles.methodContainer}>
            {[
              { id: 'cash', label: '💵 Cash', icon: 'cash-outline' },
              { id: 'bank_transfer', label: '🏦 Bank Transfer', icon: 'business-outline' },
              { id: 'mobile_money', label: '📱 Mobile Money', icon: 'phone-portrait-outline' },
              { id: 'wait', label: '⏳ Wait', icon: 'time-outline' },
            ].map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.methodBtn, method === item.id && styles.methodBtnActive]}
                onPress={() => setMethod(item.id as DisbursementMethod)}
                activeOpacity={0.7}
              >
                <Text style={[styles.methodText, method === item.id && styles.methodTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Method-specific inputs */}
          {method === 'cash' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Cash Receipt Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter receipt number"
                placeholderTextColor={colors.textMuted}
                value={receiptNumber}
                onChangeText={setReceiptNumber}
              />
            </View>
          )}

          {method === 'bank_transfer' && (
            <>
              <View style={styles.infoBox}>
                <Icon name="information-circle-outline" size={20} color={colors.primary} />
                <Text style={styles.infoText}>
                  Funds will be transferred to the group's bank account
                </Text>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Transfer Reference *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter transfer reference"
                  placeholderTextColor={colors.textMuted}
                  value={transferReference}
                  onChangeText={setTransferReference}
                />
              </View>
            </>
          )}

          {method === 'mobile_money' && (
            <>
              <View style={styles.infoBox}>
                <Icon name="information-circle-outline" size={20} color={colors.primary} />
                <Text style={styles.infoText}>
                  Funds will be sent to member's registered mobile money number
                </Text>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Provider *</Text>
                <View style={styles.providerRow}>
                  {(['airtel', 'tnm'] as const).map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.providerBtn,
                        mobileMoneyProvider === p && styles.providerBtnActive,
                      ]}
                      onPress={() => setMobileMoneyProvider(p)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.providerText,
                        mobileMoneyProvider === p && styles.providerTextActive,
                      ]}>
                        {p === 'airtel' ? 'Airtel Money' : 'TNM Mpamba'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Transaction ID *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter mobile money transaction ID"
                  placeholderTextColor={colors.textMuted}
                  value={transactionId}
                  onChangeText={setTransactionId}
                />
              </View>
              <View style={styles.inputGroup}>
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
              </View>
            </>
          )}

          {method === 'wait' && (
            <View style={styles.inputGroup}>
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
            </View>
          )}

          {/* Disburse Button */}
          <TouchableOpacity
            style={[styles.disburseBtn, isProcessing && styles.disabledBtn]}
            onPress={handleDisburse}
            disabled={isProcessing}
            activeOpacity={0.7}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.disburseBtnText}>Confirm Disbursement</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  headerSpacer: {
    width: 40,
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  loanInfo: {
    marginBottom: 16,
  },
  memberName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  loanPurpose: {
    fontSize: 14,
    color: colors.secondary,
    marginTop: 2,
  },
  amountBox: {
    backgroundColor: `${colors.primary}10`,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  amountLabel: {
    fontSize: 14,
    color: colors.secondary,
  },
  amount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  methodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  methodBtn: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  methodBtnActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  methodText: {
    fontSize: 13,
    color: colors.secondary,
  },
  methodTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}10`,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 13,
    color: colors.primary,
    marginLeft: 8,
    flex: 1,
  },
  providerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  providerBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  providerBtnActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  providerText: {
    fontSize: 13,
    color: colors.secondary,
  },
  providerTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  disburseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  disburseBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});