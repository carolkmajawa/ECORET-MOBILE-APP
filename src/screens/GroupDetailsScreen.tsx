// // src/screens/GroupDetailsScreen.tsx
// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
//   SafeAreaView,
//   ActivityIndicator,
//   Alert,
// } from 'react-native';
// import { colors } from '../theme/colors';
// import { groupAPI } from '../api/endpoints';

// interface GroupStats {
//   total_members: number;
//   total_loans: number;
//   active_loans: number;
//   is_active: boolean;
// }

// export default function GroupDetailScreen({ route, navigation }: any) {
//   const { groupId, groupName } = route.params;
//   const [loading, setLoading] = useState(true);
//   const [stats, setStats] = useState<GroupStats | null>(null);

//   useEffect(() => {
//     loadStats();
//   }, [groupId]);

//   const loadStats = async () => {
//     try {
//       const response = await groupAPI.getGroupStatistics(groupId);
//       setStats(response.data);
//     } catch (error) {
//       console.log('Failed to load stats');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const features = [
//     {
//       label: 'Add Records',
//       icon: '📄',
//       description: 'Upload group documents and records',
//       color: '#3b82f6',
//       onPress: () => navigation.navigate('AddRecords', { groupId }),
//     },
//     {
//       label: 'Member Registration',
//       icon: '👤',
//       description: 'Register and manage group members',
//       color: '#10b981',
//       onPress: () => navigation.navigate('MemberRegistration', { groupId }),
//     },
//     {
//       label: 'Bank Account Details',
//       icon: '🏦',
//       description: 'Manage group bank account information',
//       color: '#8b5cf6',
//       onPress: () => navigation.navigate('BankDetails', { groupId }),
//     },
//   ];

//   if (loading) {
//     return (
//       <SafeAreaView style={styles.centered}>
//         <ActivityIndicator size="large" color={colors.primary} />
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       <ScrollView contentContainerStyle={styles.scrollContent}>
//         <View style={styles.header}>
//           <Text style={styles.groupName}>{groupName}</Text>
//           <Text style={styles.groupId}>ID: {groupId}</Text>
//         </View>

//         {/* Quick Stats */}
//         {stats && (
//           <View style={styles.statsContainer}>
//             <View style={styles.statCard}>
//               <Text style={styles.statNumber}>{stats.total_members}</Text>
//               <Text style={styles.statLabel}>Members</Text>
//             </View>
//             <View style={styles.statCard}>
//               <Text style={styles.statNumber}>{stats.total_loans}</Text>
//               <Text style={styles.statLabel}>Total Loans</Text>
//             </View>
//             <View style={styles.statCard}>
//               <Text style={styles.statNumber}>{stats.active_loans}</Text>
//               <Text style={styles.statLabel}>Active Loans</Text>
//             </View>
//             <View style={styles.statCard}>
//               <View style={[styles.statusBadge, stats.is_active ? styles.activeBadge : styles.inactiveBadge]}>
//                 <Text style={styles.statusText}>{stats.is_active ? 'Active' : 'Inactive'}</Text>
//               </View>
//               <Text style={styles.statLabel}>Status</Text>
//             </View>
//           </View>
//         )}

//         <Text style={styles.sectionTitle}>Manage Group</Text>

//         <View style={styles.grid}>
//           {features.map((feature) => (
//             <TouchableOpacity
//               key={feature.label}
//               style={[styles.card, { borderTopColor: feature.color }]}
//               onPress={feature.onPress}
//               activeOpacity={0.7}
//             >
//               <Text style={styles.cardIcon}>{feature.icon}</Text>
//               <Text style={styles.cardLabel}>{feature.label}</Text>
//               <Text style={styles.cardDescription}>{feature.description}</Text>
//               <View style={[styles.cardArrow, { backgroundColor: feature.color }]}>
//                 <Text style={styles.cardArrowText}>→</Text>
//               </View>
//             </TouchableOpacity>
//           ))}
//         </View>
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: colors.background,
//   },
//   scrollContent: {
//     padding: 20,
//   },
//   centered: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: colors.background,
//   },
//   header: {
//     marginBottom: 20,
//   },
//   groupName: {
//     fontSize: 28,
//     fontWeight: 'bold',
//     color: colors.text,
//   },
//   groupId: {
//     fontSize: 14,
//     color: colors.secondary,
//     marginTop: 4,
//   },
//   statsContainer: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 10,
//     marginBottom: 24,
//   },
//   statCard: {
//     flex: 1,
//     minWidth: '45%',
//     backgroundColor: colors.surface,
//     borderRadius: 12,
//     padding: 12,
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: colors.border,
//   },
//   statNumber: {
//     fontSize: 22,
//     fontWeight: 'bold',
//     color: colors.text,
//   },
//   statLabel: {
//     fontSize: 11,
//     color: colors.secondary,
//     marginTop: 2,
//   },
//   statusBadge: {
//     paddingHorizontal: 12,
//     paddingVertical: 4,
//     borderRadius: 12,
//   },
//   activeBadge: {
//     backgroundColor: '#d1fae5',
//   },
//   inactiveBadge: {
//     backgroundColor: '#f3f4f6',
//   },
//   statusText: {
//     fontSize: 10,
//     fontWeight: '600',
//   },
//   sectionTitle: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: colors.text,
//     marginBottom: 16,
//   },
//   grid: {
//     gap: 12,
//   },
//   card: {
//     backgroundColor: colors.surface,
//     borderRadius: 12,
//     padding: 16,
//     borderWidth: 1,
//     borderColor: colors.border,
//     borderTopWidth: 4,
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   cardIcon: {
//     fontSize: 28,
//     marginRight: 14,
//   },
//   cardLabel: {
//     flex: 1,
//     fontSize: 16,
//     fontWeight: '600',
//     color: colors.text,
//   },
//   cardDescription: {
//     fontSize: 12,
//     color: colors.secondary,
//   },
//   cardArrow: {
//     width: 32,
//     height: 32,
//     borderRadius: 16,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   cardArrowText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
// });



// src/screens/GroupDetailsScreen.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';

export default function GroupDetailScreen({ route, navigation }: any) {
  console.log('GroupDetailScreen rendered with route:', route);
  
  const { groupId, groupName } = route.params || {};
  console.log('GroupId:', groupId, 'GroupName:', groupName);

  // Check if groupId exists
  if (!groupId) {
    Alert.alert('Error', 'Group ID is missing');
    navigation.goBack();
    return null;
  }

  const navigateToScreen = (screenName: string, params: any) => {
    console.log(`Navigating to ${screenName} with params:`, params);
    try {
      navigation.navigate(screenName, params);
    } catch (error) {
      console.error(`Navigation error to ${screenName}:`, error);
      Alert.alert('Error', `Failed to navigate to ${screenName}`);
    }
  };

  const features = [
    {
      label: 'Add Records',
      icon: '📄',
      description: 'Upload group documents and records',
      onPress: () => navigateToScreen('AddRecords', { groupId }),
    },
    {
      label: 'Member Registration',
      icon: '👤',
      description: 'Register and manage group members',
      onPress: () => navigateToScreen('MemberRegistration', { groupId }),
    },
    {
      label: 'Bank Account Details',
      icon: '🏦',
      description: 'Manage group bank account information',
      onPress: () => navigateToScreen('BankDetails', { groupId }),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.groupName}>{groupName || 'Group'}</Text>
          <Text style={styles.groupId}>ID: {groupId || 'N/A'}</Text>
        </View>

        <Text style={styles.sectionTitle}>Manage Group</Text>

        <View style={styles.grid}>
          {features.map((feature) => (
            <TouchableOpacity
              key={feature.label}
              style={styles.card}
              onPress={feature.onPress}
              activeOpacity={0.7}
            >
              <Text style={styles.cardIcon}>{feature.icon}</Text>
              <Text style={styles.cardLabel}>{feature.label}</Text>
              <Text style={styles.cardDescription}>{feature.description}</Text>
            </TouchableOpacity>
          ))}
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
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  groupName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  groupId: {
    fontSize: 14,
    color: colors.secondary,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  grid: {
    gap: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
    color: colors.secondary,
    textAlign: 'center',
  },
});