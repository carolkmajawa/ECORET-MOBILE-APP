// // src/screens/ReportsScreen.tsx - FIXED DATA FETCHING
// import React, { useState, useEffect, useCallback } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   SafeAreaView,
//   TouchableOpacity,
//   ActivityIndicator,
//   Alert,
//   TextInput,
//   FlatList,
//   Modal,
//   RefreshControl,
// } from 'react-native';
// import { colors } from '../theme/colors';
// import { groupAPI } from '../api/endpoints';
// import { api } from '../api/client';

// interface Member {
//   id: string;
//   full_name: string;
//   phone_number: string;
// }

// interface Transaction {
//   id: string;
//   date: string;
//   type: 'deposit' | 'withdrawal' | 'loan_repayment' | 'loan_disbursement';
//   amount: number;
//   description: string;
//   balance: number;
//   member_name?: string;
//   reference?: string;
// }

// interface MemberStatement {
//   member: Member;
//   transactions: Transaction[];
//   total_deposits: number;
//   total_withdrawals: number;
//   current_balance: number;
// }

// interface SavingsStatement {
//   period: string;
//   total_deposits: number;
//   total_withdrawals: number;
//   closing_balance: number;
//   transactions: Transaction[];
// }

// type ReportType = 'member' | 'savings';

// export function ReportsScreen({ navigation }: any) {
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [reportType, setReportType] = useState<ReportType>('member');
//   const [searchQuery, setSearchQuery] = useState('');
//   const [selectedMember, setSelectedMember] = useState<Member | null>(null);
//   const [members, setMembers] = useState<Member[]>([]);
//   const [memberStatements, setMemberStatements] = useState<MemberStatement[]>([]);
//   const [savingsStatement, setSavingsStatement] = useState<SavingsStatement | null>(null);
//   const [showMemberSelector, setShowMemberSelector] = useState(false);
//   const [groupId, setGroupId] = useState<string | null>(null);

//   useEffect(() => {
//     loadGroupAndData();
//   }, []);

//   const loadGroupAndData = async () => {
//     try {
//       setLoading(true);
//       const response = await groupAPI.getGroups();
//       const results = Array.isArray(response.data) ? response.data : response.data.results || [];
//       if (results.length > 0) {
//         setGroupId(results[0].id);
//         await loadMembers(results[0].id);
//         await loadSavingsData(results[0].id);
//       } else {
//         Alert.alert('No Group', 'You are not assigned to any group yet.');
//       }
//     } catch (error) {
//       console.error('Failed to load group:', error);
//       Alert.alert('Error', 'Failed to load group data');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const loadMembers = async (groupId: string) => {
//     try {
//       const response = await groupAPI.getMembers(groupId);
//       const membersData = Array.isArray(response.data) ? response.data : [];
//       console.log('Members loaded:', membersData.length);
//       setMembers(membersData.map((m: any) => ({
//         id: m.id,
//         full_name: m.full_name,
//         phone_number: m.phone_number,
//       })));
      
//       if (membersData.length > 0) {
//         setSelectedMember({
//           id: membersData[0].id,
//           full_name: membersData[0].full_name,
//           phone_number: membersData[0].phone_number,
//         });
//       }
//     } catch (error) {
//       console.error('Failed to load members:', error);
//     }
//   };

//   const loadSavingsData = async (groupId: string) => {
//     try {
//       console.log('Loading savings data for group:', groupId);
      
//       // Fetch all savings for the group
//       const response = await api.get(`/savings/?group=${groupId}`);
//       console.log('Savings API response:', response.data);
      
//       let allSavings = [];
//       if (Array.isArray(response.data)) {
//         allSavings = response.data;
//       } else if (response.data.results) {
//         allSavings = response.data.results;
//       }
      
//       console.log('Total savings records:', allSavings.length);
      
//       if (allSavings.length === 0) {
//         console.log('No savings records found');
//         setMemberStatements(members.map(m => ({
//           member: m,
//           transactions: [],
//           total_deposits: 0,
//           total_withdrawals: 0,
//           current_balance: 0,
//         })));
//         setSavingsStatement({
//           period: 'All Time',
//           total_deposits: 0,
//           total_withdrawals: 0,
//           closing_balance: 0,
//           transactions: [],
//         });
//         return;
//       }

//       // Group savings by member
//       const savingsByMember: { [key: string]: any[] } = {};
//       allSavings.forEach((s: any) => {
//         const memberId = s.member || s.member_id;
//         if (!savingsByMember[memberId]) {
//           savingsByMember[memberId] = [];
//         }
//         savingsByMember[memberId].push(s);
//       });

//       // Build member statements
//       const statements: MemberStatement[] = members.map((member) => {
//         const memberSavings = savingsByMember[member.id] || [];
        
//         // Convert savings to transactions
//         const transactions: Transaction[] = memberSavings.map((s: any) => {
//           const isDeposit = s.transaction_type === 'deposit';
//           return {
//             id: s.id,
//             date: s.transaction_date || s.created_at,
//             type: isDeposit ? 'deposit' : 'withdrawal',
//             amount: parseFloat(s.amount),
//             description: s.notes || `${isDeposit ? 'Deposit' : 'Withdrawal'} of MK${s.amount}`,
//             balance: 0,
//             member_name: member.full_name,
//             reference: s.reference_number || s.id,
//           };
//         });

//         // Sort by date
//         transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

//         // Calculate running balance
//         let runningBalance = 0;
//         transactions.forEach(t => {
//           if (t.type === 'deposit') {
//             runningBalance += t.amount;
//           } else {
//             runningBalance -= t.amount;
//           }
//           t.balance = runningBalance;
//         });

//         // Calculate totals
//         const total_deposits = transactions
//           .filter(t => t.type === 'deposit')
//           .reduce((sum, t) => sum + t.amount, 0);

//         const total_withdrawals = transactions
//           .filter(t => t.type === 'withdrawal')
//           .reduce((sum, t) => sum + t.amount, 0);

//         return {
//           member: member,
//           transactions: transactions,
//           total_deposits: total_deposits,
//           total_withdrawals: total_withdrawals,
//           current_balance: total_deposits - total_withdrawals,
//         };
//       });

//       setMemberStatements(statements);

//       // Build group savings statement
//       const allTransactions: Transaction[] = allSavings.map((s: any) => {
//         const isDeposit = s.transaction_type === 'deposit';
//         const member = members.find(m => m.id === (s.member || s.member_id));
//         return {
//           id: s.id,
//           date: s.transaction_date || s.created_at,
//           type: isDeposit ? 'deposit' : 'withdrawal',
//           amount: parseFloat(s.amount),
//           description: s.notes || `${isDeposit ? 'Deposit' : 'Withdrawal'} of MK${s.amount}`,
//           balance: 0,
//           member_name: member?.full_name || 'Unknown Member',
//           reference: s.reference_number || s.id,
//         };
//       });

//       // Sort by date
//       allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

//       // Calculate running balance for all transactions
//       let runningBalance = 0;
//       allTransactions.forEach(t => {
//         if (t.type === 'deposit') {
//           runningBalance += t.amount;
//         } else {
//           runningBalance -= t.amount;
//         }
//         t.balance = runningBalance;
//       });

//       const total_deposits = allTransactions
//         .filter(t => t.type === 'deposit')
//         .reduce((sum, t) => sum + t.amount, 0);

//       const total_withdrawals = allTransactions
//         .filter(t => t.type === 'withdrawal')
//         .reduce((sum, t) => sum + t.amount, 0);

//       setSavingsStatement({
//         period: 'All Time',
//         total_deposits: total_deposits,
//         total_withdrawals: total_withdrawals,
//         closing_balance: total_deposits - total_withdrawals,
//         transactions: allTransactions,
//       });

//       console.log('Member statements built:', statements.length);
//       console.log('First member statement:', statements[0]);

//     } catch (error) {
//       console.error('Failed to load savings data:', error);
//       console.error('Error details:', JSON.stringify(error, null, 2));
      
//       // Set empty data
//       setMemberStatements(members.map(m => ({
//         member: m,
//         transactions: [],
//         total_deposits: 0,
//         total_withdrawals: 0,
//         current_balance: 0,
//       })));
//       setSavingsStatement({
//         period: 'All Time',
//         total_deposits: 0,
//         total_withdrawals: 0,
//         closing_balance: 0,
//         transactions: [],
//       });
//     }
//   };

//   const onRefresh = async () => {
//     setRefreshing(true);
//     if (groupId) {
//       await loadMembers(groupId);
//       await loadSavingsData(groupId);
//     }
//     setRefreshing(false);
//   };

//   const handleSearch = (text: string) => {
//     setSearchQuery(text);
//   };

//   const filterTransactions = (transactions: Transaction[]) => {
//     if (!searchQuery) return transactions;
    
//     const query = searchQuery.toLowerCase();
//     return transactions.filter(t => 
//       t.description?.toLowerCase().includes(query) ||
//       t.member_name?.toLowerCase().includes(query) ||
//       t.reference?.toLowerCase().includes(query) ||
//       t.type.toLowerCase().includes(query)
//     );
//   };

//   const getMemberStatement = (memberId: string) => {
//     return memberStatements.find(ms => ms.member.id === memberId);
//   };

//   const renderTransaction = ({ item }: { item: Transaction }) => {
//     const isCredit = item.type === 'deposit' || item.type === 'loan_disbursement';
//     const isDebit = item.type === 'withdrawal' || item.type === 'loan_repayment';
    
//     return (
//       <View style={styles.transactionItem}>
//         <View style={styles.transactionLeft}>
//           <View style={[
//             styles.transactionIcon,
//             isCredit ? styles.creditIcon : styles.debitIcon
//           ]}>
//             <Text style={styles.transactionIconText}>
//               {isCredit ? '💰' : '💸'}
//             </Text>
//           </View>
//           <View>
//             <Text style={styles.transactionDescription}>{item.description}</Text>
//             <Text style={styles.transactionMeta}>
//               {item.member_name && `${item.member_name} • `}
//               {new Date(item.date).toLocaleDateString()}
//               {item.reference && ` • Ref: ${item.reference}`}
//             </Text>
//           </View>
//         </View>
//         <View style={styles.transactionRight}>
//           <Text style={[
//             styles.transactionAmount,
//             isCredit ? styles.creditAmount : styles.debitAmount
//           ]}>
//             {isCredit ? '+' : '-'} MK{item.amount.toLocaleString()}
//           </Text>
//           <Text style={styles.transactionBalance}>
//             Balance: MK{item.balance.toLocaleString()}
//           </Text>
//         </View>
//       </View>
//     );
//   };

//   const renderMemberCard = ({ item }: { item: Member }) => (
//     <TouchableOpacity
//       style={[
//         styles.memberCard,
//         selectedMember?.id === item.id && styles.selectedMemberCard
//       ]}
//       onPress={() => {
//         setSelectedMember(item);
//         setShowMemberSelector(false);
//       }}
//       activeOpacity={0.7}
//     >
//       <Text style={styles.memberCardName}>{item.full_name}</Text>
//       <Text style={styles.memberCardPhone}>{item.phone_number}</Text>
//     </TouchableOpacity>
//   );

//   const renderMemberStatement = () => {
//     if (!selectedMember) return null;
    
//     const statement = getMemberStatement(selectedMember.id);
//     if (!statement) return null;
    
//     const filteredTransactions = filterTransactions(statement.transactions);
    
//     return (
//       <View style={styles.statementContainer}>
//         <View style={styles.statementHeader}>
//           <View>
//             <Text style={styles.statementTitle}>Member Statement</Text>
//             <Text style={styles.statementSubtitle}>{selectedMember.full_name}</Text>
//           </View>
//           <TouchableOpacity style={styles.downloadButton}>
//             <Text style={styles.downloadButtonText}>📥 Download</Text>
//           </TouchableOpacity>
//         </View>

//         <View style={styles.summaryCards}>
//           <View style={styles.summaryCard}>
//             <Text style={styles.summaryLabel}>Total Deposits</Text>
//             <Text style={[styles.summaryValue, styles.creditAmount]}>
//               MK{statement.total_deposits.toLocaleString()}
//             </Text>
//           </View>
//           <View style={styles.summaryCard}>
//             <Text style={styles.summaryLabel}>Total Withdrawals</Text>
//             <Text style={[styles.summaryValue, styles.debitAmount]}>
//               MK{statement.total_withdrawals.toLocaleString()}
//             </Text>
//           </View>
//           <View style={[styles.summaryCard, styles.balanceCard]}>
//             <Text style={styles.summaryLabel}>Current Balance</Text>
//             <Text style={[styles.summaryValue, styles.balanceAmount]}>
//               MK{statement.current_balance.toLocaleString()}
//             </Text>
//           </View>
//         </View>

//         {filteredTransactions.length === 0 ? (
//           <View style={styles.emptyState}>
//             <Text style={styles.emptyEmoji}>📭</Text>
//             <Text style={styles.emptyText}>No transactions found</Text>
//             <Text style={styles.emptySubtext}>
//               {searchQuery ? 'Try adjusting your search' : 'This member has no transactions yet'}
//             </Text>
//           </View>
//         ) : (
//           <FlatList
//             data={filteredTransactions}
//             renderItem={renderTransaction}
//             keyExtractor={(item) => item.id}
//             scrollEnabled={false}
//             contentContainerStyle={styles.transactionsList}
//           />
//         )}
//       </View>
//     );
//   };

//   const renderSavingsStatement = () => {
//     if (!savingsStatement) return null;
    
//     const filteredTransactions = filterTransactions(savingsStatement.transactions);
    
//     return (
//       <View style={styles.statementContainer}>
//         <View style={styles.statementHeader}>
//           <View>
//             <Text style={styles.statementTitle}>Savings Statement</Text>
//             <Text style={styles.statementSubtitle}>{savingsStatement.period}</Text>
//           </View>
//           <TouchableOpacity style={styles.downloadButton}>
//             <Text style={styles.downloadButtonText}>📥 Download</Text>
//           </TouchableOpacity>
//         </View>

//         <View style={styles.summaryCards}>
//           <View style={styles.summaryCard}>
//             <Text style={styles.summaryLabel}>Total Deposits</Text>
//             <Text style={[styles.summaryValue, styles.creditAmount]}>
//               MK{savingsStatement.total_deposits.toLocaleString()}
//             </Text>
//           </View>
//           <View style={styles.summaryCard}>
//             <Text style={styles.summaryLabel}>Total Withdrawals</Text>
//             <Text style={[styles.summaryValue, styles.debitAmount]}>
//               MK{savingsStatement.total_withdrawals.toLocaleString()}
//             </Text>
//           </View>
//           <View style={[styles.summaryCard, styles.balanceCard]}>
//             <Text style={styles.summaryLabel}>Closing Balance</Text>
//             <Text style={[styles.summaryValue, styles.balanceAmount]}>
//               MK{savingsStatement.closing_balance.toLocaleString()}
//             </Text>
//           </View>
//         </View>

//         {filteredTransactions.length === 0 ? (
//           <View style={styles.emptyState}>
//             <Text style={styles.emptyEmoji}>📭</Text>
//             <Text style={styles.emptyText}>No savings transactions found</Text>
//             <Text style={styles.emptySubtext}>
//               {searchQuery ? 'Try adjusting your search' : 'No savings activity recorded yet'}
//             </Text>
//           </View>
//         ) : (
//           <FlatList
//             data={filteredTransactions}
//             renderItem={renderTransaction}
//             keyExtractor={(item) => item.id}
//             scrollEnabled={false}
//             contentContainerStyle={styles.transactionsList}
//           />
//         )}
//       </View>
//     );
//   };

//   if (loading) {
//     return (
//       <SafeAreaView style={styles.centered}>
//         <ActivityIndicator size="large" color={colors.primary} />
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       <View style={styles.header}>
//         <Text style={styles.title}>Reports</Text>
//         <Text style={styles.subtitle}>View member and savings statements</Text>
//       </View>

//       {/* Report Type Selector */}
//       <View style={styles.tabContainer}>
//         <TouchableOpacity
//           style={[styles.tab, reportType === 'member' && styles.activeTab]}
//           onPress={() => setReportType('member')}
//           activeOpacity={0.7}
//         >
//           <Text style={[styles.tabText, reportType === 'member' && styles.activeTabText]}>
//             Member Statements
//           </Text>
//         </TouchableOpacity>
//         <TouchableOpacity
//           style={[styles.tab, reportType === 'savings' && styles.activeTab]}
//           onPress={() => setReportType('savings')}
//           activeOpacity={0.7}
//         >
//           <Text style={[styles.tabText, reportType === 'savings' && styles.activeTabText]}>
//             Savings Statement
//           </Text>
//         </TouchableOpacity>
//       </View>

//       {/* Search Bar */}
//       <View style={styles.searchContainer}>
//         <View style={styles.searchBar}>
//           <Text style={styles.searchIcon}>🔍</Text>
//           <TextInput
//             style={styles.searchInput}
//             placeholder="Search by name, date, or reference..."
//             value={searchQuery}
//             onChangeText={handleSearch}
//             placeholderTextColor={colors.secondary}
//           />
//           {searchQuery.length > 0 && (
//             <TouchableOpacity onPress={() => setSearchQuery('')}>
//               <Text style={styles.clearSearch}>✕</Text>
//             </TouchableOpacity>
//           )}
//         </View>
//         {reportType === 'member' && (
//           <TouchableOpacity
//             style={styles.memberSelectorButton}
//             onPress={() => setShowMemberSelector(true)}
//             activeOpacity={0.7}
//           >
//             <Text style={styles.memberSelectorButtonText}>
//               {selectedMember?.full_name || 'Select Member'}
//             </Text>
//             <Text style={styles.memberSelectorArrow}>▼</Text>
//           </TouchableOpacity>
//         )}
//       </View>

//       {/* Content */}
//       <ScrollView
//         contentContainerStyle={styles.scrollContent}
//         refreshControl={
//           <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
//         }
//       >
//         {reportType === 'member' ? renderMemberStatement() : renderSavingsStatement()}
//       </ScrollView>

//       {/* Member Selector Modal */}
//       <Modal
//         visible={showMemberSelector}
//         transparent
//         animationType="slide"
//         onRequestClose={() => setShowMemberSelector(false)}
//       >
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContent}>
//             <View style={styles.modalHeader}>
//               <Text style={styles.modalTitle}>Select Member</Text>
//               <TouchableOpacity
//                 onPress={() => setShowMemberSelector(false)}
//                 activeOpacity={0.7}
//               >
//                 <Text style={styles.modalClose}>✕</Text>
//               </TouchableOpacity>
//             </View>
//             <FlatList
//               data={members}
//               renderItem={renderMemberCard}
//               keyExtractor={(item) => item.id}
//               contentContainerStyle={styles.memberList}
//             />
//           </View>
//         </View>
//       </Modal>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: colors.background,
//   },
//   centered: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: colors.background,
//   },
//   header: {
//     padding: 20,
//     paddingBottom: 12,
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: colors.text,
//   },
//   subtitle: {
//     fontSize: 14,
//     color: colors.secondary,
//     marginTop: 4,
//   },
//   tabContainer: {
//     flexDirection: 'row',
//     paddingHorizontal: 20,
//     marginBottom: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: colors.border,
//   },
//   tab: {
//     paddingVertical: 12,
//     paddingHorizontal: 16,
//     marginRight: 8,
//   },
//   activeTab: {
//     borderBottomWidth: 2,
//     borderBottomColor: colors.primary,
//   },
//   tabText: {
//     fontSize: 14,
//     color: colors.secondary,
//   },
//   activeTabText: {
//     color: colors.primary,
//     fontWeight: '600',
//   },
//   searchContainer: {
//     paddingHorizontal: 20,
//     marginBottom: 12,
//     gap: 8,
//   },
//   searchBar: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: colors.surface,
//     borderRadius: 8,
//     paddingHorizontal: 12,
//     borderWidth: 1,
//     borderColor: colors.border,
//   },
//   searchIcon: {
//     fontSize: 16,
//     marginRight: 8,
//   },
//   searchInput: {
//     flex: 1,
//     paddingVertical: 10,
//     fontSize: 16,
//     color: colors.text,
//   },
//   clearSearch: {
//     padding: 4,
//     fontSize: 16,
//     color: colors.secondary,
//   },
//   memberSelectorButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     backgroundColor: colors.surface,
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: colors.border,
//   },
//   memberSelectorButtonText: {
//     fontSize: 14,
//     color: colors.text,
//   },
//   memberSelectorArrow: {
//     fontSize: 12,
//     color: colors.secondary,
//   },
//   scrollContent: {
//     padding: 20,
//     paddingBottom: 40,
//   },
//   statementContainer: {
//     backgroundColor: colors.surface,
//     borderRadius: 12,
//     padding: 16,
//     borderWidth: 1,
//     borderColor: colors.border,
//   },
//   statementHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'flex-start',
//     marginBottom: 16,
//   },
//   statementTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: colors.text,
//   },
//   statementSubtitle: {
//     fontSize: 14,
//     color: colors.secondary,
//     marginTop: 2,
//   },
//   downloadButton: {
//     backgroundColor: colors.primary,
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 6,
//   },
//   downloadButtonText: {
//     color: '#fff',
//     fontSize: 12,
//     fontWeight: '600',
//   },
//   summaryCards: {
//     flexDirection: 'row',
//     gap: 8,
//     marginBottom: 16,
//   },
//   summaryCard: {
//     flex: 1,
//     backgroundColor: colors.background,
//     padding: 12,
//     borderRadius: 8,
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: colors.border,
//   },
//   balanceCard: {
//     backgroundColor: '#dbeafe',
//     borderColor: '#93c5fd',
//   },
//   summaryLabel: {
//     fontSize: 10,
//     color: colors.secondary,
//     textTransform: 'uppercase',
//     fontWeight: '600',
//   },
//   summaryValue: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     marginTop: 4,
//   },
//   creditAmount: {
//     color: '#059669',
//   },
//   debitAmount: {
//     color: '#dc2626',
//   },
//   balanceAmount: {
//     color: '#1d4ed8',
//   },
//   transactionsList: {
//     gap: 8,
//   },
//   transactionItem: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingVertical: 10,
//     paddingHorizontal: 12,
//     backgroundColor: colors.background,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: colors.border,
//   },
//   transactionLeft: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     flex: 1,
//   },
//   transactionIcon: {
//     width: 36,
//     height: 36,
//     borderRadius: 18,
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginRight: 10,
//   },
//   creditIcon: {
//     backgroundColor: '#d1fae5',
//   },
//   debitIcon: {
//     backgroundColor: '#fee2e2',
//   },
//   transactionIconText: {
//     fontSize: 16,
//   },
//   transactionDescription: {
//     fontSize: 14,
//     fontWeight: '500',
//     color: colors.text,
//   },
//   transactionMeta: {
//     fontSize: 12,
//     color: colors.secondary,
//     marginTop: 2,
//   },
//   transactionRight: {
//     alignItems: 'flex-end',
//   },
//   transactionAmount: {
//     fontSize: 14,
//     fontWeight: '600',
//   },
//   transactionBalance: {
//     fontSize: 11,
//     color: colors.secondary,
//     marginTop: 2,
//   },
//   emptyState: {
//     alignItems: 'center',
//     paddingVertical: 40,
//   },
//   emptyEmoji: {
//     fontSize: 48,
//     marginBottom: 12,
//   },
//   emptyText: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: colors.text,
//   },
//   emptySubtext: {
//     fontSize: 14,
//     color: colors.secondary,
//     marginTop: 4,
//     textAlign: 'center',
//   },
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 20,
//   },
//   modalContent: {
//     backgroundColor: colors.surface,
//     borderRadius: 16,
//     padding: 20,
//     width: '100%',
//     maxWidth: 400,
//     maxHeight: '80%',
//   },
//   modalHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 16,
//     paddingBottom: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: colors.border,
//   },
//   modalTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: colors.text,
//   },
//   modalClose: {
//     fontSize: 20,
//     color: colors.secondary,
//     padding: 4,
//   },
//   memberList: {
//     gap: 8,
//   },
//   memberCard: {
//     padding: 12,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: colors.border,
//     backgroundColor: colors.background,
//   },
//   selectedMemberCard: {
//     borderColor: colors.primary,
//     backgroundColor: colors.primary + '15',
//   },
//   memberCardName: {
//     fontSize: 16,
//     fontWeight: '500',
//     color: colors.text,
//   },
//   memberCardPhone: {
//     fontSize: 12,
//     color: colors.secondary,
//     marginTop: 2,
//   },
// });



// src/screens/ReportsScreen.tsx - COMPLETE WITH BLUE HEADER, BACK NAV, MEMBER NAMES & ALL TRANSACTIONS
// src/screens/ReportsScreen.tsx - COMPLETE FIXED WITH WORKING MEMBER STATEMENT

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
  Platform,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../theme/colors';
import { groupAPI, ledgerAPI } from '../api/endpoints';

interface Member {
  id: string;
  full_name: string;
  phone_number: string;
}

interface Transaction {
  id: string;
  date: string;
  type: 'deposit' | 'withdrawal' | 'social_contribution' | 'penalty' | 'loan_repayment' | 'loan_disbursement';
  amount: number;
  description: string;
  balance: number;
  member_name?: string;
  reference?: string;
  category?: string;
}

interface MemberStatement {
  member: Member;
  transactions: Transaction[];
  total_deposits: number;
  total_withdrawals: number;
  total_social: number;
  total_penalties: number;
  current_balance: number;
}

interface SavingsStatement {
  period: string;
  total_deposits: number;
  total_withdrawals: number;
  closing_balance: number;
  transactions: Transaction[];
}

type ReportType = 'member' | 'savings';

export function ReportsScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('member');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberStatements, setMemberStatements] = useState<MemberStatement[]>([]);
  const [savingsStatement, setSavingsStatement] = useState<SavingsStatement | null>(null);
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Refs for tracking
  const isFirstLoad = useRef(true);
  const isDataLoaded = useRef(false);

  // ==================== ANIMATIONS ====================
  
  const animateIn = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    animateIn();
  }, [reportType, selectedMember]);

  useEffect(() => {
    loadGroupAndData();
  }, []);

  const loadGroupAndData = async () => {
    try {
      if (isFirstLoad.current) {
        setLoading(true);
      }
      
      const response = await groupAPI.getGroups();
      const results = Array.isArray(response.data) ? response.data : response.data.results || [];
      if (results.length > 0) {
        const group = results[0];
        setGroupId(group.id);
        const loadedMembers = await loadMembers(group.id);
        await loadSavingsData(group.id, loadedMembers);
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
  };

  const loadMembers = async (groupId: string): Promise<Member[]> => {
    try {
      const response = await groupAPI.getMembers(groupId);
      const membersData = Array.isArray(response.data) ? response.data : [];
      console.log('✅ Members loaded:', membersData.length);
      
      const mappedMembers = membersData.map((m: any) => ({
        id: m.id,
        full_name: m.full_name,
        phone_number: m.phone_number,
      }));
      
      setMembers(mappedMembers);
      
      if (mappedMembers.length > 0) {
        setSelectedMember(mappedMembers[0]);
      }

      return mappedMembers;
    } catch (error) {
      console.error('Failed to load members:', error);
      return [];
    }
  };

  const loadSavingsData = async (groupIdParam?: string, membersParam?: Member[]) => {
    try {
      const groupIdToUse = groupIdParam || groupId;
      const membersToUse = membersParam || members;
      
      if (!groupIdToUse) {
        console.log('⚠️ No groupId available, skipping load');
        return;
      }
      
      console.log('📡 Fetching ledger entries for reports...');
      const response = await ledgerAPI.getEntries(groupIdToUse);
      
      let allEntries = [];
      if (Array.isArray(response.data)) {
        allEntries = response.data;
      } else if (response.data?.results) {
        allEntries = response.data.results;
      } else {
        allEntries = response.data || [];
      }
      
      console.log('📊 Total ledger entries:', allEntries.length);
      
      if (allEntries.length === 0) {
        const emptyStatements = membersToUse.map(m => ({
          member: m,
          transactions: [],
          total_deposits: 0,
          total_withdrawals: 0,
          total_social: 0,
          total_penalties: 0,
          current_balance: 0,
        }));
        setMemberStatements(emptyStatements);
        setSavingsStatement({
          period: 'All Time',
          total_deposits: 0,
          total_withdrawals: 0,
          closing_balance: 0,
          transactions: [],
        });
        return;
      }

      // Create member map for quick lookup
      const memberMap: { [key: string]: Member } = {};
      membersToUse.forEach(m => {
        memberMap[m.id] = m;
      });

      // Group transactions by member
      const buildMemberStatementFromLedger = (member: Member, ledgerData: { balance: number; entries: any[] }): MemberStatement => {
  const transactions: Transaction[] = ledgerData.entries.map((s: any) => {
    const amount = parseFloat(s.amount) || 0;
    const transactionType = s.transaction_type || '';

    let type: Transaction['type'] = 'deposit';
    let description = s.description || s.notes || '';

    if (transactionType === 'withdrawal') {
      type = 'withdrawal'; description = description || 'Withdrawal';
    } else if (transactionType === 'social_contribution') {
      type = 'social_contribution'; description = description || 'Social Contribution';
    } else if (transactionType === 'late_fee' || transactionType === 'meeting_fine') {
      type = 'penalty'; description = description || 'Penalty/Fine';
    } else if (transactionType === 'loan_repayment') {
      type = 'loan_repayment'; description = description || 'Loan Repayment';
    } else if (transactionType === 'loan_disbursement') {
      type = 'loan_disbursement'; description = description || 'Loan Disbursement';
    } else if (transactionType === 'deposit' || transactionType === 'savings_contribution') {
      type = 'deposit'; description = description || 'Deposit';
    }

    return {
      id: s.id,
      date: s.recorded_at || s.created_at || new Date().toISOString(),
      type,
      amount,
      description,
      balance: 0,
      member_name: member.full_name,
      reference: s.reference_number || s.id || '',
      category: s.category || '',
    };
  });

  transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let runningBalance = 0;
  transactions.forEach(t => {
    if (t.type === 'deposit' || t.type === 'loan_repayment') runningBalance += t.amount;
    else if (t.type === 'withdrawal' || t.type === 'loan_disbursement') runningBalance -= t.amount;
    t.balance = runningBalance;
  });

  const sumByType = (type: string) => transactions.filter(t => t.type === type).reduce((s, t) => s + t.amount, 0);

  return {
    member,
    transactions,
    total_deposits: sumByType('deposit'),
    total_withdrawals: sumByType('withdrawal'),
    total_social: sumByType('social_contribution'),
    total_penalties: sumByType('penalty'),
    current_balance: ledgerData.balance, // trust the backend's authoritative balance
  };
};

      // Build member statements from grouped ledger entries
      const statements: MemberStatement[] = membersToUse.map(member => {
        const memberEntries = allEntries.filter((s: any) => {
          let memberId = s.member || s.member_id || '';
          if (typeof memberId === 'object' && memberId.id) {
            memberId = memberId.id;
          }
          return String(memberId) === String(member.id);
        });

        const transactions: Transaction[] = memberEntries.map((s: any) => {
          const amount = parseFloat(s.amount) || 0;
          const transactionType = s.transaction_type || '';

          let type: Transaction['type'] = 'deposit';
          let description = s.description || s.notes || '';

          if (transactionType === 'withdrawal') {
            type = 'withdrawal';
            description = description || 'Withdrawal';
          } else if (transactionType === 'social_contribution') {
            type = 'social_contribution';
            description = description || 'Social Contribution';
          } else if (transactionType === 'late_fee' || transactionType === 'meeting_fine') {
            type = 'penalty';
            description = description || 'Penalty/Fine';
          } else if (transactionType === 'loan_repayment') {
            type = 'loan_repayment';
            description = description || 'Loan Repayment';
          } else if (transactionType === 'loan_disbursement') {
            type = 'loan_disbursement';
            description = description || 'Loan Disbursement';
          } else if (transactionType === 'deposit' || transactionType === 'savings_contribution') {
            type = 'deposit';
            description = description || 'Deposit';
          }

          return {
            id: s.id,
            date: s.recorded_at || s.created_at || new Date().toISOString(),
            type,
            amount,
            description,
            balance: 0,
            member_name: member.full_name,
            reference: s.reference_number || s.id || '',
            category: s.category || '',
          };
        });

        transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let runningBalance = 0;
        transactions.forEach(t => {
          if (t.type === 'deposit' || t.type === 'loan_repayment') runningBalance += t.amount;
          else if (t.type === 'withdrawal' || t.type === 'loan_disbursement') runningBalance -= t.amount;
          t.balance = runningBalance;
        });

        const sumByType = (type: string) =>
          transactions.filter(t => t.type === type).reduce((sum, t) => sum + t.amount, 0);

        return {
          member,
          transactions,
          total_deposits: sumByType('deposit'),
          total_withdrawals: sumByType('withdrawal'),
          total_social: sumByType('social_contribution'),
          total_penalties: sumByType('penalty'),
          current_balance: 0,
        };
      });

      setMemberStatements(statements);
      console.log('✅ Member statements built:', statements.length);
      console.log('✅ First member transactions:', statements[0]?.transactions.length || 0);

      // ✅ Build savings statement - ONLY deposits and withdrawals (no social/penalties)
      const savingsTransactions: Transaction[] = [];
      allEntries.forEach((s: any) => {
        let memberId = s.member || s.member_id || '';
        if (typeof memberId === 'object' && memberId.id) {
          memberId = memberId.id;
        }
        
        const member = memberMap[memberId];
        // ✅ Get member name
        const memberName = member?.full_name || s.member_name || 'Unknown Member';
        const transactionType = s.transaction_type || '';
        const amount = parseFloat(s.amount) || 0;
        
        // ✅ ONLY include deposits and withdrawals in savings statement
        if (transactionType !== 'deposit' && transactionType !== 'savings_contribution' && 
            transactionType !== 'withdrawal' && transactionType !== 'withdraw') {
          return; // Skip social contributions, penalties, loans
        }
        
        let type: Transaction['type'] = 'deposit';
        let description = s.description || s.notes || '';
        
        if (transactionType === 'withdrawal' || transactionType === 'withdraw') {
          type = 'withdrawal';
          description = description || 'Withdrawal';
        } else {
          type = 'deposit';
          description = description || 'Deposit';
        }
        
        savingsTransactions.push({
          id: s.id || `txn_${Date.now()}_${Math.random()}`,
          date: s.recorded_at || s.transaction_date || s.created_at || new Date().toISOString(),
          type: type,
          amount: amount,
          description: description,
          balance: 0,
          member_name: memberName,
          reference: s.reference_number || s.id || '',
          category: s.category || '',
        });
      });

      savingsTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // ✅ Calculate running balance correctly
      let runningBalance = 0;
      savingsTransactions.forEach(t => {
        if (t.type === 'deposit') {
          runningBalance += t.amount;
        } else if (t.type === 'withdrawal') {
          runningBalance -= t.amount;
        }
        t.balance = runningBalance;
      });

      const total_deposits = savingsTransactions
        .filter(t => t.type === 'deposit')
        .reduce((sum, t) => sum + t.amount, 0);

      const total_withdrawals = savingsTransactions
        .filter(t => t.type === 'withdrawal')
        .reduce((sum, t) => sum + t.amount, 0);

      setSavingsStatement({
        period: 'All Time',
        total_deposits: total_deposits,
        total_withdrawals: total_withdrawals,
        closing_balance: total_deposits - total_withdrawals,
        transactions: savingsTransactions,
      });

      console.log('✅ Savings statement built with', savingsTransactions.length, 'transactions');

    } catch (error: any) {
      console.error('❌ Failed to load savings data:', error);
      const emptyStatements = membersParam || members;
      const emptyMemberStatements = emptyStatements.map(m => ({
        member: m,
        transactions: [],
        total_deposits: 0,
        total_withdrawals: 0,
        total_social: 0,
        total_penalties: 0,
        current_balance: 0,
      }));
      setMemberStatements(emptyMemberStatements);
      setSavingsStatement({
        period: 'All Time',
        total_deposits: 0,
        total_withdrawals: 0,
        closing_balance: 0,
        transactions: [],
      });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (groupId) {
      const loadedMembers = await loadMembers(groupId);
      await loadSavingsData(groupId, loadedMembers);
    } else {
      await loadGroupAndData();
    }
    setRefreshing(false);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const filterTransactions = (transactions: Transaction[]) => {
    if (!searchQuery) return transactions;
    
    const query = searchQuery.toLowerCase();
    return transactions.filter(t => 
      t.description?.toLowerCase().includes(query) ||
      t.member_name?.toLowerCase().includes(query) ||
      t.reference?.toLowerCase().includes(query) ||
      t.type.toLowerCase().includes(query)
    );
  };

  const getMemberStatement = (memberId: string) => {
    return memberStatements.find(ms => ms.member.id === memberId);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return '💰';
      case 'withdrawal':
        return '💸';
      case 'social_contribution':
        return '🤝';
      case 'penalty':
        return '⚠️';
      case 'loan_repayment':
        return '💵';
      case 'loan_disbursement':
        return '🏦';
      default:
        return '📝';
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'Deposit';
      case 'withdrawal':
        return 'Withdrawal';
      case 'social_contribution':
        return 'Social';
      case 'penalty':
        return 'Penalty';
      case 'loan_repayment':
        return 'Loan Repayment';
      case 'loan_disbursement':
        return 'Loan Disbursement';
      default:
        return type;
    }
  };

  const generateCSV = (transactions: Transaction[], title: string): string => {
    let csv = `${title}\n\n`;
    csv += 'Date,Type,Member,Amount,Balance,Description,Reference\n';
    csv += '----------------------------------------\n';
    
    transactions.forEach(t => {
      const date = new Date(t.date).toLocaleDateString();
      const type = getTransactionLabel(t.type).toUpperCase();
      const member = (t.member_name || 'N/A').replace(/,/g, ';');
      const amount = t.amount.toFixed(2);
      const balance = t.balance.toFixed(2);
      const description = (t.description || 'N/A').replace(/,/g, ';');
      const reference = (t.reference || 'N/A').replace(/,/g, ';');
      csv += `${date},${type},${member},${amount},${balance},"${description}","${reference}"\n`;
    });
    
    return csv;
  };

  const downloadStatement = async () => {
    try {
      setDownloading(true);
      
      let transactions: Transaction[] = [];
      let title = '';
      
      if (reportType === 'member' && selectedMember) {
        const statement = getMemberStatement(selectedMember.id);
        if (statement) {
          transactions = statement.transactions;
          title = `${selectedMember.full_name} - Member Statement`;
        }
      } else if (reportType === 'savings' && savingsStatement) {
        transactions = savingsStatement.transactions;
        title = 'Savings Statement';
      }
      
      if (transactions.length === 0) {
        Alert.alert('No Data', 'No transactions available to download.');
        setDownloading(false);
        return;
      }
      
      const csvContent = generateCSV(transactions, title);
      const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      
      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        Alert.alert('Download Started', `${fileName} is being downloaded.`);
      } else {
        Alert.alert(
          'Download Report',
          `${title}\n\n${transactions.length} transactions found.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'View CSV',
              onPress: () => {
                const csvPreview = csvContent.length > 500 ? 
                  csvContent.substring(0, 500) + '\n\n... (truncated)' : 
                  csvContent;
                
                Alert.alert(
                  'CSV Data',
                  csvPreview,
                  [
                    { text: 'Close', style: 'cancel' },
                    {
                      text: 'Copy All',
                      onPress: () => {
                        if (navigator && navigator.clipboard) {
                          navigator.clipboard.writeText(csvContent)
                            .then(() => Alert.alert('Success', 'CSV data copied to clipboard!'))
                            .catch(() => Alert.alert('Error', 'Failed to copy. Please select and copy manually.'));
                        } else {
                          Alert.alert(
                            'Copy CSV',
                            'Please select the text above and copy it manually.',
                            [{ text: 'OK' }]
                          );
                        }
                      }
                    }
                  ]
                );
              }
            }
          ]
        );
      }
      
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to download statement. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const isCredit = item.type === 'deposit' || item.type === 'loan_repayment';
    const isDebit = item.type === 'withdrawal' || item.type === 'loan_disbursement';
    const isSocial = item.type === 'social_contribution';
    const isPenalty = item.type === 'penalty';
    
    let bgColor = '#f3f4f6';
    let iconBgColor = '#e5e7eb';
    
    if (isCredit) {
      bgColor = '#d1fae5';
      iconBgColor = '#a7f3d0';
    } else if (isDebit) {
      bgColor = '#fee2e2';
      iconBgColor = '#fecaca';
    } else if (isSocial) {
      bgColor = '#fef3c7';
      iconBgColor = '#fde68a';
    } else if (isPenalty) {
      bgColor = '#fef2f2';
      iconBgColor = '#fecaca';
    }
    
    return (
      <Animated.View style={[
        styles.transactionItem,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }
      ]}>
        <View style={styles.transactionLeft}>
          <View style={[styles.transactionIcon, { backgroundColor: iconBgColor }]}>
            <Text style={styles.transactionIconText}>
              {getTransactionIcon(item.type)}
            </Text>
          </View>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionDescription}>{item.description}</Text>
            <View style={styles.transactionMetaRow}>
              <Text style={[
                styles.transactionType,
                isCredit ? styles.creditText : 
                isDebit ? styles.debitText : 
                isSocial ? styles.socialText : 
                styles.penaltyText
              ]}>
                {getTransactionLabel(item.type)}
              </Text>
              <Text style={styles.transactionMeta}>
                {item.member_name && ` • ${item.member_name}`}
              </Text>
            </View>
            <Text style={styles.transactionMeta}>
              {new Date(item.date).toLocaleDateString()}
              {item.reference && ` • Ref: ${item.reference}`}
            </Text>
          </View>
        </View>
        <View style={styles.transactionRight}>
          <Text style={[
            styles.transactionAmount,
            isCredit ? styles.creditAmount : 
            isDebit ? styles.debitAmount : 
            isSocial ? styles.socialAmount : 
            styles.penaltyAmount
          ]}>
            {isCredit ? '+' : isDebit ? '-' : ''} MK{item.amount.toLocaleString()}
          </Text>
          {(item.type === 'deposit' || item.type === 'withdrawal') && (
            <Text style={styles.transactionBalance}>
              Bal: MK{item.balance.toLocaleString()}
            </Text>
          )}
        </View>
      </Animated.View>
    );
  };

  const renderMemberCard = ({ item }: { item: Member }) => (
    <TouchableOpacity
      style={[
        styles.memberCard,
        selectedMember?.id === item.id && styles.selectedMemberCard
      ]}
      onPress={() => {
        setSelectedMember(item);
        setShowMemberSelector(false);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.memberCardAvatar}>
        <Text style={styles.memberCardAvatarText}>
          {item.full_name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.memberCardInfo}>
        <Text style={styles.memberCardName}>{item.full_name}</Text>
        <Text style={styles.memberCardPhone}>{item.phone_number}</Text>
      </View>
      {selectedMember?.id === item.id && (
        <Icon name="checkmark-circle" size={20} color={colors.primary} />
      )}
    </TouchableOpacity>
  );

  const renderMemberStatement = () => {
    if (!selectedMember) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>👤</Text>
          <Text style={styles.emptyText}>Select a member</Text>
          <Text style={styles.emptySubtext}>Please select a member to view their statement</Text>
        </View>
      );
    }

    const statement = getMemberStatement(selectedMember.id);

    if (!statement) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    const filteredTransactions = filterTransactions(statement.transactions);

    return (
      <Animated.View style={[
        styles.statementContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }
      ]}>
        <View style={styles.statementHeader}>
          <View>
            <Text style={styles.statementTitle}>Member Statement</Text>
            <Text style={styles.statementSubtitle}>{selectedMember.full_name}</Text>
            <Text style={styles.statementPhone}>{selectedMember.phone_number}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.downloadButton, downloading && styles.disabledButton]}
            onPress={downloadStatement}
            disabled={downloading}
            activeOpacity={0.7}
          >
            <Icon name="download-outline" size={18} color="#FFFFFF" />
            <Text style={styles.downloadButtonText}>
              {downloading ? 'Downloading...' : 'Download'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryCards}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Deposits</Text>
            <Text style={[styles.summaryValue, styles.creditAmount]}>
              MK{statement.total_deposits.toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Withdrawals</Text>
            <Text style={[styles.summaryValue, styles.debitAmount]}>
              MK{statement.total_withdrawals.toLocaleString()}
            </Text>
          </View>
          <View style={[styles.summaryCard, styles.balanceCard]}>
            <Text style={styles.summaryLabel}>Balance</Text>
            <Text style={[styles.summaryValue, styles.balanceAmount]}>
              MK{statement.current_balance.toLocaleString()}
            </Text>
          </View>
        </View>

        {(statement.total_social > 0 || statement.total_penalties > 0) && (
          <View style={styles.extraSummaryCards}>
            {statement.total_social > 0 && (
              <View style={[styles.summaryCard, styles.socialCard]}>
                <Text style={styles.summaryLabel}>Social</Text>
                <Text style={[styles.summaryValue, styles.socialAmount]}>
                  MK{statement.total_social.toLocaleString()}
                </Text>
              </View>
            )}
            {statement.total_penalties > 0 && (
              <View style={[styles.summaryCard, styles.penaltyCard]}>
                <Text style={styles.summaryLabel}>Penalties</Text>
                <Text style={[styles.summaryValue, styles.penaltyAmount]}>
                  MK{statement.total_penalties.toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        )}

        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyText}>No transactions found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try adjusting your search' : 'This member has no transactions yet'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredTransactions}
            renderItem={renderTransaction}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.transactionsList}
            ListHeaderComponent={
              <Text style={styles.transactionCount}>
                {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
              </Text>
            }
          />
        )}
      </Animated.View>
    );
  };

  const renderSavingsStatement = () => {
    if (!savingsStatement) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyText}>No savings data</Text>
          <Text style={styles.emptySubtext}>No savings transactions found</Text>
        </View>
      );
    }
    
    const filteredTransactions = filterTransactions(savingsStatement.transactions);
    
    return (
      <Animated.View style={[
        styles.statementContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }
      ]}>
        <View style={styles.statementHeader}>
          <View>
            <Text style={styles.statementTitle}>Savings Statement</Text>
            <Text style={styles.statementSubtitle}>{savingsStatement.period}</Text>
            <Text style={styles.statementCount}>
              {filteredTransactions.length} transactions
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.downloadButton, downloading && styles.disabledButton]}
            onPress={downloadStatement}
            disabled={downloading}
            activeOpacity={0.7}
          >
            <Icon name="download-outline" size={18} color="#FFFFFF" />
            <Text style={styles.downloadButtonText}>
              {downloading ? 'Downloading...' : 'Download'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryCards}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Deposits</Text>
            <Text style={[styles.summaryValue, styles.creditAmount]}>
              MK{savingsStatement.total_deposits.toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Withdrawals</Text>
            <Text style={[styles.summaryValue, styles.debitAmount]}>
              MK{savingsStatement.total_withdrawals.toLocaleString()}
            </Text>
          </View>
          <View style={[styles.summaryCard, styles.balanceCard]}>
            <Text style={styles.summaryLabel}>Closing Balance</Text>
            <Text style={[styles.summaryValue, styles.balanceAmount]}>
              MK{savingsStatement.closing_balance.toLocaleString()}
            </Text>
          </View>
        </View>

        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyText}>No savings transactions found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try adjusting your search' : 'No savings activity recorded yet'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredTransactions}
            renderItem={renderTransaction}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.transactionsList}
            ListHeaderComponent={
              <Text style={styles.transactionCount}>
                {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
              </Text>
            }
          />
        )}
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Blue Header */}
      <View style={styles.blueHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitleWhite}>Reports</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.subtitleContainer}>
        <Text style={styles.subtitle}>View member and savings statements</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, reportType === 'member' && styles.activeTab]}
          onPress={() => setReportType('member')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, reportType === 'member' && styles.activeTabText]}>
            Member Statements
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, reportType === 'savings' && styles.activeTab]}
          onPress={() => setReportType('savings')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, reportType === 'savings' && styles.activeTabText]}>
            Savings Statement
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="search-outline" size={20} color={colors.secondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, date, or reference..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor={colors.secondary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearSearch}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        {reportType === 'member' && (
          <TouchableOpacity
            style={styles.memberSelectorButton}
            onPress={() => setShowMemberSelector(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.memberSelectorButtonText}>
              {selectedMember?.full_name || 'Select Member'}
            </Text>
            <Icon name="chevron-down" size={16} color={colors.secondary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {reportType === 'member' ? renderMemberStatement() : renderSavingsStatement()}
      </ScrollView>

      {/* Member Selector Modal */}
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
                <Icon name="close" size={24} color={colors.secondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={members}
              renderItem={renderMemberCard}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.memberList}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>👤</Text>
                  <Text style={styles.emptyText}>No members found</Text>
                </View>
              }
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
  // Blue Header
  blueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '30',
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerTitleWhite: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: colors.secondary,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
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
  memberSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memberSelectorButtonText: {
    fontSize: 14,
    color: colors.text,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  statementContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  statementTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  statementSubtitle: {
    fontSize: 14,
    color: colors.secondary,
    marginTop: 2,
  },
  statementPhone: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 2,
  },
  statementCount: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 2,
  },
  transactionCount: {
    fontSize: 13,
    color: colors.secondary,
    marginBottom: 10,
    fontWeight: '500',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  summaryCards: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  extraSummaryCards: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  balanceCard: {
    backgroundColor: '#dbeafe',
    borderColor: '#93c5fd',
  },
  socialCard: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  penaltyCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  summaryLabel: {
    fontSize: 10,
    color: colors.secondary,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  creditAmount: {
    color: '#059669',
  },
  debitAmount: {
    color: '#dc2626',
  },
  balanceAmount: {
    color: '#1d4ed8',
  },
  socialAmount: {
    color: '#d97706',
  },
  penaltyAmount: {
    color: '#dc2626',
  },
  creditText: {
    color: '#059669',
  },
  debitText: {
    color: '#dc2626',
  },
  socialText: {
    color: '#d97706',
  },
  penaltyText: {
    color: '#dc2626',
  },
  transactionsList: {
    gap: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
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
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  transactionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  transactionType: {
    fontSize: 11,
    fontWeight: '600',
  },
  transactionMeta: {
    fontSize: 11,
    color: colors.secondary,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  transactionBalance: {
    fontSize: 11,
    color: colors.secondary,
    marginTop: 2,
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
  emptySubtext: {
    fontSize: 14,
    color: colors.secondary,
    marginTop: 4,
    textAlign: 'center',
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
  memberList: {
    gap: 8,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: 12,
  },
  selectedMemberCard: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
  },
  memberCardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberCardAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  memberCardInfo: {
    flex: 1,
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
});