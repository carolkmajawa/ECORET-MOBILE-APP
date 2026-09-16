// src/screens/ProfileScreen.tsx - COMPLETE FIXED
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
  TextInput,
  Modal,
  Switch,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native';
import { colors } from '../theme/colors';
import { groupAPI, authAPI } from '../api/endpoints';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

interface GroupSettings {
  id: string;
  group_name: string;
  group_code: string;
  is_active: boolean;
  default_interest_rate: number;
  max_loan_amount: number;
  social_max_contribution?: number;
  savings_min_contribution?: number;
  savings_max_contribution?: number;
  meeting_frequency?: string;
  meeting_day?: string;
  daily_transaction_limit?: number;
  secretary?: string | null;
  treasurer?: string | null;
  secretary_details?: GroupMember | null;
  treasurer_details?: GroupMember | null;
  cycle_start_date?: string;
  cycle_end_date?: string;
  cycle_duration_months?: number;
  is_cycle_active?: boolean;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone_number: string;
  role: string;
  is_active: boolean;
}

// Define the role type
type MemberRole = 'member' | 'secretary' | 'treasurer';

interface GroupMember {
  id: string;
  full_name: string;
  phone_number: string;
  role: MemberRole;
  is_active: boolean;
  national_id?: string;
  gender?: string;
  address?: string;
}

type SettingsTab = 'loans' | 'contributions' | 'meetings' | 'cycle' | 'roles';

export default function ProfileScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [group, setGroup] = useState<GroupSettings | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('loans');
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingField, setEditingField] = useState<string>('');
  const [editValue, setEditValue] = useState<string>('');
  const [editLabel, setEditLabel] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [editType, setEditType] = useState<'text' | 'number' | 'switch' | 'picker'>('text');
  const [pickerOptions, setPickerOptions] = useState<string[]>([]);

  // Member role management states
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);
  const [selectedRole, setSelectedRole] = useState<MemberRole>('member');

  // Cycle management states
  const [cycleStatus, setCycleStatus] = useState<any>(null);
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [cycleDuration, setCycleDuration] = useState('6');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('📡 Loading profile and group data...');
      
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        console.log('⚠️ No token found');
        setLoading(false);
        return;
      }

      const profileResponse = await authAPI.getProfile();
      console.log('📊 Profile:', profileResponse.data);
      setProfile(profileResponse.data);

      const groupsResponse = await groupAPI.getGroups();
      let groupsData = [];
      if (Array.isArray(groupsResponse.data)) {
        groupsData = groupsResponse.data;
      } else if (groupsResponse.data.results) {
        groupsData = groupsResponse.data.results;
      }
      
      if (groupsData.length > 0) {
        const userGroup = groupsData[0];
        console.log('📊 Group:', userGroup);
        setGroup(userGroup);
        
        await loadMembers(userGroup.id);
        await loadCycleStatus(userGroup.id);
      }
      
    } catch (error: any) {
      console.error('❌ Error loading data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (groupId: string) => {
    try {
      const response = await groupAPI.getMembers(groupId);
      console.log('📊 Members:', response.data);
      // Ensure the role is typed correctly
      const membersData = response.data.map((m: any) => ({
        ...m,
        role: m.role || 'member'
      }));
      setMembers(membersData);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const loadCycleStatus = async (groupId: string) => {
    try {
      const response = await groupAPI.getCycleStatus(groupId);
      setCycleStatus(response.data);
      console.log('📊 Cycle Status:', response.data);
    } catch (error) {
      console.error('Error loading cycle status:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleEdit = (field: string, label: string, value: any, type: 'text' | 'number' | 'switch' | 'picker' = 'text', options: string[] = []) => {
    setEditingField(field);
    setEditLabel(label);
    setEditValue(String(value !== undefined && value !== null ? value : ''));
    setEditType(type);
    setPickerOptions(options);
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!group) {
      Alert.alert('Error', 'No group found');
      return;
    }

    if (!editValue.trim()) {
      Alert.alert('Error', 'Please enter a value');
      return;
    }

    try {
      setSaving(true);
      
      let value: any = editValue;
      
      const numberFields = [
        'default_interest_rate', 
        'max_loan_amount',
        'social_max_contribution', 
        'savings_min_contribution', 
        'savings_max_contribution',
        'daily_transaction_limit'
      ];
      
      if (numberFields.includes(editingField)) {
        value = parseFloat(editValue);
        if (isNaN(value)) {
          Alert.alert('Error', 'Please enter a valid number');
          setSaving(false);
          return;
        }
      }
      
      const payload = {
        [editingField]: value
      };
      
      console.log('📤 Updating group with data:', JSON.stringify(payload, null, 2));
      
      const response = await groupAPI.updateGroup(group.id, payload);
      console.log('📥 Update response status:', response.status);
      
      console.log('🔄 Verifying update...');
      const verifyResponse = await groupAPI.getGroups();
      let verifyData = [];
      if (Array.isArray(verifyResponse.data)) {
        verifyData = verifyResponse.data;
      } else if (verifyResponse.data.results) {
        verifyData = verifyResponse.data.results;
      }
      
      if (verifyData.length > 0) {
        const verifiedGroup = verifyData[0];
        const savedValue = verifiedGroup[editingField as keyof GroupSettings];
        console.log(`🔍 Field '${editingField}' saved as:`, savedValue);
        
        if (savedValue === value) {
          console.log('✅ ✅ ✅ Value saved successfully!');
          setGroup(verifiedGroup);
          Alert.alert('✅ Success', `${editLabel} updated successfully`);
          setShowEditModal(false);
        } else {
          console.warn('⚠️ Value mismatch! Saved:', savedValue, 'Expected:', value);
          setGroup(verifiedGroup);
          Alert.alert(
            '⚠️ Warning',
            `The value may not have been saved correctly.\n\nSaved: ${savedValue}\nExpected: ${value}`
          );
          setShowEditModal(false);
        }
      }
      
    } catch (error: any) {
      console.error('❌ Error updating:', error);
      Alert.alert('Error', 'Failed to update settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ============ CYCLE MANAGEMENT ============
  const handleStartCycle = async () => {
    if (!group) return;
    
    try {
      setSaving(true);
      const duration = parseInt(cycleDuration);
      if (isNaN(duration) || duration < 1) {
        Alert.alert('Error', 'Please enter a valid duration');
        return;
      }
      
      const response = await groupAPI.startCycle(group.id, {
        duration_months: duration,
        start_date: new Date().toISOString().split('T')[0]
      });
      
      console.log('📥 Cycle started:', response.data);
      Alert.alert('✅ Success', 'Cycle started successfully!');
      setShowCycleModal(false);
      await loadCycleStatus(group.id);
      await loadData();
      
    } catch (error: any) {
      console.error('❌ Error starting cycle:', error);
      Alert.alert('Error', 'Failed to start cycle. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEndCycle = async () => {
    if (!group) return;
    
    Alert.alert(
      'End Cycle',
      'Are you sure you want to end the current cycle?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Cycle',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              const response = await groupAPI.endCycle(group.id);
              console.log('📥 Cycle ended:', response.data);
              Alert.alert('✅ Success', 'Cycle ended successfully!');
              await loadCycleStatus(group.id);
              await loadData();
            } catch (error: any) {
              console.error('❌ Error ending cycle:', error);
              Alert.alert('Error', 'Failed to end cycle. Please try again.');
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  // ============ ROLE MANAGEMENT ============
  const handleAssignRole = (member: GroupMember) => {
    setSelectedMember(member);
    setSelectedRole(member.role || 'member');
    setShowRoleModal(true);
  };

  const saveRole = async () => {
    if (!selectedMember || !group) {
      Alert.alert('Error', 'No member or group selected');
      return;
    }

    try {
      setSaving(true);
    
    // Update the member's role using the correct endpoint
      const response = await groupAPI.updateMemberRole(
        group.id, 
        selectedMember.id, 
        selectedRole
      );
      console.log('📥 Role update response:', response.data);
    
    // Update the group's secretary/treasurer fields using the GroupMember ID
      const updateData: any = {};
    
      if (selectedRole === 'secretary') {
        updateData.secretary = selectedMember.id;
      } else if (selectedRole === 'treasurer') {
        updateData.treasurer = selectedMember.id;
      } else {
      // If assigning as member, remove from secretary/treasurer if they were assigned
        if (group.secretary === selectedMember.id) {
          updateData.secretary = null;
        }
        if (group.treasurer === selectedMember.id) {
          updateData.treasurer = null;
        }
      }
    
    // Update the group with the new secretary/treasurer
      if (Object.keys(updateData).length > 0) {
        console.log('📤 Updating group with role data:', updateData);
        const groupUpdateResponse = await groupAPI.updateGroup(group.id, updateData);
        console.log('📥 Group update response:', groupUpdateResponse.data);
      
        setGroup(prev => {
          if (!prev) return null;
          return {
            ...prev,
            ...updateData
          };
        });
      }
    
    // Update local members list
      setMembers(prev => 
        prev.map(m => {
          if (m.id === selectedMember.id) {
            return { ...m, role: selectedRole };
          }
          return m;
        })
      );
    
      Alert.alert('✅ Success', `${selectedMember.full_name} is now ${selectedRole}`);
      setShowRoleModal(false);
      setSelectedMember(null);
    
    // Refresh data to get latest
      await loadData();
    
    } catch (error: any) {
      console.error('❌ Error updating role:', error);
      Alert.alert('Error', 'Failed to update member role');
    } finally {
      setSaving(false);
    }
  };


  const renderSectionHeader = (title: string, icon: string) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderIcon}>
        <Text style={styles.sectionIcon}>{icon}</Text>
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  const renderSettingItem = (
    label: string, 
    value: any, 
    field: string, 
    type: 'text' | 'number' | 'switch' | 'picker' = 'text', 
    options: string[] = [], 
    isCurrency: boolean = false, 
    isPercentage: boolean = false
  ) => {
    let displayValue = 'Not set';
    let valueColor = colors.secondary;
    
    if (value !== undefined && value !== null && value !== '') {
      if (isCurrency) {
        displayValue = `MK ${Number(value).toLocaleString()}`;
        valueColor = colors.primary;
      } else if (isPercentage) {
        displayValue = `${Number(value).toFixed(2)}%`;
        valueColor = colors.primaryDark;
      } else {
        displayValue = String(value);
        valueColor = colors.text;
      }
    }
    
    return (
      <TouchableOpacity
        style={styles.settingItem}
        onPress={() => handleEdit(field, label, value, type, options)}
        activeOpacity={0.7}
      >
        <View style={styles.settingLeft}>
          <Text style={styles.settingLabel}>{label}</Text>
        </View>
        <View style={styles.settingRight}>
          <Text style={[styles.settingValue, { color: valueColor }]}>{displayValue}</Text>
          <Icon name="chevron-forward" size={20} color={colors.secondary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderLoanSettings = () => (
    <View style={styles.section}>
      <View style={styles.card}>
        {renderSectionHeader('Loan Settings', '📊')}
        <View style={styles.divider} />
        {renderSettingItem('Default Interest Rate', group?.default_interest_rate, 'default_interest_rate', 'number', [], false, true)}
        <View style={styles.divider} />
        {renderSettingItem('Max Loan Amount', group?.max_loan_amount, 'max_loan_amount', 'number', [], true)}
      </View>
    </View>
  );

  const renderContributionSettings = () => (
    <View style={styles.section}>
      <View style={styles.card}>
        {renderSectionHeader('Contribution Settings', '💰')}
        <View style={styles.divider} />
        {renderSettingItem('Social Max Contribution', group?.social_max_contribution, 'social_max_contribution', 'number', [], true)}
        {renderSettingItem('Savings Min Contribution', group?.savings_min_contribution, 'savings_min_contribution', 'number', [], true)}
        {renderSettingItem('Savings Max Contribution', group?.savings_max_contribution, 'savings_max_contribution', 'number', [], true)}
      </View>
    </View>
  );

  const renderMeetingSettings = () => (
    <View style={styles.section}>
      <View style={styles.card}>
        {renderSectionHeader('Meeting Settings', '📅')}
        <View style={styles.divider} />
        {renderSettingItem('Meeting Frequency', group?.meeting_frequency || 'weekly', 'meeting_frequency', 'picker', ['weekly', 'biweekly', 'monthly'])}
        {renderSettingItem('Meeting Day', group?.meeting_day || 'monday', 'meeting_day', 'picker', ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])}
      </View>
    </View>
  );

  const renderCycleManagement = () => {
    const isActive = cycleStatus?.is_active || group?.is_cycle_active || false;
    const progress = cycleStatus?.progress?.progress || 0;
    const startDate = cycleStatus?.start_date || group?.cycle_start_date;
    const endDate = cycleStatus?.end_date || group?.cycle_end_date;
    const duration = cycleStatus?.duration_months || group?.cycle_duration_months || 6;

    return (
      <View style={styles.section}>
        <View style={styles.card}>
          {renderSectionHeader('Cycle Management', '🔄')}
          <View style={styles.divider} />
          
          <View style={styles.cycleStatusCard}>
            <View style={styles.cycleStatusHeader}>
              <Text style={styles.cycleStatusLabel}>Current Status</Text>
              <View style={[
                styles.cycleStatusBadge,
                isActive ? styles.cycleStatusActive : styles.cycleStatusInactive
              ]}>
                <Text style={styles.cycleStatusBadgeText}>
                  {isActive ? '🟢 Active' : '🔴 Inactive'}
                </Text>
              </View>
            </View>
            
            {isActive && (
              <>
                <View style={styles.cycleProgressContainer}>
                  <Text style={styles.cycleProgressLabel}>Progress</Text>
                  <View style={styles.cycleProgressBar}>
                    <View style={[styles.cycleProgressFill, { width: `${Math.min(progress, 100)}%` }]} />
                  </View>
                  <Text style={styles.cycleProgressText}>{Math.round(progress)}%</Text>
                </View>
                
                <View style={styles.cycleDatesContainer}>
                  <View style={styles.cycleDateItem}>
                    <Text style={styles.cycleDateLabel}>Start Date</Text>
                    <Text style={styles.cycleDateValue}>
                      {startDate ? new Date(startDate).toLocaleDateString() : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.cycleDateItem}>
                    <Text style={styles.cycleDateLabel}>End Date</Text>
                    <Text style={styles.cycleDateValue}>
                      {endDate ? new Date(endDate).toLocaleDateString() : 'N/A'}
                    </Text>
                  </View>
                </View>
              </>
            )}
            
            <View style={styles.cycleDurationInfo}>
              <Text style={styles.cycleDurationLabel}>Duration</Text>
              <Text style={styles.cycleDurationValue}>{duration} months</Text>
            </View>
          </View>
          
          <View style={styles.cycleActions}>
            {!isActive ? (
              <TouchableOpacity
                style={styles.cycleStartButton}
                onPress={() => setShowCycleModal(true)}
                activeOpacity={0.7}
              >
                <Icon name="play-circle" size={20} color="#FFFFFF" />
                <Text style={styles.cycleButtonText}>Start New Cycle</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.cycleEndButton}
                onPress={handleEndCycle}
                activeOpacity={0.7}
              >
                <Icon name="stop-circle" size={20} color="#FFFFFF" />
                <Text style={styles.cycleButtonText}>End Current Cycle</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderMemberRoles = () => {
    // Get current secretary and treasurer from the group
    const secretary = group?.secretary_details;
    const treasurer = group?.treasurer_details;
    
    const secretaryName = secretary?.full_name || 'Not assigned';
    const treasurerName = treasurer?.full_name || 'Not assigned';

    return (
      <View style={styles.section}>
        <View style={styles.card}>
          {renderSectionHeader('Member Roles', '👥')}
          <View style={styles.divider} />
          
          {/* Current Role Holders */}
          <View style={styles.roleHoldersContainer}>
            <View style={styles.roleHolderItem}>
              <Text style={styles.roleHolderLabel}>📋 Secretary</Text>
              <Text style={styles.roleHolderValue}>{secretaryName}</Text>
            </View>
            <View style={styles.roleHolderItem}>
              <Text style={styles.roleHolderLabel}>💰 Treasurer</Text>
              <Text style={styles.roleHolderValue}>{treasurerName}</Text>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <Text style={styles.sectionSubtitle}>All Members</Text>
          <Text style={styles.sectionSubtitleNote}>Tap a member to assign/change their role</Text>
          
          {members.length === 0 ? (
            <View style={styles.emptyMembers}>
              <Icon name="people-outline" size={50} color={colors.secondary} />
              <Text style={styles.emptyMembersText}>No members found</Text>
            </View>
          ) : (
            members.map((member, index) => {
              const isSecretary = member.id === group?.secretary;
              const isTreasurer = member.id === group?.treasurer;
              const isSelected = isSecretary || isTreasurer;
              
              return (
                <TouchableOpacity
                  key={member.id}
                  style={[
                    styles.memberItem,
                    index === members.length - 1 && styles.memberItemLast,
                    isSelected && styles.memberItemHighlighted
                  ]}
                  onPress={() => handleAssignRole(member)}
                  activeOpacity={0.7}
                >
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                      {member.full_name?.charAt(0) || '?'}
                    </Text>
                    {isSelected && (
                      <View style={styles.memberSelectedDot} />
                    )}
                  </View>
                  <View style={styles.memberInfo}>
                    <View style={styles.memberNameRow}>
                      <Text style={styles.memberName}>{member.full_name}</Text>
                      {isSecretary && (
                        <View style={styles.roleTagSecretary}>
                          <Text style={styles.roleTagText}>Secretary</Text>
                        </View>
                      )}
                      {isTreasurer && (
                        <View style={styles.roleTagTreasurer}>
                          <Text style={styles.roleTagText}>Treasurer</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.memberPhone}>{member.phone_number}</Text>
                  </View>
                  <Icon name="chevron-forward" size={18} color={colors.secondary} />
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </View>
    );
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'loans':
        return renderLoanSettings();
      case 'contributions':
        return renderContributionSettings();
      case 'meetings':
        return renderMeetingSettings();
      case 'cycle':
        return renderCycleManagement();
      case 'roles':
        return renderMemberRoles();
      default:
        return renderLoanSettings();
    }
  };

  const renderEditModalContent = () => {
    if (editType === 'switch') {
      return (
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>{editLabel}</Text>
          <Switch
            value={editValue === 'true'}
            onValueChange={(value) => setEditValue(String(value))}
            trackColor={{ false: '#D1D5DB', true: colors.primary }}
            thumbColor={editValue === 'true' ? '#FFFFFF' : '#FFFFFF'}
            ios_backgroundColor="#D1D5DB"
          />
        </View>
      );
    } else if (editType === 'picker') {
      return (
        <View style={styles.pickerContainer}>
          {pickerOptions.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.pickerOption,
                editValue === option && styles.pickerOptionSelected,
              ]}
              onPress={() => setEditValue(option)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.pickerOptionText,
                editValue === option && styles.pickerOptionTextSelected,
              ]}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </Text>
              {editValue === option && (
                <Icon name="checkmark-circle" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      );
    } else {
      return (
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Enter new value</Text>
          <TextInput
            style={styles.modalInput}
            value={editValue}
            onChangeText={setEditValue}
            placeholder={`Enter ${editLabel.toLowerCase()}`}
            keyboardType={editType === 'number' ? 'numeric' : 'default'}
            placeholderTextColor={colors.secondary}
            selectionColor={colors.primary}
          />
        </View>
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContent}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group Settings</Text>
        <TouchableOpacity style={styles.headerAction} activeOpacity={0.7}>
          <Icon name="notifications-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.userCardWrapper}>
        <View style={styles.userCard}>
          <View style={styles.userAvatarContainer}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {profile?.full_name?.charAt(0) || '?'}
              </Text>
            </View>
            <View style={styles.statusBadge}>
              {group?.is_active ? (
                <Text style={styles.statusBadgeText}>Active</Text>
              ) : (
                <Text style={[styles.statusBadgeText, styles.statusBadgeInactive]}>Inactive</Text>
              )}
            </View>
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{profile?.full_name || 'User'}</Text>
            <Text style={styles.userRole}>{profile?.role || 'Chairman'}</Text>
            <View style={styles.userGroupContainer}>
              <Text style={styles.userGroupName}>{group?.group_name || 'No Group'}</Text>
              {group?.group_code && (
                <View style={styles.groupCodeBadge}>
                  <Text style={styles.groupCodeText}>#{group.group_code}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'loans', label: '📊 Loans' },
            { key: 'contributions', label: '💰 Savings' },
            { key: 'meetings', label: '📅 Meetings' },
            { key: 'cycle', label: '🔄 Cycle' },
            { key: 'roles', label: '👥 Roles' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && styles.tabActive,
              ]}
              onPress={() => setActiveTab(tab.key as SettingsTab)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}>
                {tab.label}
              </Text>
              {activeTab === tab.key && (
                <View style={styles.tabIndicator} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {renderActiveTab()}
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>💡 Tap any setting to edit it</Text>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit {editLabel}</Text>
                <TouchableOpacity
                  onPress={() => setShowEditModal(false)}
                  activeOpacity={0.7}
                  style={styles.modalCloseButton}
                >
                  <Icon name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.modalIconContainer}>
                  <Text style={styles.modalIcon}>✏️</Text>
                </View>
                <Text style={styles.modalDescription}>
                  Update the {editLabel.toLowerCase()} for your group
                </Text>
                
                {renderEditModalContent()}

                <TouchableOpacity
                  style={[styles.modalSaveButton, saving && styles.modalSaveButtonDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.7}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.modalSaveButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Cycle Start Modal */}
      <Modal
        visible={showCycleModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCycleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Start New Cycle</Text>
                <TouchableOpacity
                  onPress={() => setShowCycleModal(false)}
                  activeOpacity={0.7}
                  style={styles.modalCloseButton}
                >
                  <Icon name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.modalIconContainer}>
                  <Text style={styles.modalIcon}>🔄</Text>
                </View>
                <Text style={styles.modalDescription}>
                  Start a new cycle for your group. This will reset contributions and loans for the new period.
                </Text>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Cycle Duration (Months)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={cycleDuration}
                    onChangeText={setCycleDuration}
                    placeholder="Enter duration in months"
                    keyboardType="numeric"
                    placeholderTextColor={colors.secondary}
                    selectionColor={colors.primary}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.modalSaveButton, saving && styles.modalSaveButtonDisabled]}
                  onPress={handleStartCycle}
                  disabled={saving}
                  activeOpacity={0.7}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.modalSaveButtonText}>Start Cycle</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Role Assignment Modal */}
      <Modal
        visible={showRoleModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRoleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Assign Role</Text>
                <TouchableOpacity
                  onPress={() => setShowRoleModal(false)}
                  activeOpacity={0.7}
                  style={styles.modalCloseButton}
                >
                  <Icon name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                {selectedMember && (
                  <>
                    <View style={styles.memberCard}>
                      <View style={styles.memberCardAvatar}>
                        <Text style={styles.memberCardAvatarText}>
                          {selectedMember.full_name?.charAt(0) || '?'}
                        </Text>
                      </View>
                      <View style={styles.memberCardInfo}>
                        <Text style={styles.memberCardName}>{selectedMember.full_name}</Text>
                        <Text style={styles.memberCardPhone}>{selectedMember.phone_number}</Text>
                        {selectedMember.role && selectedMember.role !== 'member' && (
                          <Text style={styles.memberCardCurrentRole}>
                            Current: {selectedMember.role}
                          </Text>
                        )}
                      </View>
                    </View>
                    
                    <Text style={styles.modalLabel}>Select Role</Text>
                    <View style={styles.rolePickerContainer}>
                      {(['member', 'treasurer', 'secretary'] as MemberRole[]).map((role) => (
                        <TouchableOpacity
                          key={role}
                          style={[
                            styles.roleOption,
                            selectedRole === role && styles.roleOptionSelected,
                          ]}
                          onPress={() => setSelectedRole(role)}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.roleOptionText,
                            selectedRole === role && styles.roleOptionTextSelected,
                          ]}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </Text>
                          {selectedRole === role && (
                            <Icon name="checkmark-circle" size={20} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>

                    {selectedRole === 'secretary' && (
                      <Text style={styles.roleDescription}>
                        Secretary will manage meeting records and member communications
                      </Text>
                    )}
                    {selectedRole === 'treasurer' && (
                      <Text style={styles.roleDescription}>
                        Treasurer will manage group finances and contributions
                      </Text>
                    )}
                    {selectedRole === 'member' && (
                      <Text style={styles.roleDescription}>
                        Regular member with no special role
                      </Text>
                    )}

                    <TouchableOpacity
                      style={[styles.modalSaveButton, saving && styles.modalSaveButtonDisabled]}
                      onPress={saveRole}
                      disabled={saving}
                      activeOpacity={0.7}
                    >
                      {saving ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.modalSaveButtonText}>Assign Role</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
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
    backgroundColor: colors.primary,
    borderBottomWidth: 0,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerAction: {
    padding: 4,
  },
  userCardWrapper: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  userCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  userAvatarContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  userAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  userAvatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusBadgeInactive: {
    backgroundColor: colors.warning,
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  userRole: {
    fontSize: 13,
    color: colors.secondary,
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  userGroupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  userGroupName: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  groupCodeBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  groupCodeText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  tabContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 4,
    position: 'relative',
  },
  tabActive: {
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.secondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: '25%',
    right: '25%',
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionIcon: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  sectionSubtitleNote: {
    fontSize: 12,
    color: colors.secondary,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  settingLeft: {
    flex: 1,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '400',
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  roleHoldersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  roleHolderItem: {
    flex: 1,
    padding: 8,
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  roleHolderLabel: {
    fontSize: 12,
    color: colors.secondary,
  },
  roleHolderValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  memberItemLast: {
    borderBottomWidth: 0,
  },
  memberItemHighlighted: {
    backgroundColor: colors.primary + '05',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  memberSelectedDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  memberName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  memberPhone: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 1,
  },
  roleTagSecretary: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  roleTagTreasurer: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  roleTagText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.primary,
  },
  cycleStatusCard: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cycleStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cycleStatusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  cycleStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cycleStatusActive: {
    backgroundColor: colors.success + '20',
  },
  cycleStatusInactive: {
    backgroundColor: colors.error + '20',
  },
  cycleStatusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cycleProgressContainer: {
    marginBottom: 12,
  },
  cycleProgressLabel: {
    fontSize: 12,
    color: colors.secondary,
    marginBottom: 4,
  },
  cycleProgressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  cycleProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  cycleProgressText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'right',
  },
  cycleDatesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cycleDateItem: {
    flex: 1,
  },
  cycleDateLabel: {
    fontSize: 11,
    color: colors.secondary,
    marginBottom: 2,
  },
  cycleDateValue: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  cycleDurationInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cycleDurationLabel: {
    fontSize: 13,
    color: colors.secondary,
  },
  cycleDurationValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  cycleActions: {
    marginTop: 8,
  },
  cycleStartButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  cycleEndButton: {
    backgroundColor: colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  cycleButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyMembers: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMembersText: {
    marginTop: 10,
    fontSize: 14,
    color: colors.secondary,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: colors.secondary,
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalIconContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  modalIcon: {
    fontSize: 36,
  },
  modalDescription: {
    textAlign: 'center',
    fontSize: 14,
    color: colors.secondary,
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  roleDescription: {
    fontSize: 12,
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    color: colors.secondary,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    fontSize: 15,
    color: colors.text,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#F5F7FA',
    marginBottom: 8,
    minWidth: 80,
    justifyContent: 'center',
  },
  pickerOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  pickerOptionText: {
    fontSize: 14,
    color: colors.text,
    marginRight: 4,
  },
  pickerOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  modalSaveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalSaveButtonDisabled: {
    opacity: 0.6,
  },
  modalSaveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  memberCardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberCardAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
  },
  memberCardInfo: {
    marginLeft: 12,
    flex: 1,
  },
  memberCardName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  memberCardPhone: {
    fontSize: 13,
    color: colors.secondary,
  },
  memberCardCurrentRole: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  rolePickerContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#F5F7FA',
    minHeight: 48,
  },
  roleOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  roleOptionText: {
    fontSize: 13,
    color: colors.secondary,
    fontWeight: '500',
    marginRight: 4,
  },
  roleOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
});





// src/screens/ProfileScreen.tsx - UPDATED (removed fields that don't exist)
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
//   TextInput,
//   Modal,
//   Switch,
//   KeyboardAvoidingView,
//   Platform,
//   StatusBar,
//   Dimensions,
// } from 'react-native';
// import { colors } from '../theme/colors';
// import { groupAPI, authAPI } from '../api/endpoints';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { useFocusEffect } from '@react-navigation/native';
// import Icon from 'react-native-vector-icons/Ionicons';

// const { width, height } = Dimensions.get('window');

// interface GroupSettings {
//   id: string;
//   group_name: string;
//   group_code: string;
//   is_active: boolean;
//   default_interest_rate: number;
//   group_loan_min_amount: number;
//   group_loan_max_amount: number;
//   social_max_contribution?: number;
//   savings_min_contribution?: number;
//   savings_max_contribution?: number;
//   meeting_frequency?: string;
//   meeting_day?: string;
//   daily_transaction_limit?: number;
//   max_loan_amount: number;
//   // Cycle fields
//   cycle_start_date?: string;
//   cycle_end_date?: string;
//   cycle_duration_months?: number;
//   is_cycle_active?: boolean;
// }

// interface UserProfile {
//   id: string;
//   email: string;
//   full_name: string;
//   phone_number: string;
//   role: string;
//   is_active: boolean;
// }

// type SettingsTab = 'loans' | 'contributions' | 'meetings' | 'cycle' | 'roles';

// export default function ProfileScreen({ navigation }: any) {
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [profile, setProfile] = useState<UserProfile | null>(null);
//   const [group, setGroup] = useState<GroupSettings | null>(null);
//   const [activeTab, setActiveTab] = useState<SettingsTab>('loans');
  
//   // Edit modal states
//   const [showEditModal, setShowEditModal] = useState(false);
//   const [editingField, setEditingField] = useState<string>('');
//   const [editValue, setEditValue] = useState<string>('');
//   const [editLabel, setEditLabel] = useState<string>('');
//   const [saving, setSaving] = useState(false);
//   const [editType, setEditType] = useState<'text' | 'number' | 'switch' | 'picker'>('text');
//   const [pickerOptions, setPickerOptions] = useState<string[]>([]);

//   // Member role management states
//   const [members, setMembers] = useState<any[]>([]);
//   const [showRoleModal, setShowRoleModal] = useState(false);
//   const [selectedMember, setSelectedMember] = useState<any>(null);
//   const [selectedRole, setSelectedRole] = useState<string>('member');

//   // Cycle management states
//   const [cycleStatus, setCycleStatus] = useState<any>(null);
//   const [showCycleModal, setShowCycleModal] = useState(false);
//   const [cycleDuration, setCycleDuration] = useState('6');

//   useFocusEffect(
//     useCallback(() => {
//       loadData();
//     }, [])
//   );

//   const loadData = async () => {
//     try {
//       setLoading(true);
//       console.log('📡 Loading profile and group data...');
      
//       const token = await AsyncStorage.getItem('access_token');
//       if (!token) {
//         console.log('⚠️ No token found');
//         setLoading(false);
//         return;
//       }

//       // Load profile
//       const profileResponse = await authAPI.getProfile();
//       console.log('📊 Profile:', profileResponse.data);
//       setProfile(profileResponse.data);

//       // Load group
//       const groupsResponse = await groupAPI.getGroups();
//       let groupsData = [];
//       if (Array.isArray(groupsResponse.data)) {
//         groupsData = groupsResponse.data;
//       } else if (groupsResponse.data.results) {
//         groupsData = groupsResponse.data.results;
//       }
      
//       if (groupsData.length > 0) {
//         const userGroup = groupsData[0];
//         console.log('📊 Group:', userGroup);
//         setGroup(userGroup);
        
//         // Load members for role management
//         await loadMembers(userGroup.id);
        
//         // Load cycle status
//         await loadCycleStatus(userGroup.id);
//       }
      
//     } catch (error: any) {
//       console.error('❌ Error loading data:', error);
//       Alert.alert('Error', 'Failed to load profile data');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const loadMembers = async (groupId: string) => {
//     try {
//       const response = await groupAPI.getMembers(groupId);
//       setMembers(response.data || []);
//     } catch (error) {
//       console.error('Error loading members:', error);
//     }
//   };

//   const loadCycleStatus = async (groupId: string) => {
//     try {
//       const response = await groupAPI.getCycleStatus(groupId);
//       setCycleStatus(response.data);
//       console.log('📊 Cycle Status:', response.data);
//     } catch (error) {
//       console.error('Error loading cycle status:', error);
//     }
//   };

//   const onRefresh = async () => {
//     setRefreshing(true);
//     await loadData();
//     setRefreshing(false);
//   };

//   const handleEdit = (field: string, label: string, value: any, type: 'text' | 'number' | 'switch' | 'picker' = 'text', options: string[] = []) => {
//     setEditingField(field);
//     setEditLabel(label);
//     setEditValue(String(value !== undefined && value !== null ? value : ''));
//     setEditType(type);
//     setPickerOptions(options);
//     setShowEditModal(true);
//   };

//   const handleSave = async () => {
//     if (!group) {
//       Alert.alert('Error', 'No group found');
//       return;
//     }

//     if (!editValue.trim()) {
//       Alert.alert('Error', 'Please enter a value');
//       return;
//     }

//     try {
//       setSaving(true);
      
//       let value: any = editValue;
      
//       const numberFields = [
//         'default_interest_rate', 
//         'social_max_contribution', 
//         'savings_min_contribution', 
//         'savings_max_contribution',
//         'daily_transaction_limit', 
//         'max_loan_amount'
//       ];
      
//       if (numberFields.includes(editingField)) {
//         value = parseFloat(editValue);
//         if (isNaN(value)) {
//           Alert.alert('Error', 'Please enter a valid number');
//           setSaving(false);
//           return;
//         }
//       }
      
//       const payload = {
//         [editingField]: value
//       };
      
//       console.log('📤 Updating group with data:', JSON.stringify(payload, null, 2));
      
//       const response = await groupAPI.updateGroup(group.id, payload);
//       console.log('📥 Update response status:', response.status);
      
//       // Verify the update
//       console.log('🔄 Verifying update...');
//       const verifyResponse = await groupAPI.getGroups();
//       let verifyData = [];
//       if (Array.isArray(verifyResponse.data)) {
//         verifyData = verifyResponse.data;
//       } else if (verifyResponse.data.results) {
//         verifyData = verifyResponse.data.results;
//       }
      
//       if (verifyData.length > 0) {
//         const verifiedGroup = verifyData[0];
//         const savedValue = verifiedGroup[editingField as keyof GroupSettings];
//         console.log(`🔍 Field '${editingField}' saved as:`, savedValue);
        
//         if (savedValue === value) {
//           console.log('✅ ✅ ✅ Value saved successfully!');
//           setGroup(verifiedGroup);
//           Alert.alert('✅ Success', `${editLabel} updated successfully`);
//           setShowEditModal(false);
//         } else {
//           console.warn('⚠️ Value mismatch!');
//           setGroup(verifiedGroup);
//           Alert.alert(
//             '⚠️ Warning',
//             `The value may not have been saved correctly. Please check the settings.`
//           );
//           setShowEditModal(false);
//         }
//       }
      
//     } catch (error: any) {
//       console.error('❌ Error updating:', error);
//       Alert.alert('Error', 'Failed to update settings. Please try again.');
//     } finally {
//       setSaving(false);
//     }
//   };

//   // ============ CYCLE MANAGEMENT ============
//   const handleStartCycle = async () => {
//     if (!group) return;
    
//     try {
//       setSaving(true);
//       const duration = parseInt(cycleDuration);
//       if (isNaN(duration) || duration < 1) {
//         Alert.alert('Error', 'Please enter a valid duration');
//         return;
//       }
      
//       const response = await groupAPI.startCycle(group.id, {
//         duration_months: duration,
//         start_date: new Date().toISOString().split('T')[0]
//       });
      
//       console.log('📥 Cycle started:', response.data);
//       Alert.alert('✅ Success', 'Cycle started successfully!');
//       setShowCycleModal(false);
//       await loadCycleStatus(group.id);
//       await loadData();
      
//     } catch (error: any) {
//       console.error('❌ Error starting cycle:', error);
//       Alert.alert('Error', 'Failed to start cycle. Please try again.');
//     } finally {
//       setSaving(false);
//     }
//   };

//   const handleEndCycle = async () => {
//     if (!group) return;
    
//     Alert.alert(
//       'End Cycle',
//       'Are you sure you want to end the current cycle?',
//       [
//         { text: 'Cancel', style: 'cancel' },
//         {
//           text: 'End Cycle',
//           style: 'destructive',
//           onPress: async () => {
//             try {
//               setSaving(true);
//               const response = await groupAPI.endCycle(group.id);
//               console.log('📥 Cycle ended:', response.data);
//               Alert.alert('✅ Success', 'Cycle ended successfully!');
//               await loadCycleStatus(group.id);
//               await loadData();
//             } catch (error: any) {
//               console.error('❌ Error ending cycle:', error);
//               Alert.alert('Error', 'Failed to end cycle. Please try again.');
//             } finally {
//               setSaving(false);
//             }
//           }
//         }
//       ]
//     );
//   };

//   // ============ ROLE MANAGEMENT ============
//   const handleAssignRole = (member: any) => {
//     setSelectedMember(member);
//     setSelectedRole(member.role || 'member');
//     setShowRoleModal(true);
//   };

//   const saveRole = async () => {
//     if (!selectedMember || !group) {
//       Alert.alert('Error', 'No member or group selected');
//       return;
//     }

//     try {
//       setSaving(true);
//       const response = await groupAPI.updateMemberRole(group.id, selectedMember.id, selectedRole);
//       console.log('📥 Role update response:', response.data);
      
//       setMembers(prev => 
//         prev.map(m => 
//           m.id === selectedMember.id ? { ...m, role: selectedRole } : m
//         )
//       );
      
//       Alert.alert('✅ Success', `${selectedMember.full_name} role updated to ${selectedRole}`);
//       setShowRoleModal(false);
//       setSelectedMember(null);
//     } catch (error: any) {
//       console.error('❌ Error updating role:', error);
//       Alert.alert('Error', 'Failed to update member role');
//     } finally {
//       setSaving(false);
//     }
//   };

//   const renderSectionHeader = (title: string, icon: string) => (
//     <View style={styles.sectionHeader}>
//       <View style={styles.sectionHeaderIcon}>
//         <Text style={styles.sectionIcon}>{icon}</Text>
//       </View>
//       <Text style={styles.sectionTitle}>{title}</Text>
//     </View>
//   );

//   const renderSettingItem = (
//     label: string, 
//     value: any, 
//     field: string, 
//     type: 'text' | 'number' | 'switch' | 'picker' = 'text', 
//     options: string[] = [], 
//     isCurrency: boolean = false, 
//     isPercentage: boolean = false
//   ) => {
//     let displayValue = 'Not set';
//     let valueColor = colors.secondary;
    
//     if (value !== undefined && value !== null && value !== '') {
//       if (isCurrency) {
//         displayValue = `MK ${Number(value).toLocaleString()}`;
//         valueColor = colors.primary;
//       } else if (isPercentage) {
//         displayValue = `${Number(value).toFixed(2)}%`;
//         valueColor = colors.primaryDark;
//       } else {
//         displayValue = String(value);
//         valueColor = colors.text;
//       }
//     }
    
//     return (
//       <TouchableOpacity
//         style={styles.settingItem}
//         onPress={() => handleEdit(field, label, value, type, options)}
//         activeOpacity={0.7}
//       >
//         <View style={styles.settingLeft}>
//           <Text style={styles.settingLabel}>{label}</Text>
//         </View>
//         <View style={styles.settingRight}>
//           <Text style={[styles.settingValue, { color: valueColor }]}>{displayValue}</Text>
//           <Icon name="chevron-forward" size={20} color={colors.secondary} />
//         </View>
//       </TouchableOpacity>
//     );
//   };

//   const renderLoanSettings = () => (
//     <View style={styles.section}>
//       <View style={styles.card}>
//         {renderSectionHeader('Loan Settings', '📊')}
        
//         <View style={styles.divider} />
        
//         {renderSettingItem('Default Interest Rate', group?.default_interest_rate, 'default_interest_rate', 'number', [], false, true)}
//         <View style={styles.divider} />
        
//         {renderSettingItem('Max Loan Amount', group?.group_loan_max_amount, 'group_loan_max_amount', 'number', [], true)}
//       </View>
//     </View>
//   );

//   const renderContributionSettings = () => (
//     <View style={styles.section}>
//       <View style={styles.card}>
//         {renderSectionHeader('Contribution Settings', '💰')}
        
//         <View style={styles.divider} />
        
//         {renderSettingItem('Social Max Contribution', group?.social_max_contribution, 'social_max_contribution', 'number', [], true)}
//         {renderSettingItem('Savings Min Contribution', group?.savings_min_contribution, 'savings_min_contribution', 'number', [], true)}
//         {renderSettingItem('Savings Max Contribution', group?.savings_max_contribution, 'savings_max_contribution', 'number', [], true)}
//       </View>
//     </View>
//   );

//   const renderMeetingSettings = () => (
//     <View style={styles.section}>
//       <View style={styles.card}>
//         {renderSectionHeader('Meeting Settings', '📅')}
        
//         <View style={styles.divider} />
        
//         {renderSettingItem('Meeting Frequency', group?.meeting_frequency || 'weekly', 'meeting_frequency', 'picker', ['weekly', 'biweekly', 'monthly'])}
//         {renderSettingItem('Meeting Day', group?.meeting_day || 'monday', 'meeting_day', 'picker', ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])}
//       </View>
//     </View>
//   );

//   const renderCycleManagement = () => {
//     const isActive = cycleStatus?.is_active || group?.is_cycle_active || false;
//     const progress = cycleStatus?.progress?.progress || 0;
//     const status = cycleStatus?.status || 'Not Active';
//     const startDate = cycleStatus?.start_date || group?.cycle_start_date;
//     const endDate = cycleStatus?.end_date || group?.cycle_end_date;
//     const duration = cycleStatus?.duration_months || group?.cycle_duration_months || 6;

//     return (
//       <View style={styles.section}>
//         <View style={styles.card}>
//           {renderSectionHeader('Cycle Management', '🔄')}
          
//           <View style={styles.divider} />
          
//           {/* Cycle Status Card */}
//           <View style={styles.cycleStatusCard}>
//             <View style={styles.cycleStatusHeader}>
//               <Text style={styles.cycleStatusLabel}>Current Status</Text>
//               <View style={[
//                 styles.cycleStatusBadge,
//                 isActive ? styles.cycleStatusActive : styles.cycleStatusInactive
//               ]}>
//                 <Text style={styles.cycleStatusBadgeText}>
//                   {isActive ? '🟢 Active' : '🔴 Inactive'}
//                 </Text>
//               </View>
//             </View>
            
//             {isActive && (
//               <>
//                 <View style={styles.cycleProgressContainer}>
//                   <Text style={styles.cycleProgressLabel}>Progress</Text>
//                   <View style={styles.cycleProgressBar}>
//                     <View style={[styles.cycleProgressFill, { width: `${Math.min(progress, 100)}%` }]} />
//                   </View>
//                   <Text style={styles.cycleProgressText}>{Math.round(progress)}%</Text>
//                 </View>
                
//                 <View style={styles.cycleDatesContainer}>
//                   <View style={styles.cycleDateItem}>
//                     <Text style={styles.cycleDateLabel}>Start Date</Text>
//                     <Text style={styles.cycleDateValue}>
//                       {startDate ? new Date(startDate).toLocaleDateString() : 'N/A'}
//                     </Text>
//                   </View>
//                   <View style={styles.cycleDateItem}>
//                     <Text style={styles.cycleDateLabel}>End Date</Text>
//                     <Text style={styles.cycleDateValue}>
//                       {endDate ? new Date(endDate).toLocaleDateString() : 'N/A'}
//                     </Text>
//                   </View>
//                 </View>
//               </>
//             )}
            
//             <View style={styles.cycleDurationInfo}>
//               <Text style={styles.cycleDurationLabel}>Duration</Text>
//               <Text style={styles.cycleDurationValue}>{duration} months</Text>
//             </View>
//           </View>
          
//           <View style={styles.cycleActions}>
//             {!isActive ? (
//               <TouchableOpacity
//                 style={styles.cycleStartButton}
//                 onPress={() => setShowCycleModal(true)}
//                 activeOpacity={0.7}
//               >
//                 <Icon name="play-circle" size={20} color="#FFFFFF" />
//                 <Text style={styles.cycleButtonText}>Start New Cycle</Text>
//               </TouchableOpacity>
//             ) : (
//               <TouchableOpacity
//                 style={styles.cycleEndButton}
//                 onPress={handleEndCycle}
//                 activeOpacity={0.7}
//               >
//                 <Icon name="stop-circle" size={20} color="#FFFFFF" />
//                 <Text style={styles.cycleButtonText}>End Current Cycle</Text>
//               </TouchableOpacity>
//             )}
//           </View>
//         </View>
//       </View>
//     );
//   };

//   const renderMemberRoles = () => (
//     <View style={styles.section}>
//       <View style={styles.card}>
//         {renderSectionHeader('Member Roles', '👥')}
        
//         <View style={styles.divider} />
        
//         {members.length === 0 ? (
//           <View style={styles.emptyMembers}>
//             <Icon name="people-outline" size={50} color={colors.secondary} />
//             <Text style={styles.emptyMembersText}>No members found</Text>
//           </View>
//         ) : (
//           members.map((member, index) => (
//             <TouchableOpacity
//               key={member.id}
//               style={[
//                 styles.memberItem,
//                 index === members.length - 1 && styles.memberItemLast
//               ]}
//               onPress={() => handleAssignRole(member)}
//               activeOpacity={0.7}
//             >
//               <View style={styles.memberAvatar}>
//                 <Text style={styles.memberAvatarText}>
//                   {member.full_name?.charAt(0) || '?'}
//                 </Text>
//               </View>
//               <View style={styles.memberInfo}>
//                 <Text style={styles.memberName}>{member.full_name}</Text>
//                 <Text style={styles.memberPhone}>{member.phone_number}</Text>
//               </View>
//               <View style={styles.memberRoleContainer}>
//                 <View style={styles.memberRoleBadge}>
//                   <Text style={styles.memberRole}>{member.role || 'member'}</Text>
//                 </View>
//                 <Icon name="chevron-forward" size={18} color={colors.secondary} />
//               </View>
//             </TouchableOpacity>
//           ))
//         )}
//       </View>
//     </View>
//   );

//   const renderActiveTab = () => {
//     switch (activeTab) {
//       case 'loans':
//         return renderLoanSettings();
//       case 'contributions':
//         return renderContributionSettings();
//       case 'meetings':
//         return renderMeetingSettings();
//       case 'cycle':
//         return renderCycleManagement();
//       case 'roles':
//         return renderMemberRoles();
//       default:
//         return renderLoanSettings();
//     }
//   };

//   const renderEditModalContent = () => {
//     if (editType === 'switch') {
//       return (
//         <View style={styles.switchContainer}>
//           <Text style={styles.switchLabel}>{editLabel}</Text>
//           <Switch
//             value={editValue === 'true'}
//             onValueChange={(value) => setEditValue(String(value))}
//             trackColor={{ false: '#D1D5DB', true: colors.primary }}
//             thumbColor={editValue === 'true' ? '#FFFFFF' : '#FFFFFF'}
//             ios_backgroundColor="#D1D5DB"
//           />
//         </View>
//       );
//     } else if (editType === 'picker') {
//       return (
//         <View style={styles.pickerContainer}>
//           {pickerOptions.map((option) => (
//             <TouchableOpacity
//               key={option}
//               style={[
//                 styles.pickerOption,
//                 editValue === option && styles.pickerOptionSelected,
//               ]}
//               onPress={() => setEditValue(option)}
//               activeOpacity={0.7}
//             >
//               <Text style={[
//                 styles.pickerOptionText,
//                 editValue === option && styles.pickerOptionTextSelected,
//               ]}>
//                 {option.charAt(0).toUpperCase() + option.slice(1)}
//               </Text>
//               {editValue === option && (
//                 <Icon name="checkmark-circle" size={20} color={colors.primary} />
//               )}
//             </TouchableOpacity>
//           ))}
//         </View>
//       );
//     } else {
//       return (
//         <View style={styles.inputContainer}>
//           <Text style={styles.inputLabel}>Enter new value</Text>
//           <TextInput
//             style={styles.modalInput}
//             value={editValue}
//             onChangeText={setEditValue}
//             placeholder={`Enter ${editLabel.toLowerCase()}`}
//             keyboardType={editType === 'number' ? 'numeric' : 'default'}
//             placeholderTextColor={colors.secondary}
//             selectionColor={colors.primary}
//           />
//         </View>
//       );
//     }
//   };

//   if (loading) {
//     return (
//       <SafeAreaView style={styles.centerContent}>
//         <ActivityIndicator size="large" color={colors.primary} />
//         <Text style={styles.loadingText}>Loading profile...</Text>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      
//       {/* Profile Header */}
//       <View style={styles.header}>
//         <TouchableOpacity
//           style={styles.backButton}
//           onPress={() => navigation.goBack()}
//           activeOpacity={0.7}
//         >
//           <Icon name="arrow-back" size={24} color="#FFFFFF" />
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>Group Settings</Text>
//         <TouchableOpacity style={styles.headerAction} activeOpacity={0.7}>
//           <Icon name="notifications-outline" size={24} color="#FFFFFF" />
//         </TouchableOpacity>
//       </View>

//       {/* User Info Card */}
//       <View style={styles.userCardWrapper}>
//         <View style={styles.userCard}>
//           <View style={styles.userAvatarContainer}>
//             <View style={styles.userAvatar}>
//               <Text style={styles.userAvatarText}>
//                 {profile?.full_name?.charAt(0) || '?'}
//               </Text>
//             </View>
//             <View style={styles.statusBadge}>
//               {group?.is_active ? (
//                 <Text style={styles.statusBadgeText}>Active</Text>
//               ) : (
//                 <Text style={[styles.statusBadgeText, styles.statusBadgeInactive]}>Inactive</Text>
//               )}
//             </View>
//           </View>
          
//           <View style={styles.userInfo}>
//             <Text style={styles.userName}>{profile?.full_name || 'User'}</Text>
//             <Text style={styles.userRole}>{profile?.role || 'Chairman'}</Text>
//             <View style={styles.userGroupContainer}>
//               <Text style={styles.userGroupName}>{group?.group_name || 'No Group'}</Text>
//               {group?.group_code && (
//                 <View style={styles.groupCodeBadge}>
//                   <Text style={styles.groupCodeText}>#{group.group_code}</Text>
//                 </View>
//               )}
//             </View>
//           </View>
//         </View>
//       </View>

//       {/* Tabs */}
//       <View style={styles.tabContainer}>
//         <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//           {[
//             { key: 'loans', label: '📊 Loans' },
//             { key: 'contributions', label: '💰 Savings' },
//             { key: 'meetings', label: '📅 Meetings' },
//             { key: 'cycle', label: '🔄 Cycle' },
//             { key: 'roles', label: '👥 Roles' },
//           ].map((tab) => (
//             <TouchableOpacity
//               key={tab.key}
//               style={[
//                 styles.tab,
//                 activeTab === tab.key && styles.tabActive,
//               ]}
//               onPress={() => setActiveTab(tab.key as SettingsTab)}
//               activeOpacity={0.7}
//             >
//               <Text style={[
//                 styles.tabText,
//                 activeTab === tab.key && styles.tabTextActive,
//               ]}>
//                 {tab.label}
//               </Text>
//               {activeTab === tab.key && (
//                 <View style={styles.tabIndicator} />
//               )}
//             </TouchableOpacity>
//           ))}
//         </ScrollView>
//       </View>

//       {/* Settings Content */}
//       <ScrollView
//         style={styles.content}
//         refreshControl={
//           <RefreshControl 
//             refreshing={refreshing} 
//             onRefresh={onRefresh}
//             colors={[colors.primary]}
//             tintColor={colors.primary}
//           />
//         }
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={styles.contentContainer}
//       >
//         {renderActiveTab()}
        
//         <View style={styles.footer}>
//           <Text style={styles.footerText}>
//             💡 Tap any setting to edit it
//           </Text>
//         </View>
//       </ScrollView>

//       {/* Edit Modal */}
//       <Modal
//         visible={showEditModal}
//         transparent
//         animationType="fade"
//         onRequestClose={() => setShowEditModal(false)}
//       >
//         <KeyboardAvoidingView
//           behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//           style={styles.modalOverlay}
//         >
//           <View style={styles.modalBackdrop}>
//             <View style={styles.modalContent}>
//               <View style={styles.modalHeader}>
//                 <Text style={styles.modalTitle}>Edit {editLabel}</Text>
//                 <TouchableOpacity
//                   onPress={() => setShowEditModal(false)}
//                   activeOpacity={0.7}
//                   style={styles.modalCloseButton}
//                 >
//                   <Icon name="close" size={24} color={colors.text} />
//                 </TouchableOpacity>
//               </View>

//               <View style={styles.modalBody}>
//                 <View style={styles.modalIconContainer}>
//                   <Text style={styles.modalIcon}>✏️</Text>
//                 </View>
//                 <Text style={styles.modalDescription}>
//                   Update the {editLabel.toLowerCase()} for your group
//                 </Text>
                
//                 {renderEditModalContent()}

//                 <TouchableOpacity
//                   style={[styles.modalSaveButton, saving && styles.modalSaveButtonDisabled]}
//                   onPress={handleSave}
//                   disabled={saving}
//                   activeOpacity={0.7}
//                 >
//                   {saving ? (
//                     <ActivityIndicator color="#FFFFFF" size="small" />
//                   ) : (
//                     <Text style={styles.modalSaveButtonText}>Save Changes</Text>
//                   )}
//                 </TouchableOpacity>
//               </View>
//             </View>
//           </View>
//         </KeyboardAvoidingView>
//       </Modal>

//       {/* Cycle Start Modal */}
//       <Modal
//         visible={showCycleModal}
//         transparent
//         animationType="fade"
//         onRequestClose={() => setShowCycleModal(false)}
//       >
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalBackdrop}>
//             <View style={styles.modalContent}>
//               <View style={styles.modalHeader}>
//                 <Text style={styles.modalTitle}>Start New Cycle</Text>
//                 <TouchableOpacity
//                   onPress={() => setShowCycleModal(false)}
//                   activeOpacity={0.7}
//                   style={styles.modalCloseButton}
//                 >
//                   <Icon name="close" size={24} color={colors.text} />
//                 </TouchableOpacity>
//               </View>

//               <View style={styles.modalBody}>
//                 <View style={styles.modalIconContainer}>
//                   <Text style={styles.modalIcon}>🔄</Text>
//                 </View>
//                 <Text style={styles.modalDescription}>
//                   Start a new cycle for your group. This will reset contributions and loans for the new period.
//                 </Text>
                
//                 <View style={styles.inputContainer}>
//                   <Text style={styles.inputLabel}>Cycle Duration (Months)</Text>
//                   <TextInput
//                     style={styles.modalInput}
//                     value={cycleDuration}
//                     onChangeText={setCycleDuration}
//                     placeholder="Enter duration in months"
//                     keyboardType="numeric"
//                     placeholderTextColor={colors.secondary}
//                     selectionColor={colors.primary}
//                   />
//                 </View>

//                 <TouchableOpacity
//                   style={[styles.modalSaveButton, saving && styles.modalSaveButtonDisabled]}
//                   onPress={handleStartCycle}
//                   disabled={saving}
//                   activeOpacity={0.7}
//                 >
//                   {saving ? (
//                     <ActivityIndicator color="#FFFFFF" size="small" />
//                   ) : (
//                     <Text style={styles.modalSaveButtonText}>Start Cycle</Text>
//                   )}
//                 </TouchableOpacity>
//               </View>
//             </View>
//           </View>
//         </View>
//       </Modal>

//       {/* Role Assignment Modal */}
//       <Modal
//         visible={showRoleModal}
//         transparent
//         animationType="fade"
//         onRequestClose={() => setShowRoleModal(false)}
//       >
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalBackdrop}>
//             <View style={styles.modalContent}>
//               <View style={styles.modalHeader}>
//                 <Text style={styles.modalTitle}>Assign Role</Text>
//                 <TouchableOpacity
//                   onPress={() => setShowRoleModal(false)}
//                   activeOpacity={0.7}
//                   style={styles.modalCloseButton}
//                 >
//                   <Icon name="close" size={24} color={colors.text} />
//                 </TouchableOpacity>
//               </View>

//               <View style={styles.modalBody}>
//                 {selectedMember && (
//                   <>
//                     <View style={styles.memberCard}>
//                       <View style={styles.memberCardAvatar}>
//                         <Text style={styles.memberCardAvatarText}>
//                           {selectedMember.full_name?.charAt(0) || '?'}
//                         </Text>
//                       </View>
//                       <View style={styles.memberCardInfo}>
//                         <Text style={styles.memberCardName}>{selectedMember.full_name}</Text>
//                         <Text style={styles.memberCardPhone}>{selectedMember.phone_number}</Text>
//                       </View>
//                     </View>
                    
//                     <Text style={styles.modalLabel}>Select Role</Text>
//                     <View style={styles.rolePickerContainer}>
//                       {['member', 'treasurer', 'secretary'].map((role) => (
//                         <TouchableOpacity
//                           key={role}
//                           style={[
//                             styles.roleOption,
//                             selectedRole === role && styles.roleOptionSelected,
//                           ]}
//                           onPress={() => setSelectedRole(role)}
//                           activeOpacity={0.7}
//                         >
//                           <Text style={[
//                             styles.roleOptionText,
//                             selectedRole === role && styles.roleOptionTextSelected,
//                           ]}>
//                             {role.charAt(0).toUpperCase() + role.slice(1)}
//                           </Text>
//                           {selectedRole === role && (
//                             <Icon name="checkmark-circle" size={20} color={colors.primary} />
//                           )}
//                         </TouchableOpacity>
//                       ))}
//                     </View>

//                     <TouchableOpacity
//                       style={[styles.modalSaveButton, saving && styles.modalSaveButtonDisabled]}
//                       onPress={saveRole}
//                       disabled={saving}
//                       activeOpacity={0.7}
//                     >
//                       {saving ? (
//                         <ActivityIndicator color="#FFFFFF" size="small" />
//                       ) : (
//                         <Text style={styles.modalSaveButtonText}>Assign Role</Text>
//                       )}
//                     </TouchableOpacity>
//                   </>
//                 )}
//               </View>
//             </View>
//           </View>
//         </View>
//       </Modal>
//     </SafeAreaView>
//   );
// }

// // ==================== STYLES ====================
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#F5F7FA',
//   },
//   centerContent: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#F5F7FA',
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
//     backgroundColor: colors.primary,
//     borderBottomWidth: 0,
//   },
//   backButton: {
//     padding: 4,
//   },
//   headerTitle: {
//     fontSize: 18,
//     fontWeight: '700',
//     color: '#FFFFFF',
//   },
//   headerAction: {
//     padding: 4,
//   },
//   userCardWrapper: {
//     paddingHorizontal: 16,
//     paddingTop: 16,
//     paddingBottom: 8,
//   },
//   userCard: {
//     flexDirection: 'row',
//     backgroundColor: '#FFFFFF',
//     padding: 16,
//     borderRadius: 16,
//     borderWidth: 1,
//     borderColor: colors.border,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.06,
//     shadowRadius: 8,
//     elevation: 3,
//   },
//   userAvatarContainer: {
//     position: 'relative',
//     alignItems: 'center',
//   },
//   userAvatar: {
//     width: 64,
//     height: 64,
//     borderRadius: 32,
//     backgroundColor: colors.primary,
//     justifyContent: 'center',
//     alignItems: 'center',
//     shadowColor: colors.primary,
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//     elevation: 4,
//   },
//   userAvatarText: {
//     fontSize: 28,
//     fontWeight: '700',
//     color: '#FFFFFF',
//   },
//   statusBadge: {
//     position: 'absolute',
//     bottom: -4,
//     right: -4,
//     backgroundColor: colors.success,
//     paddingHorizontal: 8,
//     paddingVertical: 2,
//     borderRadius: 10,
//     borderWidth: 2,
//     borderColor: '#FFFFFF',
//   },
//   statusBadgeText: {
//     fontSize: 9,
//     fontWeight: '600',
//     color: '#FFFFFF',
//   },
//   statusBadgeInactive: {
//     backgroundColor: colors.warning,
//   },
//   userInfo: {
//     flex: 1,
//     marginLeft: 16,
//     justifyContent: 'center',
//   },
//   userName: {
//     fontSize: 18,
//     fontWeight: '700',
//     color: colors.text,
//     marginBottom: 2,
//   },
//   userRole: {
//     fontSize: 13,
//     color: colors.secondary,
//     textTransform: 'capitalize',
//     marginBottom: 4,
//   },
//   userGroupContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     flexWrap: 'wrap',
//   },
//   userGroupName: {
//     fontSize: 14,
//     color: colors.text,
//     fontWeight: '500',
//   },
//   groupCodeBadge: {
//     backgroundColor: colors.primary + '15',
//     paddingHorizontal: 8,
//     paddingVertical: 2,
//     borderRadius: 6,
//     marginLeft: 8,
//   },
//   groupCodeText: {
//     fontSize: 11,
//     color: colors.primary,
//     fontWeight: '600',
//   },
//   tabContainer: {
//     backgroundColor: '#FFFFFF',
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     borderBottomWidth: 1,
//     borderBottomColor: colors.border,
//   },
//   tab: {
//     paddingVertical: 10,
//     paddingHorizontal: 16,
//     marginRight: 4,
//     position: 'relative',
//   },
//   tabActive: {
//     backgroundColor: colors.primary + '10',
//     borderRadius: 12,
//   },
//   tabText: {
//     fontSize: 13,
//     fontWeight: '500',
//     color: colors.secondary,
//   },
//   tabTextActive: {
//     color: colors.primary,
//     fontWeight: '600',
//   },
//   tabIndicator: {
//     position: 'absolute',
//     bottom: -1,
//     left: '25%',
//     right: '25%',
//     height: 3,
//     backgroundColor: colors.primary,
//     borderRadius: 3,
//   },
//   content: {
//     flex: 1,
//   },
//   contentContainer: {
//     paddingHorizontal: 16,
//     paddingTop: 16,
//     paddingBottom: 20,
//   },
//   section: {
//     marginBottom: 16,
//   },
//   card: {
//     backgroundColor: '#FFFFFF',
//     borderRadius: 16,
//     padding: 16,
//     borderWidth: 1,
//     borderColor: colors.border,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.04,
//     shadowRadius: 4,
//     elevation: 2,
//   },
//   sectionHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   sectionHeaderIcon: {
//     width: 32,
//     height: 32,
//     borderRadius: 8,
//     backgroundColor: colors.primary + '15',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 10,
//   },
//   sectionIcon: {
//     fontSize: 16,
//   },
//   sectionTitle: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: colors.text,
//   },
//   divider: {
//     height: 1,
//     backgroundColor: colors.border,
//     marginVertical: 8,
//   },
//   settingItem: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingVertical: 12,
//     paddingHorizontal: 4,
//     borderRadius: 8,
//   },
//   settingLeft: {
//     flex: 1,
//   },
//   settingRight: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   settingLabel: {
//     fontSize: 14,
//     color: colors.text,
//     fontWeight: '400',
//   },
//   settingValue: {
//     fontSize: 14,
//     fontWeight: '500',
//     marginRight: 8,
//   },
//   // Cycle Management Styles
//   cycleStatusCard: {
//     backgroundColor: '#F5F7FA',
//     borderRadius: 12,
//     padding: 16,
//     marginBottom: 12,
//   },
//   cycleStatusHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   cycleStatusLabel: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: colors.text,
//   },
//   cycleStatusBadge: {
//     paddingHorizontal: 12,
//     paddingVertical: 4,
//     borderRadius: 12,
//   },
//   cycleStatusActive: {
//     backgroundColor: colors.success + '20',
//   },
//   cycleStatusInactive: {
//     backgroundColor: colors.error + '20',
//   },
//   cycleStatusBadgeText: {
//     fontSize: 12,
//     fontWeight: '600',
//   },
//   cycleProgressContainer: {
//     marginBottom: 12,
//   },
//   cycleProgressLabel: {
//     fontSize: 12,
//     color: colors.secondary,
//     marginBottom: 4,
//   },
//   cycleProgressBar: {
//     height: 8,
//     backgroundColor: colors.border,
//     borderRadius: 4,
//     overflow: 'hidden',
//     marginBottom: 4,
//   },
//   cycleProgressFill: {
//     height: '100%',
//     backgroundColor: colors.primary,
//     borderRadius: 4,
//   },
//   cycleProgressText: {
//     fontSize: 12,
//     color: colors.primary,
//     fontWeight: '600',
//     textAlign: 'right',
//   },
//   cycleDatesContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginBottom: 12,
//   },
//   cycleDateItem: {
//     flex: 1,
//   },
//   cycleDateLabel: {
//     fontSize: 11,
//     color: colors.secondary,
//     marginBottom: 2,
//   },
//   cycleDateValue: {
//     fontSize: 13,
//     fontWeight: '500',
//     color: colors.text,
//   },
//   cycleDurationInfo: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingTop: 12,
//     borderTopWidth: 1,
//     borderTopColor: colors.border,
//   },
//   cycleDurationLabel: {
//     fontSize: 13,
//     color: colors.secondary,
//   },
//   cycleDurationValue: {
//     fontSize: 13,
//     fontWeight: '600',
//     color: colors.text,
//   },
//   cycleActions: {
//     marginTop: 8,
//   },
//   cycleStartButton: {
//     backgroundColor: colors.primary,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 12,
//     borderRadius: 12,
//     gap: 8,
//   },
//   cycleEndButton: {
//     backgroundColor: colors.error,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 12,
//     borderRadius: 12,
//     gap: 8,
//   },
//   cycleButtonText: {
//     color: '#FFFFFF',
//     fontSize: 14,
//     fontWeight: '600',
//   },
//   emptyMembers: {
//     padding: 30,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   emptyMembersText: {
//     marginTop: 10,
//     fontSize: 14,
//     color: colors.secondary,
//   },
//   memberItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: 10,
//     paddingHorizontal: 4,
//     borderBottomWidth: 1,
//     borderBottomColor: colors.border,
//   },
//   memberItemLast: {
//     borderBottomWidth: 0,
//   },
//   memberAvatar: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: colors.primary + '20',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   memberAvatarText: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: colors.primary,
//   },
//   memberInfo: {
//     flex: 1,
//     marginLeft: 12,
//   },
//   memberName: {
//     fontSize: 14,
//     fontWeight: '500',
//     color: colors.text,
//   },
//   memberPhone: {
//     fontSize: 12,
//     color: colors.secondary,
//   },
//   memberRoleContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   memberRoleBadge: {
//     backgroundColor: colors.primary + '15',
//     paddingHorizontal: 10,
//     paddingVertical: 4,
//     borderRadius: 12,
//     marginRight: 8,
//   },
//   memberRole: {
//     fontSize: 11,
//     color: colors.primary,
//     fontWeight: '600',
//     textTransform: 'capitalize',
//   },
//   footer: {
//     paddingVertical: 20,
//     alignItems: 'center',
//   },
//   footerText: {
//     fontSize: 12,
//     color: colors.secondary,
//     opacity: 0.7,
//   },
//   modalOverlay: {
//     flex: 1,
//   },
//   modalBackdrop: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 20,
//   },
//   modalContent: {
//     backgroundColor: '#FFFFFF',
//     borderRadius: 20,
//     width: '100%',
//     maxWidth: 420,
//     maxHeight: '85%',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 10 },
//     shadowOpacity: 0.25,
//     shadowRadius: 20,
//     elevation: 10,
//   },
//   modalHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: 20,
//     borderBottomWidth: 1,
//     borderBottomColor: colors.border,
//   },
//   modalTitle: {
//     fontSize: 18,
//     fontWeight: '700',
//     color: colors.text,
//   },
//   modalCloseButton: {
//     padding: 4,
//   },
//   modalBody: {
//     padding: 20,
//   },
//   modalIconContainer: {
//     alignItems: 'center',
//     marginBottom: 8,
//   },
//   modalIcon: {
//     fontSize: 36,
//   },
//   modalDescription: {
//     textAlign: 'center',
//     fontSize: 14,
//     color: colors.secondary,
//     marginBottom: 20,
//   },
//   modalLabel: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: colors.text,
//     marginBottom: 10,
//   },
//   inputContainer: {
//     marginBottom: 16,
//   },
//   inputLabel: {
//     fontSize: 13,
//     color: colors.secondary,
//     marginBottom: 8,
//   },
//   modalInput: {
//     backgroundColor: '#F5F7FA',
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: colors.border,
//     padding: 14,
//     fontSize: 15,
//     color: colors.text,
//   },
//   switchContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingVertical: 12,
//     paddingHorizontal: 16,
//     backgroundColor: '#F5F7FA',
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: colors.border,
//     marginBottom: 16,
//   },
//   switchLabel: {
//     fontSize: 15,
//     color: colors.text,
//     fontWeight: '500',
//   },
//   pickerContainer: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 8,
//     marginBottom: 16,
//   },
//   pickerOption: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 16,
//     paddingVertical: 10,
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: colors.border,
//     backgroundColor: '#F5F7FA',
//     marginBottom: 8,
//     minWidth: 80,
//     justifyContent: 'center',
//   },
//   pickerOptionSelected: {
//     borderColor: colors.primary,
//     backgroundColor: colors.primary + '10',
//   },
//   pickerOptionText: {
//     fontSize: 14,
//     color: colors.text,
//     marginRight: 4,
//   },
//   pickerOptionTextSelected: {
//     color: colors.primary,
//     fontWeight: '600',
//   },
//   modalSaveButton: {
//     backgroundColor: colors.primary,
//     paddingVertical: 14,
//     paddingHorizontal: 20,
//     borderRadius: 12,
//     alignItems: 'center',
//     marginTop: 8,
//     shadowColor: colors.primary,
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//     elevation: 4,
//   },
//   modalSaveButtonDisabled: {
//     opacity: 0.6,
//   },
//   modalSaveButtonText: {
//     color: '#FFFFFF',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   memberCard: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#F5F7FA',
//     padding: 12,
//     borderRadius: 12,
//     marginBottom: 16,
//   },
//   memberCardAvatar: {
//     width: 48,
//     height: 48,
//     borderRadius: 24,
//     backgroundColor: colors.primary + '20',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   memberCardAvatarText: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: colors.primary,
//   },
//   memberCardInfo: {
//     marginLeft: 12,
//     flex: 1,
//   },
//   memberCardName: {
//     fontSize: 15,
//     fontWeight: '600',
//     color: colors.text,
//   },
//   memberCardPhone: {
//     fontSize: 13,
//     color: colors.secondary,
//   },
//   rolePickerContainer: {
//     flexDirection: 'row',
//     gap: 8,
//     marginBottom: 16,
//   },
//   roleOption: {
//     flex: 1,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 12,
//     paddingHorizontal: 8,
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: colors.border,
//     backgroundColor: '#F5F7FA',
//     minHeight: 48,
//   },
//   roleOptionSelected: {
//     borderColor: colors.primary,
//     backgroundColor: colors.primary + '10',
//   },
//   roleOptionText: {
//     fontSize: 13,
//     color: colors.secondary,
//     fontWeight: '500',
//     marginRight: 4,
//   },
//   roleOptionTextSelected: {
//     color: colors.primary,
//     fontWeight: '600',
//   },
// });