// src/screens/MembersManagementScreen.tsx

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import Icon from 'react-native-vector-icons/Ionicons';
import { groupAPI } from '../api/endpoints';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MembersManagementScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [groupId, setGroupId] = useState<string>('');
  const [groupName, setGroupName] = useState<string>('');

  useFocusEffect(
    useCallback(() => {
      loadGroupData();
    }, [])
  );

  const loadGroupData = async () => {
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
        console.log('✅ Group loaded:', group.id, group.group_name);
      } else {
        Alert.alert(
          'No Group',
          'You need to create a group first.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error: any) {
      console.error('Error loading group:', error);
      Alert.alert('Error', 'Failed to load group data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGroupData();
    setRefreshing(false);
  };

  const navigateTo = (screen: string) => {
    if (!groupId) {
      Alert.alert('Error', 'Group ID is missing');
      return;
    }

    console.log(`📤 Navigating to ${screen} with groupId:`, groupId);

    try {
      navigation.navigate(screen, { groupId });
    } catch (error) {
      console.error(`❌ Navigation error to ${screen}:`, error);
      Alert.alert('Error', `Could not navigate to ${screen}. Please try again.`);
    }
  };

  const cards = [
    {
      id: 'members',
      title: 'Add Member',
      icon: '👤',
      description: 'Register and manage group members',
      screen: 'MemberRegistration',
      color: '#dbeafe',
    },
    {
      id: 'bank',
      title: 'Bank Details',
      icon: '🏦',
      description: 'Manage group bank account information',
      screen: 'BankDetails',
      color: '#d1fae5',
    },
    {
      id: 'records',
      title: 'Group Records',
      icon: '📄',
      description: 'Upload and manage group documents',
      screen: 'AddRecords',
      color: '#fef3c7',
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading group...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Members Management</Text>
          {groupName && (
            <Text style={styles.headerSubtitle}>{groupName}</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={onRefresh}
          activeOpacity={0.7}
          style={styles.refreshButton}
        >
          <Icon name="refresh" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.cardsContainer}>
          {cards.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={styles.card}
              onPress={() => navigateTo(card.screen)}
              activeOpacity={0.7}
            >
              <View style={[styles.cardIconContainer, { backgroundColor: card.color }]}>
                <Text style={styles.cardIcon}>{card.icon}</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={styles.cardDescription}>{card.description}</Text>
              </View>
              <Icon name="chevron-forward" size={20} color={colors.secondary} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>Quick Actions</Text>
          <View style={styles.statsGrid}>
            <TouchableOpacity
              style={styles.statsCard}
              onPress={() => navigateTo('MemberRegistration')}
              activeOpacity={0.7}
            >
              <Text style={styles.statsIcon}>➕</Text>
              <Text style={styles.statsLabel}>Add Member</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statsCard}
              onPress={() => navigateTo('BankDetails')}
              activeOpacity={0.7}
            >
              <Text style={styles.statsIcon}>🏦</Text>
              <Text style={styles.statsLabel}>Bank Details</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statsCard}
              onPress={() => navigateTo('AddRecords')}
              activeOpacity={0.7}
            >
              <Text style={styles.statsIcon}>📄</Text>
              <Text style={styles.statsLabel}>Records</Text>
            </TouchableOpacity>
          </View>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  refreshButton: {
    padding: 4,
    marginLeft: 8,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  cardsContainer: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardIcon: {
    fontSize: 24,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  cardDescription: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 2,
  },
  statsContainer: {
    marginTop: 24,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statsCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 4,
  },
  statsIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  statsLabel: {
    fontSize: 11,
    color: colors.secondary,
    textAlign: 'center',
  },
});