// src/screens/NotificationScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  FlatList,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors } from '../theme/colors';
import { notificationAPI, groupAPI } from '../api/endpoints';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
  read_at?: string;
  data?: any;
}

interface Member {
  id: string;
  full_name: string;
  phone_number: string;
  email?: string;
  is_active: boolean;
}

type NotificationTab = 'all' | 'unread';
type DeliveryMethod = 'sms' | 'email' | 'both';
type RecipientType = 'all' | 'selected';

export default function NotificationScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<NotificationTab>('all');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Send notification state
  const [showSendModal, setShowSendModal] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('sms');
  const [sending, setSending] = useState(false);
  const [group, setGroup] = useState<any>(null);
  const [memberCount, setMemberCount] = useState(0);
  
  // Member selection state
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [recipientType, setRecipientType] = useState<RecipientType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
      loadGroupInfo();
    }, [])
  );

  const loadGroupInfo = async () => {
    try {
      const groupsResponse = await groupAPI.getGroups();
      let groupsData = [];
      if (Array.isArray(groupsResponse.data)) {
        groupsData = groupsResponse.data;
      } else if (groupsResponse.data.results) {
        groupsData = groupsResponse.data.results;
      }
      
      if (groupsData.length > 0) {
        const userGroup = groupsData[0];
        setGroup(userGroup);
        await loadMembers(userGroup.id);
      }
    } catch (error) {
      console.error('Error loading group info:', error);
    }
  };

  const loadMembers = async (groupId: string) => {
    try {
      const response = await groupAPI.getMembers(groupId);
      const membersData = response.data || [];
      setMembers(membersData);
      setMemberCount(membersData.length);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      console.log('📡 Fetching notifications...');
      
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        console.log('⚠️ No token found');
        setLoading(false);
        return;
      }

      const response = await notificationAPI.getNotifications();
      console.log('📊 Notifications response:', JSON.stringify(response.data, null, 2));
      
      let notificationsData = [];
      if (Array.isArray(response.data)) {
        notificationsData = response.data;
      } else if (response.data.results) {
        notificationsData = response.data.results;
      } else if (response.data.data) {
        notificationsData = response.data.data;
      }
      
      setNotifications(notificationsData);
      
      try {
        const unreadResponse = await notificationAPI.getUnreadCount();
        setUnreadCount(unreadResponse.data.unread_count || 0);
      } catch (error) {
        console.log('⚠️ Could not fetch unread count:', error);
      }
      
      console.log(`✅ Loaded ${notificationsData.length} notifications`);
      
    } catch (error: any) {
      console.error('❌ Error loading notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    await loadGroupInfo();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: Notification) => {
    setSelectedNotification(notification);
    setShowDetailModal(true);
    
    if (!notification.is_read) {
      try {
        await notificationAPI.markAsRead(notification.id);
        setNotifications(prev =>
          prev.map(n =>
            n.id === notification.id ? { ...n, is_read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('❌ Error marking notification as read:', error);
      }
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
      Alert.alert('✅ Success', 'All notifications marked as read');
    } catch (error: any) {
      console.error('❌ Error marking all as read:', error);
      Alert.alert('Error', 'Failed to mark all as read');
    }
  };

  const getFilteredNotifications = () => {
    if (activeTab === 'unread') {
      return notifications.filter(n => !n.is_read);
    }
    return notifications;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'loan_approval':
      case 'loan_request':
        return '📊';
      case 'payment_received':
        return '💰';
      case 'attendance':
        return '📅';
      case 'welcome':
        return '👋';
      case 'group_member':
        return '👥';
      case 'email':
        return '📧';
      case 'group_notice':
        return '📢';
      default:
        return '🔔';
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // ============ MEMBER SELECTION ============
  const toggleMemberSelection = (memberId: string) => {
    const newSelection = new Set(selectedMembers);
    if (newSelection.has(memberId)) {
      newSelection.delete(memberId);
    } else {
      newSelection.add(memberId);
    }
    setSelectedMembers(newSelection);
  };

  const selectAllMembers = () => {
    const allIds = members.map(m => m.id);
    setSelectedMembers(new Set(allIds));
  };

  const deselectAllMembers = () => {
    setSelectedMembers(new Set());
  };

  const getFilteredMembers = () => {
    if (!searchQuery.trim()) return members;
    const query = searchQuery.toLowerCase().trim();
    return members.filter(m => 
      m.full_name.toLowerCase().includes(query) ||
      m.phone_number.includes(query)
    );
  };

  // ============ OPEN SEND MODAL ============
  const openSendModal = () => {
    console.log('🔵 Opening send modal...');
    setShowSendModal(true);
  };

  // ============ CLOSE SEND MODAL ============
  const closeSendModal = () => {
    console.log('🔴 Closing send modal...');
    setShowSendModal(false);
    setSubject('');
    setMessage('');
    setSelectedMembers(new Set());
  };

  // ============ SEND NOTIFICATION ============
  const validateSendForm = (): string | null => {
    if (!subject.trim()) {
      return 'Please enter a subject';
    }
    if (!message.trim()) {
      return 'Please enter a message';
    }
    if (message.trim().length < 10) {
      return 'Message must be at least 10 characters';
    }
    if (recipientType === 'selected' && selectedMembers.size === 0) {
      return 'Please select at least one member';
    }
    return null;
  };

  const handleSendNotification = async () => {
    console.log('🔵 Send button pressed!');

    const validationError = validateSendForm();
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    if (!group) {
      Alert.alert('Error', 'No group found');
      return;
    }

    const recipientCount = recipientType === 'all' ? memberCount : selectedMembers.size;
    const methodLabels = {
      sms: '📱 SMS',
      email: '📧 Email',
      both: '📧📱 Email & SMS'
    };

    const confirmMessage =
      `Send notification to ${recipientCount} recipient(s)?\n\n` +
      `Delivery: ${methodLabels[deliveryMethod]}\n` +
      `Subject: ${subject}\n` +
      `Message: ${message.substring(0, 50)}...`;

    const proceed = Platform.OS === 'web'
      ? window.confirm(confirmMessage)
      : await new Promise<boolean>((resolve) => {
          Alert.alert('Confirm Send', confirmMessage, [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Send', onPress: () => resolve(true) },
          ]);
        });

    if (!proceed) {
      console.log('❌ Send cancelled');
      return;
    }

    try {
      setSending(true);
      console.log('🟢 User confirmed send!');

      const notificationData = {
        group_id: group.id,
        subject: subject.trim(),
        message: message.trim(),
        notification_type: deliveryMethod,
        category: 'group_notice',
        recipient_type: recipientType,
        member_ids: recipientType === 'selected' ? Array.from(selectedMembers) : [],
      };

      console.log('📤 Sending notification data:', JSON.stringify(notificationData, null, 2));

      const response = await notificationAPI.sendNotification(notificationData);

      console.log('📥 Response status:', response.status);
      console.log('📥 Response data:', response.data);

      let successMessage = `✅ Sent to ${response.data.sent_count || 0} recipient(s)`;
      if (response.data.failed_count > 0) {
        successMessage += `\n❌ Failed: ${response.data.failed_count}`;
      }

      if (Platform.OS === 'web') {
        window.alert(successMessage);
      } else {
        Alert.alert('✅ Notification Sent!', successMessage);
      }

      setSubject('');
      setMessage('');
      setSelectedMembers(new Set());
      setShowSendModal(false);
      loadNotifications();

    } catch (error: any) {
      console.error('❌ Error sending notification:', error);
      console.error('❌ Error details:', error?.response?.data);

      let errorMessage = 'Failed to send notification. Please try again.';
      if (error?.response?.status === 404) {
        errorMessage = 'The notification endpoint was not found.';
      } else if (error?.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error?.response?.status === 403) {
        errorMessage = 'You do not have permission to send notifications.';
      } else if (error?.response?.data) {
        const data = error.response.data;
        errorMessage = typeof data === 'string' ? data : (data.error || data.message || data.detail || JSON.stringify(data));
      } else if (error?.message) {
        errorMessage = error.message;
      }

      Platform.OS === 'web' ? window.alert(errorMessage) : Alert.alert('❌ Error', errorMessage);
    } finally {
      setSending(false);
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationCard,
        !item.is_read && styles.unreadCard,
      ]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationIcon}>
        <Text style={styles.iconText}>{getNotificationIcon(item.notification_type)}</Text>
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={[styles.notificationTitle, !item.is_read && styles.unreadTitle]}>
            {item.title}
          </Text>
          {!item.is_read && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={styles.notificationTime}>
          {getTimeAgo(item.created_at)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderMemberItem = ({ item }: { item: Member }) => (
    <TouchableOpacity
      style={[
        styles.memberItem,
        selectedMembers.has(item.id) && styles.memberItemSelected,
      ]}
      onPress={() => toggleMemberSelection(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.full_name}</Text>
        <Text style={styles.memberPhone}>{item.phone_number}</Text>
      </View>
      {selectedMembers.has(item.id) && (
        <View style={styles.memberCheck}>
          <Text style={styles.memberCheckText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🔔</Text>
      <Text style={styles.emptyText}>No Notifications</Text>
      <Text style={styles.emptySubtext}>
        {activeTab === 'unread' 
          ? 'You have no unread notifications' 
          : 'You\'re all caught up!'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContent}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={markAllAsRead}
            activeOpacity={0.7}
          >
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            All ({notifications.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'unread' && styles.tabActive]}
          onPress={() => setActiveTab('unread')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'unread' && styles.tabTextActive]}>
            Unread ({unreadCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      <FlatList
        data={getFilteredNotifications()}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fabButton}
        onPress={openSendModal}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>📨</Text>
      </TouchableOpacity>

      {/* Notification Detail Modal */}
      {selectedNotification && (
        <Modal
          visible={showDetailModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDetailModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedNotification.title}</Text>
                <TouchableOpacity
                  onPress={() => setShowDetailModal(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalBodyContent}>
                <View style={styles.detailIconContainer}>
                  <Text style={styles.detailIcon}>
                    {getNotificationIcon(selectedNotification.notification_type)}
                  </Text>
                </View>
                <Text style={styles.detailMessage}>{selectedNotification.message}</Text>
                <Text style={styles.detailTime}>
                  {new Date(selectedNotification.created_at).toLocaleString()}
                </Text>
                {selectedNotification.is_read && (
                  <View style={styles.detailReadBadge}>
                    <Text style={styles.detailReadText}>✓ Read</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Send Notification Modal */}
      <Modal
        visible={showSendModal}
        transparent
        animationType="slide"
        onRequestClose={closeSendModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📨 Send Notification</Text>
              <TouchableOpacity
                onPress={closeSendModal}
                activeOpacity={0.7}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Group Info */}
              {group && (
                <View style={styles.groupInfoCard}>
                  <Text style={styles.groupInfoLabel}>Group:</Text>
                  <Text style={styles.groupInfoName}>{group.group_name}</Text>
                  <Text style={styles.groupInfoMembers}>{memberCount} active members</Text>
                </View>
              )}

              {/* Recipient Type */}
              <Text style={styles.modalLabel}>Send To *</Text>
              <View style={styles.recipientRow}>
                <TouchableOpacity
                  style={[
                    styles.recipientButton,
                    recipientType === 'all' && styles.recipientButtonActive,
                  ]}
                  onPress={() => {
                    setRecipientType('all');
                    setSelectedMembers(new Set());
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.recipientText, recipientType === 'all' && styles.recipientTextActive]}>
                    👥 All Members
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.recipientButton,
                    recipientType === 'selected' && styles.recipientButtonActive,
                  ]}
                  onPress={() => setRecipientType('selected')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.recipientText, recipientType === 'selected' && styles.recipientTextActive]}>
                    👤 Select Members
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Member Selection */}
              {recipientType === 'selected' && (
                <View style={styles.memberSelectorContainer}>
                  <View style={styles.memberSelectorHeader}>
                    <Text style={styles.memberSelectorTitle}>
                      Selected: {selectedMembers.size} members
                    </Text>
                    <View style={styles.memberSelectorActions}>
                      <TouchableOpacity
                        style={styles.selectAllButton}
                        onPress={selectAllMembers}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.selectAllText}>Select All</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deselectAllButton}
                        onPress={deselectAllMembers}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.deselectAllText}>Clear</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Search */}
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search members..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor={colors.secondary}
                  />

                  {/* Members List */}
                  <FlatList
                    data={getFilteredMembers()}
                    keyExtractor={(item) => item.id}
                    renderItem={renderMemberItem}
                    style={styles.membersList}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                  />
                </View>
              )}

              {/* Delivery Method */}
              <Text style={styles.modalLabel}>Delivery Method *</Text>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    deliveryMethod === 'sms' && styles.typeButtonActive,
                  ]}
                  onPress={() => setDeliveryMethod('sms')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.typeText, deliveryMethod === 'sms' && styles.typeTextActive]}>
                    📱 SMS
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    deliveryMethod === 'email' && styles.typeButtonActive,
                  ]}
                  onPress={() => setDeliveryMethod('email')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.typeText, deliveryMethod === 'email' && styles.typeTextActive]}>
                    📧 Email
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    deliveryMethod === 'both' && styles.typeButtonActive,
                  ]}
                  onPress={() => setDeliveryMethod('both')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.typeText, deliveryMethod === 'both' && styles.typeTextActive]}>
                    📧📱 Both
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalLabel}>Subject *</Text>
              <TextInput
                style={styles.modalInput}
                value={subject}
                onChangeText={setSubject}
                placeholder="Enter subject"
                placeholderTextColor={colors.secondary}
              />

              <Text style={styles.modalLabel}>Message *</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                value={message}
                onChangeText={setMessage}
                placeholder="Enter message (min 10 characters)"
                placeholderTextColor={colors.secondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>
                {message.trim().length} characters (min 10)
              </Text>

              {/* Recipient Count Summary */}
              <View style={styles.recipientSummary}>
                <Text style={styles.recipientSummaryText}>
                  {recipientType === 'all' 
                    ? `📤 Sending to all ${memberCount} members` 
                    : `📤 Sending to ${selectedMembers.size} selected members`}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.sendModalButton, sending && styles.sendModalButtonDisabled]}
                onPress={handleSendNotification}
                disabled={sending}
                activeOpacity={0.7}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.sendModalButtonText}>📤 Send Notification</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 4,
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
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primary + '15',
    borderRadius: 16,
  },
  markAllText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.secondary,
  },
  tabTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unreadCard: {
    backgroundColor: colors.primary + '05',
    borderColor: colors.primary + '30',
  },
  notificationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  unreadTitle: {
    fontWeight: '700',
    color: colors.text,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  notificationMessage: {
    fontSize: 13,
    color: colors.secondary,
    lineHeight: 18,
  },
  notificationTime: {
    fontSize: 11,
    color: colors.secondary,
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.secondary,
    marginTop: 4,
  },
  fabButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabIcon: {
    fontSize: 28,
    color: '#fff',
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
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    marginRight: 12,
  },
  modalClose: {
    fontSize: 20,
    color: colors.secondary,
    padding: 4,
  },
  modalBody: {
    padding: 16,
    maxHeight: '80%',
  },
  modalBodyContent: {
    padding: 20,
    alignItems: 'center',
  },
  detailIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailIcon: {
    fontSize: 32,
  },
  detailMessage: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
  },
  detailTime: {
    fontSize: 13,
    color: colors.secondary,
  },
  detailReadBadge: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: colors.success + '20',
    borderRadius: 12,
  },
  detailReadText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '500',
  },
  groupInfoCard: {
    backgroundColor: colors.primary + '10',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  groupInfoLabel: {
    fontSize: 11,
    color: colors.secondary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  groupInfoName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  groupInfoMembers: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 2,
  },
  recipientRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  recipientButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  recipientButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  recipientText: {
    fontSize: 14,
    color: colors.secondary,
  },
  recipientTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  memberSelectorContainer: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 12,
  },
  memberSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  memberSelectorTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  memberSelectorActions: {
    flexDirection: 'row',
    gap: 8,
  },
  selectAllButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
  },
  selectAllText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '500',
  },
  deselectAllButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.border,
    borderRadius: 12,
  },
  deselectAllText: {
    fontSize: 11,
    color: colors.secondary,
    fontWeight: '500',
  },
  searchInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
  },
  membersList: {
    maxHeight: 250,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  memberItemSelected: {
    backgroundColor: colors.primary + '10',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  memberPhone: {
    fontSize: 12,
    color: colors.secondary,
  },
  memberCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberCheckText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  recipientSummary: {
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    alignItems: 'center',
  },
  recipientSummaryText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    marginTop: 12,
  },
  modalInput: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    fontSize: 15,
    color: colors.text,
    marginBottom: 4,
  },
  modalTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: colors.secondary,
    textAlign: 'right',
    marginBottom: 12,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  typeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  typeText: {
    fontSize: 12,
    color: colors.secondary,
  },
  typeTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  sendModalButton: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  sendModalButtonDisabled: {
    opacity: 0.6,
  },
  sendModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});




// src/screens/NotificationScreen.tsx
// import React, { useState, useEffect, useCallback } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   SafeAreaView,
//   TouchableOpacity,
//   ActivityIndicator,
//   RefreshControl,
//   Alert,
//   FlatList,
//   Modal,
//   TextInput,
//   KeyboardAvoidingView,
//   Platform,
// } from 'react-native';
// import { colors } from '../theme/colors';
// import { notificationAPI, groupAPI } from '../api/endpoints';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { useFocusEffect } from '@react-navigation/native';

// interface Notification {
//   id: string;
//   title: string;
//   message: string;
//   notification_type: string;
//   is_read: boolean;
//   created_at: string;
//   read_at?: string;
//   data?: any;
// }

// type NotificationTab = 'all' | 'unread';
// type DeliveryMethod = 'sms' | 'email' | 'both';

// export default function NotificationScreen({ navigation }: any) {
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [notifications, setNotifications] = useState<Notification[]>([]);
//   const [unreadCount, setUnreadCount] = useState(0);
//   const [activeTab, setActiveTab] = useState<NotificationTab>('all');
//   const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
//   const [showDetailModal, setShowDetailModal] = useState(false);
  
//   // Send notification state
//   const [showSendModal, setShowSendModal] = useState(false);
//   const [subject, setSubject] = useState('');
//   const [message, setMessage] = useState('');
//   const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('sms');
//   const [sending, setSending] = useState(false);
//   const [group, setGroup] = useState<any>(null);
//   const [memberCount, setMemberCount] = useState(0);

//   useFocusEffect(
//     useCallback(() => {
//       loadNotifications();
//       loadGroupInfo();
//     }, [])
//   );

//   const loadGroupInfo = async () => {
//     try {
//       const groupsResponse = await groupAPI.getGroups();
//       let groupsData = [];
//       if (Array.isArray(groupsResponse.data)) {
//         groupsData = groupsResponse.data;
//       } else if (groupsResponse.data.results) {
//         groupsData = groupsResponse.data.results;
//       }
      
//       if (groupsData.length > 0) {
//         const userGroup = groupsData[0];
//         setGroup(userGroup);
        
//         try {
//           const membersResponse = await groupAPI.getMembers(userGroup.id);
//           const members = membersResponse.data || [];
//           setMemberCount(members.length);
//         } catch (error) {
//           console.error('Error getting members:', error);
//         }
//       }
//     } catch (error) {
//       console.error('Error loading group info:', error);
//     }
//   };

//   const loadNotifications = async () => {
//     try {
//       setLoading(true);
//       console.log('📡 Fetching notifications...');
      
//       const token = await AsyncStorage.getItem('access_token');
//       if (!token) {
//         console.log('⚠️ No token found');
//         setLoading(false);
//         return;
//       }

//       const response = await notificationAPI.getNotifications();
//       console.log('📊 Notifications response:', JSON.stringify(response.data, null, 2));
      
//       let notificationsData = [];
//       if (Array.isArray(response.data)) {
//         notificationsData = response.data;
//       } else if (response.data.results) {
//         notificationsData = response.data.results;
//       } else if (response.data.data) {
//         notificationsData = response.data.data;
//       }
      
//       setNotifications(notificationsData);
      
//       try {
//         const unreadResponse = await notificationAPI.getUnreadCount();
//         setUnreadCount(unreadResponse.data.unread_count || 0);
//       } catch (error) {
//         console.log('⚠️ Could not fetch unread count:', error);
//       }
      
//       console.log(`✅ Loaded ${notificationsData.length} notifications`);
      
//     } catch (error: any) {
//       console.error('❌ Error loading notifications:', error);
//       Alert.alert('Error', 'Failed to load notifications');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const onRefresh = async () => {
//     setRefreshing(true);
//     await loadNotifications();
//     setRefreshing(false);
//   };

//   const handleNotificationPress = async (notification: Notification) => {
//     setSelectedNotification(notification);
//     setShowDetailModal(true);
    
//     if (!notification.is_read) {
//       try {
//         await notificationAPI.markAsRead(notification.id);
//         setNotifications(prev =>
//           prev.map(n =>
//             n.id === notification.id ? { ...n, is_read: true } : n
//           )
//         );
//         setUnreadCount(prev => Math.max(0, prev - 1));
//       } catch (error) {
//         console.error('❌ Error marking notification as read:', error);
//       }
//     }
//   };

//   const markAllAsRead = async () => {
//     try {
//       await notificationAPI.markAllRead();
//       setNotifications(prev =>
//         prev.map(n => ({ ...n, is_read: true }))
//       );
//       setUnreadCount(0);
//       Alert.alert('✅ Success', 'All notifications marked as read');
//     } catch (error: any) {
//       console.error('❌ Error marking all as read:', error);
//       Alert.alert('Error', 'Failed to mark all as read');
//     }
//   };

//   const getFilteredNotifications = () => {
//     if (activeTab === 'unread') {
//       return notifications.filter(n => !n.is_read);
//     }
//     return notifications;
//   };

//   const getNotificationIcon = (type: string) => {
//     switch (type) {
//       case 'loan_approval':
//       case 'loan_request':
//         return '📊';
//       case 'payment_received':
//         return '💰';
//       case 'attendance':
//         return '📅';
//       case 'welcome':
//         return '👋';
//       case 'group_member':
//         return '👥';
//       case 'email':
//         return '📧';
//       case 'group_notice':
//         return '📢';
//       default:
//         return '🔔';
//     }
//   };

//   const getTimeAgo = (dateString: string) => {
//     const now = new Date();
//     const date = new Date(dateString);
//     const diffMs = now.getTime() - date.getTime();
//     const diffMins = Math.floor(diffMs / 60000);
//     const diffHours = Math.floor(diffMs / 3600000);
//     const diffDays = Math.floor(diffMs / 86400000);
    
//     if (diffMins < 1) return 'Just now';
//     if (diffMins < 60) return `${diffMins}m ago`;
//     if (diffHours < 24) return `${diffHours}h ago`;
//     if (diffDays < 7) return `${diffDays}d ago`;
//     return date.toLocaleDateString();
//   };

//   // ============ SEND NOTIFICATION ============
//   const validateSendForm = (): string | null => {
//     if (!subject.trim()) {
//       return 'Please enter a subject';
//     }
//     if (!message.trim()) {
//       return 'Please enter a message';
//     }
//     if (message.trim().length < 10) {
//       return 'Message must be at least 10 characters';
//     }
//     return null;
//   };

//   const handleSendNotification = async () => {
//     const validationError = validateSendForm();
//     if (validationError) {
//       Alert.alert('Validation Error', validationError);
//       return;
//     }

//     if (!group) {
//       Alert.alert('Error', 'No group found');
//       return;
//     }

//     const methodLabels = {
//       sms: '📱 SMS',
//       email: '📧 Email',
//       both: '📧📱 Email & SMS'
//     };

//     Alert.alert(
//       'Confirm Send',
//       `Send notification to ${memberCount} members?\n\n` +
//       `Delivery: ${methodLabels[deliveryMethod]}\n` +
//       `Subject: ${subject}\n` +
//       `Message: ${message.substring(0, 50)}...`,
//       [
//         { text: 'Cancel', style: 'cancel' },
//         {
//           text: 'Send',
//           onPress: async () => {
//             try {
//               setSending(true);
              
//               const notificationData = {
//                 group_id: group.id,
//                 subject: subject.trim(),
//                 message: message.trim(),
//                 notification_type: deliveryMethod,
//                 category: 'group_notice',
//                 recipient_type: 'all',
//               };
              
//               console.log('📤 Sending notification:', notificationData);
              
//               const response = await notificationAPI.sendNotification(notificationData);
              
//               console.log('📥 Response:', response.data);
              
//               let successMessage = `✅ Sent to ${response.data.sent_count || 0} member(s)`;
//               if (response.data.sms_sent_count > 0) {
//                 successMessage += `\n📱 SMS: ${response.data.sms_sent_count}`;
//               }
//               if (response.data.email_sent_count > 0) {
//                 successMessage += `\n📧 Email: ${response.data.email_sent_count}`;
//               }
//               if (response.data.no_contact_count > 0) {
//                 successMessage += `\n⚠️ No contact: ${response.data.no_contact_count}`;
//               }
              
//               Alert.alert(
//                 '✅ Notification Sent!',
//                 successMessage,
//                 [
//                   {
//                     text: 'OK',
//                     onPress: () => {
//                       setSubject('');
//                       setMessage('');
//                       setShowSendModal(false);
//                       loadNotifications();
//                     }
//                   }
//                 ]
//               );
              
//             } catch (error: any) {
//               console.error('❌ Error sending notification:', error);
//               Alert.alert(
//                 'Error',
//                 error?.response?.data?.error || 'Failed to send notification'
//               );
//             } finally {
//               setSending(false);
//             }
//           }
//         }
//       ]
//     );
//   };

//   const renderNotification = ({ item }: { item: Notification }) => (
//     <TouchableOpacity
//       style={[
//         styles.notificationCard,
//         !item.is_read && styles.unreadCard,
//       ]}
//       onPress={() => handleNotificationPress(item)}
//       activeOpacity={0.7}
//     >
//       <View style={styles.notificationIcon}>
//         <Text style={styles.iconText}>{getNotificationIcon(item.notification_type)}</Text>
//       </View>
//       <View style={styles.notificationContent}>
//         <View style={styles.notificationHeader}>
//           <Text style={[styles.notificationTitle, !item.is_read && styles.unreadTitle]}>
//             {item.title}
//           </Text>
//           {!item.is_read && <View style={styles.unreadDot} />}
//         </View>
//         <Text style={styles.notificationMessage} numberOfLines={2}>
//           {item.message}
//         </Text>
//         <Text style={styles.notificationTime}>
//           {getTimeAgo(item.created_at)}
//         </Text>
//       </View>
//     </TouchableOpacity>
//   );

//   const renderEmptyState = () => (
//     <View style={styles.emptyState}>
//       <Text style={styles.emptyIcon}>🔔</Text>
//       <Text style={styles.emptyText}>No Notifications</Text>
//       <Text style={styles.emptySubtext}>
//         {activeTab === 'unread' 
//           ? 'You have no unread notifications' 
//           : 'You\'re all caught up!'}
//       </Text>
//     </View>
//   );

//   if (loading) {
//     return (
//       <SafeAreaView style={styles.centerContent}>
//         <ActivityIndicator size="large" color={colors.primary} />
//         <Text style={styles.loadingText}>Loading notifications...</Text>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       {/* Header */}
//       <View style={styles.header}>
//         <TouchableOpacity
//           style={styles.backButton}
//           onPress={() => navigation.goBack()}
//           activeOpacity={0.7}
//         >
//           <Text style={styles.backButtonText}>←</Text>
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>Notifications</Text>
//         {unreadCount > 0 && (
//           <TouchableOpacity
//             style={styles.markAllButton}
//             onPress={markAllAsRead}
//             activeOpacity={0.7}
//           >
//             <Text style={styles.markAllText}>Mark all read</Text>
//           </TouchableOpacity>
//         )}
//       </View>

//       {/* Tabs */}
//       <View style={styles.tabContainer}>
//         <TouchableOpacity
//           style={[styles.tab, activeTab === 'all' && styles.tabActive]}
//           onPress={() => setActiveTab('all')}
//           activeOpacity={0.7}
//         >
//           <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
//             All ({notifications.length})
//           </Text>
//         </TouchableOpacity>
//         <TouchableOpacity
//           style={[styles.tab, activeTab === 'unread' && styles.tabActive]}
//           onPress={() => setActiveTab('unread')}
//           activeOpacity={0.7}
//         >
//           <Text style={[styles.tabText, activeTab === 'unread' && styles.tabTextActive]}>
//             Unread ({unreadCount})
//           </Text>
//         </TouchableOpacity>
//       </View>

//       {/* Notifications List */}
//       <FlatList
//         data={getFilteredNotifications()}
//         keyExtractor={(item) => item.id}
//         renderItem={renderNotification}
//         ListEmptyComponent={renderEmptyState}
//         contentContainerStyle={styles.listContent}
//         refreshControl={
//           <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
//         }
//         showsVerticalScrollIndicator={false}
//       />

//       {/* Floating Action Button */}
//       <TouchableOpacity
//         style={styles.fabButton}
//         onPress={() => setShowSendModal(true)}
//         activeOpacity={0.8}
//       >
//         <Text style={styles.fabIcon}>📨</Text>
//       </TouchableOpacity>

//       {/* Notification Detail Modal */}
//       {selectedNotification && (
//         <Modal
//           visible={showDetailModal}
//           transparent
//           animationType="slide"
//           onRequestClose={() => setShowDetailModal(false)}
//         >
//           <View style={styles.modalOverlay}>
//             <View style={styles.modalContent}>
//               <View style={styles.modalHeader}>
//                 <Text style={styles.modalTitle}>{selectedNotification.title}</Text>
//                 <TouchableOpacity
//                   onPress={() => setShowDetailModal(false)}
//                   activeOpacity={0.7}
//                 >
//                   <Text style={styles.modalClose}>✕</Text>
//                 </TouchableOpacity>
//               </View>
              
//               <View style={styles.modalBodyContent}>
//                 <View style={styles.detailIconContainer}>
//                   <Text style={styles.detailIcon}>
//                     {getNotificationIcon(selectedNotification.notification_type)}
//                   </Text>
//                 </View>
//                 <Text style={styles.detailMessage}>{selectedNotification.message}</Text>
//                 <Text style={styles.detailTime}>
//                   {new Date(selectedNotification.created_at).toLocaleString()}
//                 </Text>
//                 {selectedNotification.is_read && (
//                   <View style={styles.detailReadBadge}>
//                     <Text style={styles.detailReadText}>✓ Read</Text>
//                   </View>
//                 )}
//               </View>
//             </View>
//           </View>
//         </Modal>
//       )}

//       {/* Send Notification Modal */}
//       <Modal
//         visible={showSendModal}
//         transparent
//         animationType="slide"
//         onRequestClose={() => setShowSendModal(false)}
//       >
//         <KeyboardAvoidingView
//           behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//           style={styles.modalOverlay}
//         >
//           <View style={styles.modalContent}>
//             <View style={styles.modalHeader}>
//               <Text style={styles.modalTitle}>📨 Send Notification</Text>
//               <TouchableOpacity
//                 onPress={() => setShowSendModal(false)}
//                 activeOpacity={0.7}
//               >
//                 <Text style={styles.modalClose}>✕</Text>
//               </TouchableOpacity>
//             </View>

//             <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
//               {/* Group Info */}
//               {group && (
//                 <View style={styles.groupInfoCard}>
//                   <Text style={styles.groupInfoLabel}>Sending to:</Text>
//                   <Text style={styles.groupInfoName}>{group.group_name}</Text>
//                   <Text style={styles.groupInfoMembers}>{memberCount} active members</Text>
//                 </View>
//               )}

//               {/* Delivery Method - SMS Default */}
//               <Text style={styles.modalLabel}>Delivery Method *</Text>
//               <View style={styles.typeRow}>
//                 <TouchableOpacity
//                   style={[
//                     styles.typeButton,
//                     deliveryMethod === 'sms' && styles.typeButtonActive,
//                   ]}
//                   onPress={() => setDeliveryMethod('sms')}
//                   activeOpacity={0.7}
//                 >
//                   <Text style={[styles.typeText, deliveryMethod === 'sms' && styles.typeTextActive]}>
//                     📱 SMS
//                   </Text>
//                 </TouchableOpacity>
//                 <TouchableOpacity
//                   style={[
//                     styles.typeButton,
//                     deliveryMethod === 'email' && styles.typeButtonActive,
//                   ]}
//                   onPress={() => setDeliveryMethod('email')}
//                   activeOpacity={0.7}
//                 >
//                   <Text style={[styles.typeText, deliveryMethod === 'email' && styles.typeTextActive]}>
//                     📧 Email
//                   </Text>
//                 </TouchableOpacity>
//                 <TouchableOpacity
//                   style={[
//                     styles.typeButton,
//                     deliveryMethod === 'both' && styles.typeButtonActive,
//                   ]}
//                   onPress={() => setDeliveryMethod('both')}
//                   activeOpacity={0.7}
//                 >
//                   <Text style={[styles.typeText, deliveryMethod === 'both' && styles.typeTextActive]}>
//                     📧📱 Both
//                   </Text>
//                 </TouchableOpacity>
//               </View>

//               {/* SMS Recommendation */}
//               <View style={styles.smsInfoContainer}>
//                 <Text style={styles.smsInfoText}>
//                   💡 SMS is recommended as most members may not have email addresses.
//                 </Text>
//               </View>

//               <Text style={styles.modalLabel}>Subject *</Text>
//               <TextInput
//                 style={styles.modalInput}
//                 value={subject}
//                 onChangeText={setSubject}
//                 placeholder="Enter subject"
//                 placeholderTextColor={colors.secondary}
//               />

//               <Text style={styles.modalLabel}>Message *</Text>
//               <TextInput
//                 style={[styles.modalInput, styles.modalTextArea]}
//                 value={message}
//                 onChangeText={setMessage}
//                 placeholder="Enter message (min 10 characters)"
//                 placeholderTextColor={colors.secondary}
//                 multiline
//                 numberOfLines={4}
//                 textAlignVertical="top"
//               />
//               <Text style={styles.charCount}>
//                 {message.trim().length} characters (min 10)
//               </Text>

//               <TouchableOpacity
//                 style={[styles.sendModalButton, sending && styles.sendModalButtonDisabled]}
//                 onPress={handleSendNotification}
//                 disabled={sending}
//                 activeOpacity={0.7}
//               >
//                 {sending ? (
//                   <ActivityIndicator color="#fff" size="small" />
//                 ) : (
//                   <Text style={styles.sendModalButtonText}>📤 Send to All Members</Text>
//                 )}
//               </TouchableOpacity>
//             </ScrollView>
//           </View>
//         </KeyboardAvoidingView>
//       </Modal>
//     </SafeAreaView>
//   );
// }

// // ==================== STYLES ====================
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: colors.background,
//   },
//   centerContent: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: colors.background,
//   },
//   loadingText: {
//     marginTop: 12,
//     fontSize: 14,
//     color: colors.secondary,
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 16,
//     paddingVertical: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: colors.border,
//   },
//   backButton: {
//     padding: 4,
//   },
//   backButtonText: {
//     fontSize: 24,
//     color: colors.text,
//   },
//   headerTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: colors.text,
//   },
//   markAllButton: {
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     backgroundColor: colors.primary + '15',
//     borderRadius: 16,
//   },
//   markAllText: {
//     fontSize: 12,
//     color: colors.primary,
//     fontWeight: '500',
//   },
//   tabContainer: {
//     flexDirection: 'row',
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: colors.border,
//   },
//   tab: {
//     paddingHorizontal: 20,
//     paddingVertical: 8,
//     borderRadius: 20,
//     marginRight: 8,
//   },
//   tabActive: {
//     backgroundColor: colors.primary,
//   },
//   tabText: {
//     fontSize: 14,
//     fontWeight: '500',
//     color: colors.secondary,
//   },
//   tabTextActive: {
//     color: '#fff',
//   },
//   listContent: {
//     padding: 16,
//     flexGrow: 1,
//   },
//   notificationCard: {
//     flexDirection: 'row',
//     backgroundColor: colors.surface,
//     borderRadius: 12,
//     padding: 14,
//     marginBottom: 10,
//     borderWidth: 1,
//     borderColor: colors.border,
//   },
//   unreadCard: {
//     backgroundColor: colors.primary + '05',
//     borderColor: colors.primary + '30',
//   },
//   notificationIcon: {
//     width: 44,
//     height: 44,
//     borderRadius: 22,
//     backgroundColor: colors.primary + '10',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 12,
//   },
//   iconText: {
//     fontSize: 20,
//   },
//   notificationContent: {
//     flex: 1,
//   },
//   notificationHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     marginBottom: 4,
//   },
//   notificationTitle: {
//     fontSize: 15,
//     fontWeight: '600',
//     color: colors.text,
//   },
//   unreadTitle: {
//     fontWeight: '700',
//     color: colors.text,
//   },
//   unreadDot: {
//     width: 8,
//     height: 8,
//     borderRadius: 4,
//     backgroundColor: colors.primary,
//   },
//   notificationMessage: {
//     fontSize: 13,
//     color: colors.secondary,
//     lineHeight: 18,
//   },
//   notificationTime: {
//     fontSize: 11,
//     color: colors.secondary,
//     marginTop: 4,
//   },
//   emptyState: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingVertical: 60,
//   },
//   emptyIcon: {
//     fontSize: 48,
//     marginBottom: 12,
//   },
//   emptyText: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: colors.text,
//   },
//   emptySubtext: {
//     fontSize: 14,
//     color: colors.secondary,
//     marginTop: 4,
//   },
//   fabButton: {
//     position: 'absolute',
//     bottom: 30,
//     right: 30,
//     width: 60,
//     height: 60,
//     borderRadius: 30,
//     backgroundColor: colors.primary,
//     justifyContent: 'center',
//     alignItems: 'center',
//     elevation: 5,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.3,
//     shadowRadius: 4,
//   },
//   fabIcon: {
//     fontSize: 28,
//     color: '#fff',
//   },
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 20,
//   },
//   modalContent: {
//     backgroundColor: '#fff',
//     borderRadius: 16,
//     width: '100%',
//     maxWidth: 400,
//     maxHeight: '90%',
//   },
//   modalHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: colors.border,
//   },
//   modalTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: colors.text,
//     flex: 1,
//     marginRight: 12,
//   },
//   modalClose: {
//     fontSize: 20,
//     color: colors.secondary,
//     padding: 4,
//   },
//   modalBody: {
//     padding: 16,
//     maxHeight: '80%',
//   },
//   modalBodyContent: {
//     padding: 20,
//     alignItems: 'center',
//   },
//   detailIconContainer: {
//     width: 64,
//     height: 64,
//     borderRadius: 32,
//     backgroundColor: colors.primary + '10',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginBottom: 16,
//   },
//   detailIcon: {
//     fontSize: 32,
//   },
//   detailMessage: {
//     fontSize: 16,
//     color: colors.text,
//     textAlign: 'center',
//     lineHeight: 24,
//     marginBottom: 12,
//   },
//   detailTime: {
//     fontSize: 13,
//     color: colors.secondary,
//   },
//   detailReadBadge: {
//     marginTop: 12,
//     paddingHorizontal: 12,
//     paddingVertical: 4,
//     backgroundColor: colors.success + '20',
//     borderRadius: 12,
//   },
//   detailReadText: {
//     fontSize: 12,
//     color: colors.success,
//     fontWeight: '500',
//   },
//   groupInfoCard: {
//     backgroundColor: colors.primary + '10',
//     borderRadius: 10,
//     padding: 12,
//     marginBottom: 16,
//     alignItems: 'center',
//   },
//   groupInfoLabel: {
//     fontSize: 11,
//     color: colors.secondary,
//     textTransform: 'uppercase',
//     marginBottom: 2,
//   },
//   groupInfoName: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: colors.text,
//   },
//   groupInfoMembers: {
//     fontSize: 12,
//     color: colors.secondary,
//     marginTop: 2,
//   },
//   modalLabel: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: colors.text,
//     marginBottom: 6,
//     marginTop: 12,
//   },
//   modalInput: {
//     backgroundColor: colors.surface,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: colors.border,
//     padding: 12,
//     fontSize: 15,
//     color: colors.text,
//     marginBottom: 4,
//   },
//   modalTextArea: {
//     minHeight: 80,
//     textAlignVertical: 'top',
//   },
//   charCount: {
//     fontSize: 11,
//     color: colors.secondary,
//     textAlign: 'right',
//     marginBottom: 12,
//   },
//   typeRow: {
//     flexDirection: 'row',
//     gap: 8,
//     marginBottom: 4,
//   },
//   typeButton: {
//     flex: 1,
//     paddingVertical: 8,
//     alignItems: 'center',
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: colors.border,
//     backgroundColor: colors.surface,
//   },
//   typeButtonActive: {
//     borderColor: colors.primary,
//     backgroundColor: colors.primary + '10',
//   },
//   typeText: {
//     fontSize: 12,
//     color: colors.secondary,
//   },
//   typeTextActive: {
//     color: colors.primary,
//     fontWeight: '600',
//   },
//   smsInfoContainer: {
//     backgroundColor: '#fef3c7',
//     borderRadius: 8,
//     padding: 10,
//     marginBottom: 12,
//     borderWidth: 1,
//     borderColor: '#f59e0b',
//   },
//   smsInfoText: {
//     fontSize: 12,
//     color: '#92400e',
//     textAlign: 'center',
//   },
//   sendModalButton: {
//     backgroundColor: colors.primary,
//     padding: 14,
//     borderRadius: 8,
//     alignItems: 'center',
//     marginTop: 8,
//   },
//   sendModalButtonDisabled: {
//     opacity: 0.6,
//   },
//   sendModalButtonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600',
//   },
// });