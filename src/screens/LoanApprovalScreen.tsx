// src/screens/LoanApprovalScreen.tsx
import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native'
import Icon from 'react-native-vector-icons/Ionicons'
import { colors } from '../theme/colors'

export function LoanApprovalScreen({ route, navigation }: any) {
  const { loanId } = route.params
  const [isProcessing, setIsProcessing] = useState(false)

  // Mock loan data
  const loan = {
    id: loanId,
    memberName: 'John Doe',
    amount: '10,000',
    purpose: 'Business expansion',
    date: '2026-07-27',
    phoneNumber: '+265 999 123 456',
    nationalId: '1234567890',
    interestRate: '10%',
    duration: '6 months',
    totalPayable: '11,000',
  }

  const handleApprove = () => {
    Alert.alert(
      'Approve Loan',
      `Are you sure you want to approve this loan of MK ${loan.amount} for ${loan.memberName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => {
            setIsProcessing(true)
            setTimeout(() => {
              setIsProcessing(false)
              Alert.alert('Success', 'Loan approved successfully!')
              navigation.goBack()
            }, 1500)
          },
        },
      ]
    )
  }

  const handleDecline = () => {
    Alert.alert(
      'Decline Loan',
      'Are you sure you want to decline this loan?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => {
            setIsProcessing(true)
            setTimeout(() => {
              setIsProcessing(false)
              Alert.alert('Success', 'Loan declined successfully!')
              navigation.goBack()
            }, 1500)
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.memberHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{loan.memberName.charAt(0)}</Text>
            </View>
            <View>
              <Text style={styles.memberName}>{loan.memberName}</Text>
              <Text style={styles.memberPhone}>{loan.phoneNumber}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={styles.detailValue}>MK {loan.amount}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Purpose</Text>
            <Text style={styles.detailValue}>{loan.purpose}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Interest Rate</Text>
            <Text style={styles.detailValue}>{loan.interestRate}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>{loan.duration}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Payable</Text>
            <Text style={[styles.detailValue, styles.totalAmount]}>MK {loan.totalPayable}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>National ID</Text>
            <Text style={styles.detailValue}>{loan.nationalId}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Request Date</Text>
            <Text style={styles.detailValue}>{loan.date}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.approveBtn, isProcessing && styles.disabledBtn]}
            onPress={handleApprove}
            disabled={isProcessing}
          >
            <Icon name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>Approve Loan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.declineBtn, isProcessing && styles.disabledBtn]}
            onPress={handleDecline}
            disabled={isProcessing}
          >
            <Icon name="close-circle" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>Decline Loan</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  memberHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: colors.primary },
  memberName: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  memberPhone: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  detailLabel: { fontSize: 14, color: colors.textMuted },
  detailValue: { fontSize: 14, color: colors.text, fontWeight: '500' },
  totalAmount: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
  actions: { marginTop: 16, gap: 12 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  approveBtn: { backgroundColor: colors.success },
  declineBtn: { backgroundColor: colors.error },
  disabledBtn: { opacity: 0.6 },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})