// // src/screens/LoansScreen.tsx
// import React, { useState, useEffect } from 'react'
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   SafeAreaView,
//   FlatList,
//   ActivityIndicator,
//   RefreshControl,
// } from 'react-native'
// import { useNavigation } from '@react-navigation/native'
// import Icon from 'react-native-vector-icons/Ionicons'
// import { colors } from '../theme/colors'
// import api from '../api/client'
// import { ENDPOINTS } from '../api/endpoints'

// type LoanTab = 'pending' | 'approved' | 'active' | 'all'

// interface Loan {
//   id: string
//   member: { full_name: string }
//   amount: string
//   purpose: string
//   status: 'pending' | 'approved' | 'active' | 'completed' | 'declined'
//   request_date: string
//   due_date?: string
// }

// export default function LoansScreen() {
//   const navigation = useNavigation<any>() // <-- FIX: Use any type
//   const [activeTab, setActiveTab] = useState<LoanTab>('pending')
//   const [loans, setLoans] = useState<Loan[]>([])
//   const [loading, setLoading] = useState(true)
//   const [refreshing, setRefreshing] = useState(false)

//   useEffect(() => {
//     fetchLoans()
//   }, [])

//   const fetchLoans = async () => {
//     try {
//       setLoading(true)
//       const response = await api.get(ENDPOINTS.loans.list)
//       setLoans(response.data.results || response.data)
//     } catch (error) {
//       console.error('Failed to fetch loans:', error)
//     } finally {
//       setLoading(false)
//       setRefreshing(false)
//     }
//   }

//   const onRefresh = () => {
//     setRefreshing(true)
//     fetchLoans()
//   }

//   const getFilteredLoans = () => {
//     if (activeTab === 'all') return loans
//     return loans.filter(loan => loan.status === activeTab)
//   }

//   const getStatusColor = (status: string) => {
//     switch (status) {
//       case 'pending': return colors.warning
//       case 'approved': return colors.primary
//       case 'active': return colors.success
//       case 'completed': return colors.success
//       case 'declined': return colors.error
//       default: return colors.textMuted
//     }
//   }

//   const getStatusIcon = (status: string) => {
//     switch (status) {
//       case 'pending': return 'time-outline'
//       case 'approved': return 'checkmark-circle-outline'
//       case 'active': return 'checkmark-done-circle-outline'
//       case 'completed': return 'checkmark-done-circle-outline'
//       case 'declined': return 'close-circle-outline'
//       default: return 'ellipse-outline'
//     }
//   }

//   const handleLoanPress = (loan: Loan) => {
//     const params = { loanId: loan.id }
//     if (loan.status === 'pending') {
//       navigation.navigate('LoanApproval', params)
//     } else if (loan.status === 'approved') {
//       navigation.navigate('LoanDisbursement', params)
//     } else {
//       navigation.navigate('LoanDetails', params)
//     }
//   }

//   const renderLoanItem = ({ item }: { item: Loan }) => (
//     <TouchableOpacity style={styles.loanCard} onPress={() => handleLoanPress(item)}>
//       <View style={styles.loanHeader}>
//         <View style={styles.memberInfo}>
//           <View style={styles.memberAvatar}>
//             <Text style={styles.memberInitial}>{item.member.full_name.charAt(0)}</Text>
//           </View>
//           <View>
//             <Text style={styles.memberName}>{item.member.full_name}</Text>
//             <Text style={styles.loanPurpose} numberOfLines={1}>{item.purpose}</Text>
//           </View>
//         </View>
//         <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}15` }]}>
//           <Icon name={getStatusIcon(item.status)} size={14} color={getStatusColor(item.status)} />
//           <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
//             {item.status.toUpperCase()}
//           </Text>
//         </View>
//       </View>

//       <View style={styles.loanFooter}>
//         <Text style={styles.loanAmount}>MK {Number(item.amount).toLocaleString()}</Text>
//         <View style={styles.actionButtons}>
//           {item.status === 'pending' && (
//             <>
//               <TouchableOpacity
//                 style={[styles.actionBtn, styles.approveBtn]}
//                 onPress={() => navigation.navigate('LoanApproval', { loanId: item.id })}
//               >
//                 <Text style={styles.actionBtnText}>Approve</Text>
//               </TouchableOpacity>
//               <TouchableOpacity style={[styles.actionBtn, styles.declineBtn]}>
//                 <Text style={styles.actionBtnText}>Decline</Text>
//               </TouchableOpacity>
//             </>
//           )}
//           {item.status === 'approved' && (
//             <TouchableOpacity
//               style={[styles.actionBtn, styles.disburseBtn]}
//               onPress={() => navigation.navigate('LoanDisbursement', { loanId: item.id })}
//             >
//               <Text style={styles.actionBtnText}>💰 Disburse</Text>
//             </TouchableOpacity>
//           )}
//           {item.status === 'active' && (
//             <TouchableOpacity style={[styles.actionBtn, styles.viewBtn]}>
//               <Text style={styles.actionBtnText}>View Details</Text>
//             </TouchableOpacity>
//           )}
//         </View>
//       </View>
//     </TouchableOpacity>
//   )

//   if (loading) {
//     return (
//       <SafeAreaView style={styles.container}>
//         <View style={styles.centerContent}>
//           <ActivityIndicator size="large" color={colors.primary} />
//           <Text style={styles.loadingText}>Loading loans...</Text>
//         </View>
//       </SafeAreaView>
//     )
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       <View style={styles.header}>
//         <Text style={styles.title}>Loan Management</Text>
//         <TouchableOpacity
//           style={styles.newLoanBtn}
//           onPress={() => navigation.navigate('LoanRequest')}
//         >
//           <Icon name="add" size={24} color="#fff" />
//         </TouchableOpacity>
//       </View>

//       <FlatList
//         data={getFilteredLoans()}
//         keyExtractor={(item) => item.id}
//         renderItem={renderLoanItem}
//         contentContainerStyle={styles.listContent}
//         showsVerticalScrollIndicator={false}
//         refreshControl={
//           <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
//         }
//         ListHeaderComponent={
//           <View style={styles.tabContainer}>
//             {['pending', 'approved', 'active', 'all'].map((tab) => (
//               <TouchableOpacity
//                 key={tab}
//                 style={[styles.tab, activeTab === tab && styles.tabActive]}
//                 onPress={() => setActiveTab(tab as LoanTab)}
//               >
//                 <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
//                   {tab.toUpperCase()}
//                 </Text>
//               </TouchableOpacity>
//             ))}
//           </View>
//         }
//         ListEmptyComponent={
//           <View style={styles.emptyContainer}>
//             <Icon name="document-text-outline" size={64} color={colors.textMuted} />
//             <Text style={styles.emptyText}>No {activeTab} loans found</Text>
//           </View>
//         }
//       />
//     </SafeAreaView>
//   )
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: colors.background },
//   centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
//   loadingText: { marginTop: 12, color: colors.textMuted, fontSize: 14 },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingHorizontal: 16,
//     paddingTop: 12,
//     paddingBottom: 8,
//   },
//   title: { fontSize: 24, fontWeight: 'bold', color: colors.text },
//   newLoanBtn: {
//     backgroundColor: colors.primary,
//     width: 44,
//     height: 44,
//     borderRadius: 22,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   tabContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, flexWrap: 'wrap' },
//   tab: {
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     borderRadius: 20,
//     marginRight: 8,
//     marginBottom: 4,
//     backgroundColor: colors.surface,
//   },
//   tabActive: { backgroundColor: colors.primary },
//   tabText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
//   tabTextActive: { color: '#fff' },
//   listContent: { padding: 16, paddingTop: 0 },
//   loanCard: {
//     backgroundColor: '#fff',
//     borderRadius: 12,
//     padding: 16,
//     marginBottom: 12,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.05,
//     shadowRadius: 4,
//     elevation: 1,
//   },
//   loanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
//   memberInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
//   memberAvatar: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: `${colors.primary}15`,
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginRight: 12,
//   },
//   memberInitial: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
//   memberName: { fontSize: 14, fontWeight: '600', color: colors.text },
//   loanPurpose: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
//   statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
//   statusText: { fontSize: 10, fontWeight: '600', marginLeft: 4 },
//   loanFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
//   loanAmount: { fontSize: 16, fontWeight: 'bold', color: colors.text },
//   actionButtons: { flexDirection: 'row', gap: 8 },
//   actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
//   approveBtn: { backgroundColor: colors.success },
//   declineBtn: { backgroundColor: colors.error },
//   disburseBtn: { backgroundColor: colors.primary },
//   viewBtn: { backgroundColor: colors.secondary },
//   actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
//   emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
//   emptyText: { marginTop: 12, color: colors.textMuted, fontSize: 16 },
// })





// src/screens/LoansScreen.tsx - COMPLETE FIXED
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import Icon from 'react-native-vector-icons/Ionicons'
import { colors } from '../theme/colors'
import { loanAPI } from '../api/endpoints'

type LoanTab = 'pending' | 'approved' | 'active' | 'all'

interface Loan {
  id: string
  member: { full_name: string; id?: string }
  amount: string
  purpose: string
  status: 'pending' | 'approved' | 'active' | 'completed' | 'declined'
  request_date: string
  due_date?: string
  interest_rate?: string
  repayment_period?: string
}

export default function LoansScreen() {
  const navigation = useNavigation<any>()
  const [activeTab, setActiveTab] = useState<LoanTab>('pending')
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchLoans()
  }, [])

  const fetchLoans = async () => {
    try {
      setLoading(true)
      const response = await loanAPI.getLoans()
      console.log('Loans fetched:', response.data)
      
      // Handle different response structures
      let loansData = []
      if (Array.isArray(response.data)) {
        loansData = response.data
      } else if (response.data.results) {
        loansData = response.data.results
      } else {
        loansData = []
      }
      
      setLoans(loansData)
    } catch (error: any) {
      console.error('Failed to fetch loans:', error)
      Alert.alert('Error', 'Failed to load loans. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    fetchLoans()
  }

  const getFilteredLoans = () => {
    if (activeTab === 'all') return loans
    return loans.filter(loan => loan.status === activeTab)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b'
      case 'approved': return colors.primary
      case 'active': return '#059669'
      case 'completed': return '#059669'
      case 'declined': return '#dc2626'
      default: return '#6b7280'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'time-outline'
      case 'approved': return 'checkmark-circle-outline'
      case 'active': return 'checkmark-done-circle-outline'
      case 'completed': return 'checkmark-done-circle-outline'
      case 'declined': return 'close-circle-outline'
      default: return 'ellipse-outline'
    }
  }

  const handleLoanPress = (loan: Loan) => {
    const params = { loanId: loan.id }
    if (loan.status === 'pending') {
      navigation.navigate('LoanApproval', params)
    } else if (loan.status === 'approved') {
      navigation.navigate('LoanDisbursement', params)
    } else {
      navigation.navigate('LoanDetails', params)
    }
  }

  const handleDecline = (loanId: string) => {
    Alert.alert(
      'Decline Loan',
      'Are you sure you want to decline this loan request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              await loanAPI.declineLoan(loanId, {})
              Alert.alert('✅ Success', 'Loan declined successfully!')
              fetchLoans()
            } catch (error: any) {
              console.error('Failed to decline loan:', error)
              Alert.alert('❌ Error', error?.response?.data?.error || 'Failed to decline loan')
            }
          }
        }
      ]
    )
  }

  const renderLoanItem = ({ item }: { item: Loan }) => (
    <TouchableOpacity 
      style={styles.loanCard} 
      onPress={() => handleLoanPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.loanHeader}>
        <View style={styles.memberInfo}>
          <View style={styles.memberAvatar}>
            <Text style={styles.memberInitial}>
              {item.member?.full_name?.charAt(0) || '?'}
            </Text>
          </View>
          <View style={styles.memberDetails}>
            <Text style={styles.memberName}>{item.member?.full_name || 'Unknown'}</Text>
            <Text style={styles.loanPurpose} numberOfLines={1}>
              {item.purpose || 'No purpose specified'}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}15` }]}>
          <Icon name={getStatusIcon(item.status)} size={14} color={getStatusColor(item.status)} />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.loanMiddle}>
        <View style={styles.loanDetail}>
          <Text style={styles.loanDetailLabel}>Amount</Text>
          <Text style={styles.loanDetailValue}>
            MK {Number(item.amount).toLocaleString()}
          </Text>
        </View>
        <View style={styles.loanDetail}>
          <Text style={styles.loanDetailLabel}>Date</Text>
          <Text style={styles.loanDetailValue}>
            {new Date(item.request_date).toLocaleDateString()}
          </Text>
        </View>
        {item.due_date && (
          <View style={styles.loanDetail}>
            <Text style={styles.loanDetailLabel}>Due Date</Text>
            <Text style={styles.loanDetailValue}>
              {new Date(item.due_date).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.loanFooter}>
        <View style={styles.actionButtons}>
          {item.status === 'pending' && (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.approveBtn]}
                onPress={() => navigation.navigate('LoanApproval', { loanId: item.id })}
                activeOpacity={0.7}
              >
                <Icon name="checkmark" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.declineBtn]}
                onPress={() => handleDecline(item.id)}
                activeOpacity={0.7}
              >
                <Icon name="close" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Decline</Text>
              </TouchableOpacity>
            </>
          )}
          {item.status === 'approved' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.disburseBtn]}
              onPress={() => navigation.navigate('LoanDisbursement', { loanId: item.id })}
              activeOpacity={0.7}
            >
              <Icon name="cash-outline" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Disburse</Text>
            </TouchableOpacity>
          )}
          {(item.status === 'active' || item.status === 'completed') && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.viewBtn]}
              onPress={() => navigation.navigate('LoanDetails', { loanId: item.id })}
              activeOpacity={0.7}
            >
              <Icon name="eye-outline" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>View</Text>
            </TouchableOpacity>
          )}
          {item.status === 'declined' && (
            <View style={styles.declinedBadge}>
              <Icon name="close-circle" size={16} color="#dc2626" />
              <Text style={styles.declinedText}>Declined</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading loans...</Text>
        </View>
      </SafeAreaView>
    )
  }

  const filteredLoans = getFilteredLoans()

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Loan Management</Text>
        <TouchableOpacity
          style={styles.newLoanBtn}
          onPress={() => navigation.navigate('LoanRequest')}
          activeOpacity={0.7}
        >
          <Icon name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredLoans}
        keyExtractor={(item) => item.id}
        renderItem={renderLoanItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[colors.primary]} 
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.tabContainer}>
            {['pending', 'approved', 'active', 'all'].map((tab) => {
              const count = tab === 'all' 
                ? loans.length 
                : loans.filter(l => l.status === tab).length
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, activeTab === tab && styles.tabActive]}
                  onPress={() => setActiveTab(tab as LoanTab)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                    {tab.toUpperCase()}
                  </Text>
                  {count > 0 && (
                    <View style={[styles.tabBadge, activeTab === tab && styles.tabBadgeActive]}>
                      <Text style={styles.tabBadgeText}>{count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="document-text-outline" size={64} color={colors.textMuted} />
            <Text style={styles.emptyText}>No {activeTab} loans found</Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'pending' 
                ? 'No pending loan requests to review' 
                : activeTab === 'approved'
                ? 'No approved loans waiting for disbursement'
                : activeTab === 'active'
                ? 'No active loans'
                : 'No loans found'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background 
  },
  centerContent: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    marginTop: 12, 
    color: colors.textMuted, 
    fontSize: 14 
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: colors.text 
  },
  newLoanBtn: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  tabContainer: { 
    flexDirection: 'row', 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    flexWrap: 'wrap',
    gap: 6,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  tabActive: { 
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: { 
    fontSize: 12, 
    color: colors.textMuted, 
    fontWeight: '500' 
  },
  tabTextActive: { 
    color: '#fff' 
  },
  tabBadge: {
    backgroundColor: colors.textMuted + '30',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: '#ffffff30',
  },
  tabBadgeText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  listContent: { 
    padding: 16, 
    paddingTop: 0 
  },
  loanCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loanHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 12,
  },
  memberInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1 
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberInitial: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: colors.primary 
  },
  memberDetails: {
    flex: 1,
  },
  memberName: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: colors.text 
  },
  loanPurpose: { 
    fontSize: 12, 
    color: colors.textMuted, 
    marginTop: 2 
  },
  statusBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statusText: { 
    fontSize: 10, 
    fontWeight: '600', 
    marginLeft: 4 
  },
  loanMiddle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  loanDetail: {
    flex: 1,
    alignItems: 'center',
  },
  loanDetailLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  loanDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
  },
  loanFooter: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end',
  },
  actionButtons: { 
    flexDirection: 'row', 
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  actionBtn: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14, 
    paddingVertical: 7, 
    borderRadius: 8,
    gap: 4,
  },
  approveBtn: { 
    backgroundColor: '#059669' 
  },
  declineBtn: { 
    backgroundColor: '#dc2626' 
  },
  disburseBtn: { 
    backgroundColor: colors.primary 
  },
  viewBtn: { 
    backgroundColor: '#6b7280' 
  },
  actionBtnText: { 
    color: '#fff', 
    fontSize: 12, 
    fontWeight: '600' 
  },
  declinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  declinedText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 60 
  },
  emptyText: { 
    marginTop: 12, 
    color: colors.textMuted, 
    fontSize: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 14,
  },
})