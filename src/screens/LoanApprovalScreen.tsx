// src/screens/LoanApprovalScreen.tsx
import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Icon from 'react-native-vector-icons/Ionicons'
import { colors } from '../theme/colors'
import { loanAPI } from '../api/endpoints'

interface LoanDetail {
  id: string
  member_name?: string
  member?: { full_name?: string; phone_number?: string }
  amount: string
  purpose: string
  interest_rate: string
  duration_months: number
  total_payable: string
  national_id?: string
  request_date?: string
  created_at?: string
  status: string
}

export function LoanApprovalScreen({ route, navigation }: any) {
  const { loanId } = route.params
  const queryClient = useQueryClient()
  const [isProcessing, setIsProcessing] = useState(false)

  // Fetch the real loan detail using your existing getLoan method
  const { data: loan, isLoading, error } = useQuery<LoanDetail>({
    queryKey: ['loan-detail', loanId],
    queryFn: async () => {
      const response = await loanAPI.getLoan(loanId)
      return response.data
    },
    enabled: !!loanId,
  })

  // Approve mutation using your existing approveLoan method
  const approveMutation = useMutation({
    mutationFn: async () => loanAPI.approveLoan(loanId, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['loan-requests'] })
      queryClient.invalidateQueries({ queryKey: ['loan-detail', loanId] })

      // Go straight to the disbursement screen with real data
      navigation.replace('LoanDisbursement', {
        loanId,
        memberName: loan?.member_name || loan?.member?.full_name || 'Member',
        amount: loan?.amount,
        purpose: loan?.purpose,
      })
    },
    onError: (err: any) => {
      setIsProcessing(false)
      Alert.alert('Error', err?.response?.data?.error || 'Failed to approve loan.')
    },
  })

  // Decline mutation using your existing declineLoan method
  const declineMutation = useMutation({
    mutationFn: async () => loanAPI.declineLoan(loanId, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['loan-requests'] })
      Alert.alert('Success', 'Loan declined successfully!')
      navigation.goBack()
    },
    onError: (err: any) => {
      setIsProcessing(false)
      Alert.alert('Error', err?.response?.data?.error || 'Failed to decline loan.')
    },
  })

  const handleApprove = () => {
    if (!loan) return
    const name = loan.member_name || loan.member?.full_name || 'this member'
    Alert.alert(
      'Approve Loan',
      `Are you sure you want to approve this loan of MK ${Number(loan.amount).toLocaleString()} for ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => {
            setIsProcessing(true)
            approveMutation.mutate()
          },
        },
      ]
    )
  }

  const handleDecline = () => {
    if (!loan) return
    const name = loan.member_name || loan.member?.full_name || 'this member'
    Alert.alert(
      'Decline Loan',
      `Are you sure you want to decline this loan for ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => {
            setIsProcessing(true)
            declineMutation.mutate()
          },
        },
      ]
    )
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading loan details...</Text>
      </SafeAreaView>
    )
  }

  if (error || !loan) {
    return (
      <SafeAreaView style={styles.centered}>
        <Icon name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={styles.errorText}>Failed to load loan details</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.retryBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const memberName = loan.member_name || loan.member?.full_name || 'Unknown'
  const memberPhone = loan.member?.phone_number || '--'
  const requestDate = loan.request_date || loan.created_at

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.memberHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{memberName.charAt(0)}</Text>
            </View>
            <View>
              <Text style={styles.memberName}>{memberName}</Text>
              <Text style={styles.memberPhone}>{memberPhone}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={styles.detailValue}>
              MK {Number(loan.amount).toLocaleString()}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Purpose</Text>
            <Text style={styles.detailValue}>{loan.purpose || '--'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Interest Rate</Text>
            <Text style={styles.detailValue}>{loan.interest_rate}%</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>{loan.duration_months} months</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Payable</Text>
            <Text style={[styles.detailValue, styles.totalAmount]}>
              MK {Number(loan.total_payable).toLocaleString()}
            </Text>
          </View>

          {loan.national_id && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>National ID</Text>
              <Text style={styles.detailValue}>{loan.national_id}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Request Date</Text>
            <Text style={styles.detailValue}>
              {requestDate ? new Date(requestDate).toLocaleDateString() : '--'}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.approveBtn, isProcessing && styles.disabledBtn]}
            onPress={handleApprove}
            disabled={isProcessing}
            activeOpacity={0.7}
          >
            {isProcessing && approveMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>Approve & Disburse</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.declineBtn, isProcessing && styles.disabledBtn]}
            onPress={handleDecline}
            disabled={isProcessing}
            activeOpacity={0.7}
          >
            {isProcessing && declineMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon name="close-circle" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>Decline Loan</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  loadingText: { marginTop: 12, color: colors.secondary, fontSize: 14 },
  errorText: { marginTop: 12, color: colors.error, fontSize: 15, textAlign: 'center' },
  retryBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
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