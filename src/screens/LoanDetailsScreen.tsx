// src/screens/LoanDetailsScreen.tsx
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native'
import Icon from 'react-native-vector-icons/Ionicons'
import { colors } from '../theme/colors'

export function LoanDetailsScreen({ route, navigation }: any) {
  const { loanId } = route.params
  const [loading, setLoading] = useState(true)

  // Mock loan data with full details
  const loan = {
    id: loanId,
    memberName: 'John Doe',
    amount: '10,000',
    purpose: 'Business expansion',
    requestDate: '2026-07-27',
    approvalDate: '2026-07-28',
    dueDate: '2027-01-27',
    status: 'active',
    interestRate: '10%',
    duration: '6 months',
    totalPayable: '11,000',
    balance: '6,500',
    totalPaid: '4,500',
    disbursementMethod: 'bank_transfer',
    disbursementStatus: 'completed',
    bankTransferReference: 'ECO-2026-07-28-001',
    disbursementDate: '2026-07-28',
    waitReason: null,
  }

  useEffect(() => {
    setTimeout(() => setLoading(false), 500)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return colors.success
      case 'approved': return colors.primary
      case 'pending': return colors.warning
      case 'completed': return colors.success
      case 'declined': return colors.error
      default: return colors.textMuted
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Total Amount</Text>
          <Text style={styles.amount}>MK {loan.amount}</Text>
          <View style={styles.statusBadge}>
            <Text style={[styles.statusText, { color: getStatusColor(loan.status) }]}>
              {loan.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>📋 Loan Details</Text>
          <DetailRow label="Member" value={loan.memberName} />
          <DetailRow label="Purpose" value={loan.purpose} />
          <DetailRow label="Interest Rate" value={loan.interestRate} />
          <DetailRow label="Duration" value={loan.duration} />
          <DetailRow label="Total Payable" value={`MK ${loan.totalPayable}`} />
          <DetailRow label="Total Paid" value={`MK ${loan.totalPaid}`} />
          <DetailRow label="Balance" value={`MK ${loan.balance}`} valueColor={colors.primary} />
          <DetailRow label="Request Date" value={loan.requestDate} />
          <DetailRow label="Approval Date" value={loan.approvalDate} />
          <DetailRow label="Due Date" value={loan.dueDate} />
        </View>

        <View style={styles.disbursementCard}>
          <Text style={styles.sectionTitle}>💰 Disbursement Information</Text>

          <View style={styles.disbursementRow}>
            <Text style={styles.disbursementLabel}>Status</Text>
            <Text style={[styles.disbursementValue, { color: colors.success }]}>
              ✅ Disbursed
            </Text>
          </View>

          <View style={styles.disbursementRow}>
            <Text style={styles.disbursementLabel}>Method</Text>
            <Text style={styles.disbursementValue}>🏦 Bank Transfer</Text>
          </View>

          <View style={styles.disbursementRow}>
            <Text style={styles.disbursementLabel}>Reference</Text>
            <Text style={[styles.disbursementValue, styles.monoText]}>
              {loan.bankTransferReference}
            </Text>
          </View>

          <View style={styles.disbursementRow}>
            <Text style={styles.disbursementLabel}>Date</Text>
            <Text style={styles.disbursementValue}>{loan.disbursementDate}</Text>
          </View>
        </View>

        {loan.status === 'active' && (
          <TouchableOpacity style={styles.repayBtn}>
            <Text style={styles.repayBtnText}>Make Repayment</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function DetailRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  amountCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  amountLabel: { fontSize: 14, color: colors.textMuted },
  amount: { fontSize: 32, fontWeight: 'bold', color: colors.text, marginVertical: 4 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: `${colors.primary}10` },
  statusText: { fontSize: 12, fontWeight: '600' },
  detailsCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16 },
  disbursementCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel: { fontSize: 14, color: colors.textMuted },
  detailValue: { fontSize: 14, fontWeight: '500', color: colors.text },
  disbursementRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  disbursementLabel: { fontSize: 14, color: colors.textMuted },
  disbursementValue: { fontSize: 14, fontWeight: '500', color: colors.text },
  monoText: { fontFamily: 'monospace', fontSize: 12 },
  repayBtn: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  repayBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})