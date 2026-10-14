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
  StatusBar,
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

  const [showSendModal, setShowSendModal] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('sms');
  const [sending, setSending] = useState(false);
  const [group, setGroup] = useState<any>(null);
  const [memberCount, setMemberCount] = useState(0);

  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [recipientType, setRecipientType] = useState<RecipientType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
      loadGroupInfo();

      // Poll every 30s while on this screen
      const interval = setInterval(() => {
        loadNotifications();
      }, 30000);

      return () => clearInterval(interval);
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

      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await notificationAPI.getNotifications();

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
        console.log('Could not fetch unread count:', error);
      }
    } catch (error: any) {
      console.error('Error loading notifications:', error);
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
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      Alert.alert('✅ Success', 'All notifications marked as read');
    } catch (error: any) {
      console.error('Error marking all as read:', error);
      Alert.alert('Error', 'Failed to mark all as read');
    }
  };

  const getFilteredNotifications = () => {
    if (activeTab === 'unread') {
      return notifications.filter((n) => !n.is_read);
    }
    return notifications;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'loan_approval':
      case 'loan_request':
        return '📊';
      case 'loan_due':
        return '⏰';
      case 'payment_received':
        return '💰';
      case 'funding':
        return '💵';
      case 'attendance':
        return '📅';
      case 'group_notice':
        return '📢';
      case 'system':
        return '⚙️';
      default:
        return '🔔';
    }
  };

  const getTypeAccent = (type: string) => {
    // returns { bg, border, dot } for the colored icon halo
    switch (type) {
      case 'loan_approval':
      case 'loan_request':
        return {
          bg: 'rgba(197, 9, 130, 0.12)',
          border: 'rgba(197, 9, 130, 0.30)',
          dot: colors.primary,
        };
      case 'loan_due':
        return {
          bg: 'rgba(245, 158, 11, 0.12)',
          border: 'rgba(245, 158, 11, 0.32)',
          dot: '#f59e0b',
        };
      case 'payment_received':
      case 'funding':
        return {
          bg: 'rgba(16, 185, 129, 0.12)',
          border: 'rgba(16, 185, 129, 0.30)',
          dot: '#10b981',
        };
      case 'attendance':
        return {
          bg: 'rgba(120, 60, 190, 0.12)',
          border: 'rgba(120, 60, 190, 0.30)',
          dot: '#7C3AED',
        };
      case 'group_notice':
        return {
          bg: 'rgba(18, 147, 175, 0.12)',
          border: 'rgba(18, 147, 175, 0.30)',
          dot: colors.secondary,
        };
      case 'system':
        return {
          bg: 'rgba(107, 114, 128, 0.12)',
          border: 'rgba(107, 114, 128, 0.28)',
          dot: '#6b7280',
        };
      default:
        return {
          bg: 'rgba(197, 9, 130, 0.10)',
          border: 'rgba(197, 9, 130, 0.25)',
          dot: colors.primary,
        };
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
    const allIds = members.map((m) => m.id);
    setSelectedMembers(new Set(allIds));
  };

  const deselectAllMembers = () => {
    setSelectedMembers(new Set());
  };

  const getFilteredMembers = () => {
    if (!searchQuery.trim()) return members;
    const query = searchQuery.toLowerCase().trim();
    return members.filter(
      (m) =>
        m.full_name.toLowerCase().includes(query) ||
        m.phone_number.includes(query)
    );
  };

  const openSendModal = () => {
    setShowSendModal(true);
  };

  const closeSendModal = () => {
    setShowSendModal(false);
    setSubject('');
    setMessage('');
    setSelectedMembers(new Set());
  };

  const validateSendForm = (): string | null => {
    if (!subject.trim()) return 'Please enter a subject';
    if (!message.trim()) return 'Please enter a message';
    if (message.trim().length < 10) return 'Message must be at least 10 characters';
    if (recipientType === 'selected' && selectedMembers.size === 0) {
      return 'Please select at least one member';
    }
    return null;
  };

  const handleSendNotification = async () => {
    const validationError = validateSendForm();
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    if (!group) {
      Alert.alert('Error', 'No group found');
      return;
    }

    const recipientCount =
      recipientType === 'all' ? memberCount : selectedMembers.size;
    const methodLabels = {
      sms: '📱 SMS',
      email: '📧 Email',
      both: '📧📱 Email & SMS',
    };

    const confirmMessage =
      `Send notification to ${recipientCount} recipient(s)?\n\n` +
      `Delivery: ${methodLabels[deliveryMethod]}\n` +
      `Subject: ${subject}\n` +
      `Message: ${message.substring(0, 50)}...`;

    const proceed =
      Platform.OS === 'web'
        ? window.confirm(confirmMessage)
        : await new Promise<boolean>((resolve) => {
            Alert.alert('Confirm Send', confirmMessage, [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Send', onPress: () => resolve(true) },
            ]);
          });

    if (!proceed) return;

    try {
      setSending(true);

      const notificationData = {
        group_id: group.id,
        subject: subject.trim(),
        message: message.trim(),
        notification_type: deliveryMethod,
        category: 'group_notice',
        recipient_type: recipientType,
        member_ids:
          recipientType === 'selected' ? Array.from(selectedMembers) : [],
      };

      const response = await notificationAPI.sendNotification(notificationData);

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
      console.error('Error sending notification:', error);

      let errorMessage = 'Failed to send notification. Please try again.';
      if (error?.response?.status === 404) {
        errorMessage = 'The notification endpoint was not found.';
      } else if (error?.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error?.response?.status === 403) {
        errorMessage =
          'You do not have permission to send notifications.';
      } else if (error?.response?.data) {
        const data = error.response.data;
        errorMessage =
          typeof data === 'string'
            ? data
            : data.error || data.message || data.detail || JSON.stringify(data);
      } else if (error?.message) {
        errorMessage = error.message;
      }

      Platform.OS === 'web'
        ? window.alert(errorMessage)
        : Alert.alert('❌ Error', errorMessage);
    } finally {
      setSending(false);
    }
  };

  /* ─────────────────────────── RENDERERS ─────────────────────────── */

  const renderNotification = ({
    item,
    index,
  }: {
    item: Notification;
    index: number;
  }) => {
    const accent = getTypeAccent(item.notification_type);
    const isUnread = !item.is_read;
    const paleTint = index % 2 === 0 ? '#FFFFFF' : colors.primary + '05';

    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          {
            backgroundColor: isUnread ? colors.primary + '08' : paleTint,
            borderColor: isUnread
              ? colors.primary + '35'
              : 'rgba(0,0,0,0.06)',
          },
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.75}
      >
        {/* Left accent bar */}
        {isUnread && (
          <View
            style={[
              styles.unreadBar,
              { backgroundColor: accent.dot },
            ]}
          />
        )}

        <View
          style={[
            styles.notificationIcon,
            {
              backgroundColor: accent.bg,
              borderColor: accent.border,
            },
          ]}
        >
          <Text style={styles.iconText}>
            {getNotificationIcon(item.notification_type)}
          </Text>
        </View>

        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text
              style={[
                styles.notificationTitle,
                isUnread && styles.unreadTitle,
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {isUnread && (
              <View
                style={[
                  styles.unreadDot,
                  { backgroundColor: accent.dot },
                ]}
              />
            )}
          </View>

          <Text style={styles.notificationMessage} numberOfLines={2}>
            {item.message}
          </Text>

          <View style={styles.notificationFooter}>
            <View
              style={[
                styles.typePill,
                {
                  backgroundColor: accent.bg,
                  borderColor: accent.border,
                },
              ]}
            >
              <View
                style={[
                  styles.typePillDot,
                  { backgroundColor: accent.dot },
                ]}
              />
              <Text style={[styles.typePillText, { color: accent.dot }]}>
                {item.notification_type.replace('_', ' ')}
              </Text>
            </View>
            <Text style={styles.notificationTime}>
              {getTimeAgo(item.created_at)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMemberItem = ({ item }: { item: Member }) => {
    const isSelected = selectedMembers.has(item.id);
    const initials = item.full_name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('');

    return (
      <TouchableOpacity
        style={[
          styles.memberItem,
          isSelected && styles.memberItemSelected,
        ]}
        onPress={() => toggleMemberSelection(item.id)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.memberAvatar,
            isSelected && styles.memberAvatarSelected,
          ]}
        >
          <Text
            style={[
              styles.memberAvatarText,
              isSelected && styles.memberAvatarTextSelected,
            ]}
          >
            {initials || '👤'}
          </Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName} numberOfLines={1}>
            {item.full_name}
          </Text>
          <Text style={styles.memberPhone}>{item.phone_number}</Text>
        </View>
        <View
          style={[
            styles.memberCheckbox,
            isSelected && styles.memberCheckboxSelected,
          ]}
        >
          {isSelected && <Text style={styles.memberCheckText}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Text style={styles.emptyIcon}>🔔</Text>
      </View>
      <Text style={styles.emptyText}>No Notifications</Text>
      <Text style={styles.emptySubtext}>
        {activeTab === 'unread'
          ? 'You have no unread notifications'
          : "You're all caught up!"}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContent}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading notifications…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ─────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {unreadCount > 0 ? (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={markAllAsRead}
            activeOpacity={0.7}
          >
            <Text style={styles.markAllText}>Mark all</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.iconButton} />
        )}
      </View>

      {/* ── Tabs ───────────────────────────────────────── */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'all' && styles.tabTextActive,
            ]}
          >
            All
          </Text>
          <View
            style={[
              styles.tabCount,
              activeTab === 'all' && styles.tabCountActive,
            ]}
          >
            <Text
              style={[
                styles.tabCountText,
                activeTab === 'all' && styles.tabCountTextActive,
              ]}
            >
              {notifications.length}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'unread' && styles.tabActive]}
          onPress={() => setActiveTab('unread')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'unread' && styles.tabTextActive,
            ]}
          >
            Unread
          </Text>
          <View
            style={[
              styles.tabCount,
              activeTab === 'unread' && styles.tabCountActive,
            ]}
          >
            <Text
              style={[
                styles.tabCountText,
                activeTab === 'unread' && styles.tabCountTextActive,
              ]}
            >
              {unreadCount}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ── List ───────────────────────────────────────── */}
      <FlatList
        data={getFilteredNotifications()}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* ── FAB ────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.fabButton}
        onPress={openSendModal}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>📨</Text>
      </TouchableOpacity>

      {/* ── Detail Modal ───────────────────────────────── */}
      {selectedNotification && (
        <Modal
          visible={showDetailModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDetailModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Gradient top strip */}
              <View
                style={[
                  styles.modalTopStrip,
                  {
                    backgroundColor:
                      getTypeAccent(selectedNotification.notification_type).dot,
                  },
                ]}
              />

              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} numberOfLines={2}>
                  {selectedNotification.title}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowDetailModal(false)}
                  activeOpacity={0.7}
                  style={styles.modalCloseButton}
                >
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalBodyContent}>
                <View
                  style={[
                    styles.detailIconContainer,
                    {
                      backgroundColor:
                        getTypeAccent(
                          selectedNotification.notification_type
                        ).bg,
                      borderColor:
                        getTypeAccent(
                          selectedNotification.notification_type
                        ).border,
                    },
                  ]}
                >
                  <Text style={styles.detailIcon}>
                    {getNotificationIcon(
                      selectedNotification.notification_type
                    )}
                  </Text>
                </View>

                <View
                  style={[
                    styles.detailTypePill,
                    {
                      backgroundColor:
                        getTypeAccent(
                          selectedNotification.notification_type
                        ).bg,
                      borderColor:
                        getTypeAccent(
                          selectedNotification.notification_type
                        ).border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.detailTypeDot,
                      {
                        backgroundColor:
                          getTypeAccent(
                            selectedNotification.notification_type
                          ).dot,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.detailTypeText,
                      {
                        color: getTypeAccent(
                          selectedNotification.notification_type
                        ).dot,
                      },
                    ]}
                  >
                    {selectedNotification.notification_type.replace('_', ' ')}
                  </Text>
                </View>

                <Text style={styles.detailMessage}>
                  {selectedNotification.message}
                </Text>

                <Text style={styles.detailTime}>
                  {new Date(
                    selectedNotification.created_at
                  ).toLocaleString()}
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

      {/* ── Send Modal ────────────────────────────────── */}
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
            <View
              style={[
                styles.modalTopStrip,
                { backgroundColor: colors.primary },
              ]}
            />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📨 Send Notification</Text>
              <TouchableOpacity
                onPress={closeSendModal}
                activeOpacity={0.7}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              {/* Group info hero */}
              {group && (
                <View style={styles.groupInfoCard}>
                  <View
                    style={[
                      styles.groupInfoIcon,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text style={styles.groupInfoIconText}>🏘️</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.groupInfoLabel}>Sending to</Text>
                    <Text style={styles.groupInfoName} numberOfLines={1}>
                      {group.group_name}
                    </Text>
                    <Text style={styles.groupInfoMembers}>
                      {memberCount} active member
                      {memberCount !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
              )}

              {/* Recipient type */}
              <Text style={styles.modalLabel}>Send To</Text>
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
                  <Text
                    style={[
                      styles.recipientText,
                      recipientType === 'all' && styles.recipientTextActive,
                    ]}
                  >
                    👥 All Members
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.recipientButton,
                    recipientType === 'selected' &&
                      styles.recipientButtonActive,
                  ]}
                  onPress={() => setRecipientType('selected')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.recipientText,
                      recipientType === 'selected' &&
                        styles.recipientTextActive,
                    ]}
                  >
                    👤 Select Members
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Member selector */}
              {recipientType === 'selected' && (
                <View style={styles.memberSelectorContainer}>
                  <View style={styles.memberSelectorHeader}>
                    <Text style={styles.memberSelectorTitle}>
                      {selectedMembers.size} selected
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

                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search members…"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor={colors.secondary + '80'}
                  />

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

              {/* Delivery method */}
              <Text style={styles.modalLabel}>Delivery Method</Text>
              <View style={styles.typeRow}>
                {(['sms', 'email', 'both'] as const).map((m) => {
                  const isActive = deliveryMethod === m;
                  const labels: Record<typeof m, string> = {
                    sms: '📱 SMS',
                    email: '📧 Email',
                    both: '📧📱 Both',
                  };
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.typeButton,
                        isActive && styles.typeButtonActive,
                      ]}
                      onPress={() => setDeliveryMethod(m)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.typeText,
                          isActive && styles.typeTextActive,
                        ]}
                      >
                        {labels[m]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Subject */}
              <Text style={styles.modalLabel}>Subject</Text>
              <TextInput
                style={styles.modalInput}
                value={subject}
                onChangeText={setSubject}
                placeholder="Enter subject"
                placeholderTextColor={colors.secondary + '80'}
              />

              {/* Message */}
              <Text style={styles.modalLabel}>Message</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                value={message}
                onChangeText={setMessage}
                placeholder="Enter message (min 10 characters)"
                placeholderTextColor={colors.secondary + '80'}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Text
                style={[
                  styles.charCount,
                  message.trim().length >= 10 && styles.charCountOk,
                ]}
              >
                {message.trim().length} / 10 min
              </Text>

              {/* Summary */}
              <View style={styles.recipientSummary}>
                <Text style={styles.recipientSummaryText}>
                  {recipientType === 'all'
                    ? `📤 Sending to all ${memberCount} members`
                    : `📤 Sending to ${selectedMembers.size} selected member${
                        selectedMembers.size !== 1 ? 's' : ''
                      }`}
                </Text>
              </View>

              {/* Send button */}
              <TouchableOpacity
                style={[
                  styles.sendModalButton,
                  sending && styles.sendModalButtonDisabled,
                ]}
                onPress={handleSendNotification}
                disabled={sending}
                activeOpacity={0.85}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.sendModalButtonText}>
                    📤 Send Notification
                  </Text>
                )}
              </TouchableOpacity>

              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

/* ═══════════════════════════ STYLES ═══════════════════════════ */

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
    fontSize: 13,
    color: colors.secondary,
  },

  /* ── Header ─────────────────────────────────────── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    backgroundColor: '#fff',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 22,
    color: colors.text,
    fontWeight: '500',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },
  headerBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  markAllButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.primary + '12',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  markAllText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
  },

  /* ── Tabs ──────────────────────────────────────── */
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    backgroundColor: '#F8F8F8',
    gap: 6,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
  },
  tabTextActive: {
    color: '#fff',
  },
  tabCount: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabCountActive: {
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  tabCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.secondary,
  },
  tabCountTextActive: {
    color: '#fff',
  },

  /* ── List ──────────────────────────────────────── */
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  notificationCard: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  notificationIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
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
    gap: 8,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: -0.1,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notificationMessage: {
    fontSize: 12.5,
    color: colors.secondary,
    lineHeight: 17,
    marginBottom: 8,
  },
  notificationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    gap: 5,
  },
  typePillDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  typePillText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
    letterSpacing: 0.2,
  },
  notificationTime: {
    fontSize: 11,
    color: colors.secondary,
    fontWeight: '500',
  },

  /* ── Empty ─────────────────────────────────────── */
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.primary + '25',
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.secondary,
    marginTop: 4,
  },

  /* ── FAB ───────────────────────────────────────── */
  fabButton: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  fabIcon: {
    fontSize: 24,
  },

  /* ── Modal shell ───────────────────────────────── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTopStrip: {
    height: 4,
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    gap: 12,
  },
  modalTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },
  modalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F4F4F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalClose: {
    fontSize: 15,
    color: colors.secondary,
    fontWeight: '700',
  },
  modalBody: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
    maxHeight: '80%',
  },
  modalBodyContent: {
    padding: 22,
    alignItems: 'center',
  },

  /* ── Detail modal ──────────────────────────────── */
  detailIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
  },
  detailIcon: {
    fontSize: 28,
  },
  detailTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
    marginBottom: 16,
  },
  detailTypeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  detailTypeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
    letterSpacing: 0.2,
  },
  detailMessage: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 12,
  },
  detailTime: {
    fontSize: 12,
    color: colors.secondary,
  },
  detailReadBadge: {
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: colors.success + '20',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.success + '40',
  },
  detailReadText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '700',
  },

  /* ── Group info hero ───────────────────────────── */
  groupInfoCard: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '08',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  groupInfoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupInfoIconText: {
    fontSize: 18,
  },
  groupInfoLabel: {
    fontSize: 10,
    color: colors.primary,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  groupInfoName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: 1,
  },
  groupInfoMembers: {
    fontSize: 11,
    color: colors.secondary,
    marginTop: 1,
  },

  /* ── Recipient type ────────────────────────────── */
  recipientRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  recipientButton: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#fff',
  },
  recipientButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  recipientText: {
    fontSize: 12.5,
    color: colors.secondary,
    fontWeight: '600',
  },
  recipientTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },

  /* ── Member selector ───────────────────────────── */
  memberSelectorContainer: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    padding: 12,
    marginBottom: 12,
  },
  memberSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  memberSelectorTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.text,
  },
  memberSelectorActions: {
    flexDirection: 'row',
    gap: 8,
  },
  selectAllButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '25',
  },
  selectAllText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
  },
  deselectAllButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  deselectAllText: {
    fontSize: 11,
    color: colors.secondary,
    fontWeight: '700',
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: colors.text,
    marginBottom: 8,
  },
  membersList: {
    maxHeight: 240,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 2,
    gap: 10,
  },
  memberItemSelected: {
    backgroundColor: colors.primary + '10',
  },
  memberAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarSelected: {
    backgroundColor: colors.primary,
  },
  memberAvatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondary,
  },
  memberAvatarTextSelected: {
    color: '#fff',
  },
  memberInfo: {
    flex: 1,
    minWidth: 0,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  memberPhone: {
    fontSize: 11,
    color: colors.secondary,
    marginTop: 1,
  },
  memberCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  memberCheckboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  memberCheckText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '800',
  },

  /* ── Inputs & labels ───────────────────────────── */
  modalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
    marginTop: 14,
  },
  modalInput: {
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 13.5,
    color: colors.text,
    marginBottom: 4,
  },
  modalTextArea: {
    minHeight: 90,
    textAlignVertical: 'top',
    paddingTop: 11,
  },
  charCount: {
    fontSize: 10.5,
    color: colors.secondary,
    textAlign: 'right',
    marginBottom: 8,
    fontWeight: '500',
  },
  charCountOk: {
    color: colors.success,
    fontWeight: '700',
  },

  /* ── Delivery tiles ────────────────────────────── */
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#fff',
  },
  typeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  typeText: {
    fontSize: 12,
    color: colors.secondary,
    fontWeight: '600',
  },
  typeTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },

  /* ── Summary ───────────────────────────────────── */
  recipientSummary: {
    backgroundColor: colors.primary + '08',
    borderRadius: 10,
    padding: 11,
    marginTop: 14,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  recipientSummaryText: {
    fontSize: 12.5,
    color: colors.primary,
    fontWeight: '700',
  },

  /* ── Send button ───────────────────────────────── */
  sendModalButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  sendModalButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  sendModalButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});