// src/screens/BankDetailsScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../theme/colors';
import { groupAPI } from '../api/endpoints';

const BANK_OPTIONS = [
  'NBS Bank',
  'FDH Bank',
  'Standard Bank of Malawi',
  'Ecobank Malawi',
  'National Bank of Malawi',
  'Financial Bank of Malawi',
  'Others',
];

export function BankDetailsScreen({ route, navigation }: any) {
  const { groupId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [hasDetails, setHasDetails] = useState(false);
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [selectedBank, setSelectedBank] = useState('');
  const [otherBankName, setOtherBankName] = useState('');
  const [mobileProvider, setMobileProvider] = useState<'airtel' | 'tnm'>('airtel');
  
  const [formData, setFormData] = useState({
    bank_name: '',
    bank_account_number: '',
    bank_account_name: '',
    bank_branch: '',
    billing_number: '',
    mobile_money_provider: '',
    mobile_money_number: '',
  });

  useEffect(() => {
    if (!groupId) {
      Alert.alert('Error', 'Group ID is missing');
      navigation.goBack();
      return;
    }
    loadBankDetails();
  }, [groupId]);

  const loadBankDetails = async () => {
    try {
      setLoading(true);
      const response = await groupAPI.getBankAccount(groupId);
      console.log('Bank details response:', response.data);
      
      if (response.data) {
        const data = response.data;
        const bankName = data.bank_name || '';
        
        // Check if the bank name is in our list or is a custom entry
        const isKnownBank = BANK_OPTIONS.includes(bankName);
        
        setFormData({
          bank_name: bankName,
          bank_account_number: data.bank_account_number || '',
          bank_account_name: data.bank_account_name || '',
          bank_branch: data.bank_branch || '',
          billing_number: data.ecoret_billing_code || data.billing_number || '',
          mobile_money_provider: data.mobile_money_provider || 'airtel',
          mobile_money_number: data.mobile_money_number || '',
        });
        
        // Set mobile provider
        if (data.mobile_money_provider === 'tnm') {
          setMobileProvider('tnm');
        } else {
          setMobileProvider('airtel');
        }
        
        if (isKnownBank) {
          setSelectedBank(bankName);
          setOtherBankName('');
        } else if (bankName) {
          setSelectedBank('Others');
          setOtherBankName(bankName);
        } else {
          setSelectedBank('');
          setOtherBankName('');
        }
        
        const hasBankDetails = !!(data.bank_account_number || data.bank_name);
        setHasDetails(hasBankDetails);
        
        if (hasBankDetails) {
          setIsEditing(false);
        } else {
          setIsEditing(true);
        }
      } else {
        setIsEditing(true);
        setHasDetails(false);
      }
    } catch (error) {
      console.log('No bank details found:', error);
      setIsEditing(true);
      setHasDetails(false);
      
      try {
        const groupResponse = await groupAPI.getGroup(groupId);
        if (groupResponse.data && groupResponse.data.ecoret_billing_code) {
          setFormData(prev => ({
            ...prev,
            billing_number: groupResponse.data.ecoret_billing_code || '',
          }));
        }
      } catch (e) {
        console.log('Could not load ECORET billing code:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBank = (bank: string) => {
    setSelectedBank(bank);
    setShowBankDropdown(false);
    
    if (bank === 'Others') {
      setFormData({ ...formData, bank_name: '' });
    } else {
      setFormData({ ...formData, bank_name: bank });
      setOtherBankName('');
    }
  };

  const handleOtherBankNameChange = (text: string) => {
    setOtherBankName(text);
    setFormData({ ...formData, bank_name: text });
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    loadBankDetails();
    setIsEditing(false);
  };

  const validateForm = () => {
    // Check if bank name is selected
    const bankName = selectedBank === 'Others' ? otherBankName : selectedBank;
    if (!bankName || bankName.trim() === '') {
      Alert.alert('Error', 'Please select a bank or enter bank name');
      return false;
    }

    // Account number is required
    if (!formData.bank_account_number || formData.bank_account_number.trim() === '') {
      Alert.alert('Error', 'Bank account number is required');
      return false;
    }

    // Account name is required
    if (!formData.bank_account_name || formData.bank_account_name.trim() === '') {
      Alert.alert('Error', 'Bank account name is required');
      return false;
    }

    // Branch is required
    if (!formData.bank_branch || formData.bank_branch.trim() === '') {
      Alert.alert('Error', 'Bank branch is required');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const bankName = selectedBank === 'Others' ? otherBankName : selectedBank;
      
      await groupAPI.updateBankAccount(groupId, {
        bank_name: bankName,
        bank_account_number: formData.bank_account_number,
        bank_account_name: formData.bank_account_name,
        bank_branch: formData.bank_branch,
        ecoret_billing_code: formData.billing_number,
      });

      // Save mobile money details if provided
      if (formData.mobile_money_number) {
        await groupAPI.updateMobileMoney(groupId, {
          mobile_money_provider: mobileProvider,
          mobile_money_number: formData.mobile_money_number,
        });
      }

      Alert.alert('Success', 'Bank details saved successfully!');
      setHasDetails(true);
      setIsEditing(false);
      await loadBankDetails();
    } catch (error: any) {
      console.error('Save error:', error);
      Alert.alert('Error', error?.response?.data?.error || 'Failed to save bank details');
    } finally {
      setSaving(false);
    }
  };

  const renderBankDropdown = () => {
    return (
      <Modal
        visible={showBankDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBankDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowBankDropdown(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Bank</Text>
              <TouchableOpacity onPress={() => setShowBankDropdown(false)}>
                <Icon name="close-outline" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={BANK_OPTIONS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    selectedBank === item && styles.dropdownItemSelected,
                  ]}
                  onPress={() => handleSelectBank(item)}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      selectedBank === item && styles.dropdownItemTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                  {selectedBank === item && (
                    <Icon name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.dropdownSeparator} />}
            />
          </View>
        </TouchableOpacity>
      </Modal>
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Bank Account Details</Text>
            <Text style={styles.subtitle}>
              {hasDetails && !isEditing 
                ? 'View your group bank account information' 
                : 'Manage group banking and payment information'}
            </Text>
          </View>
          {hasDetails && !isEditing && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEdit}
              activeOpacity={0.7}
            >
              <Icon name="create-outline" size={18} color="#FFFFFF" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Bank Account Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="business-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}> Bank Account</Text>
          </View>
          
          {/* Bank Name - Dropdown */}
          <View style={styles.field}>
            <Text style={[styles.label, styles.requiredLabel]}>Bank Name *</Text>
            <TouchableOpacity
              style={[styles.inputWrapper, !isEditing && styles.readOnlyWrapper, styles.dropdownButton]}
              onPress={() => isEditing && setShowBankDropdown(true)}
              activeOpacity={isEditing ? 0.7 : 1}
            >
              <Icon name="business-outline" size={18} color={colors.secondary} style={styles.inputIcon} />
              <Text style={[styles.dropdownText, !selectedBank && styles.placeholderText]}>
                {selectedBank === 'Others' && otherBankName ? otherBankName : selectedBank || 'Select a bank'}
              </Text>
              {isEditing && (
                <Icon name="chevron-down-outline" size={20} color={colors.secondary} />
              )}
            </TouchableOpacity>
          </View>

          {/* Others - Custom Bank Name Input */}
          {selectedBank === 'Others' && isEditing && (
            <View style={styles.field}>
              <Text style={[styles.label, styles.requiredLabel]}>Enter Bank Name *</Text>
              <View style={[styles.inputWrapper, !isEditing && styles.readOnlyWrapper]}>
                <Icon name="create-outline" size={18} color={colors.secondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, !isEditing && styles.readOnlyInput]}
                  value={otherBankName}
                  onChangeText={handleOtherBankNameChange}
                  placeholder="Enter bank name"
                  placeholderTextColor={colors.secondary}
                  editable={isEditing}
                />
              </View>
            </View>
          )}

          {/* Account Number - Required */}
          <View style={styles.field}>
            <Text style={[styles.label, styles.requiredLabel]}>Account Number *</Text>
            <View style={[styles.inputWrapper, !isEditing && styles.readOnlyWrapper]}>
              <Icon name="card-outline" size={18} color={colors.secondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, !isEditing && styles.readOnlyInput]}
                value={formData.bank_account_number}
                onChangeText={(text) => setFormData({ ...formData, bank_account_number: text })}
                placeholder="Enter bank account number"
                keyboardType="numeric"
                placeholderTextColor={colors.secondary}
                editable={isEditing}
              />
            </View>
          </View>

          {/* Account Name - Required */}
          <View style={styles.field}>
            <Text style={[styles.label, styles.requiredLabel]}>Account Name *</Text>
            <View style={[styles.inputWrapper, !isEditing && styles.readOnlyWrapper]}>
              <Icon name="person-outline" size={18} color={colors.secondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, !isEditing && styles.readOnlyInput]}
                value={formData.bank_account_name}
                onChangeText={(text) => setFormData({ ...formData, bank_account_name: text })}
                placeholder="Enter account holder name"
                placeholderTextColor={colors.secondary}
                editable={isEditing}
              />
            </View>
          </View>

          {/* Branch - Required */}
          <View style={styles.field}>
            <Text style={[styles.label, styles.requiredLabel]}>Branch *</Text>
            <View style={[styles.inputWrapper, !isEditing && styles.readOnlyWrapper]}>
              <Icon name="location-outline" size={18} color={colors.secondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, !isEditing && styles.readOnlyInput]}
                value={formData.bank_branch}
                onChangeText={(text) => setFormData({ ...formData, bank_branch: text })}
                placeholder="Enter bank branch"
                placeholderTextColor={colors.secondary}
                editable={isEditing}
              />
            </View>
          </View>

          {/* Billing Number */}
          <View style={styles.field}>
            <Text style={styles.label}>ECORET Billing Code</Text>
            <View style={[styles.inputWrapper, !isEditing && styles.readOnlyWrapper]}>
              <Icon name="pricetag-outline" size={18} color={colors.secondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, !isEditing && styles.readOnlyInput]}
                value={formData.billing_number}
                onChangeText={(text) => setFormData({ ...formData, billing_number: text })}
                placeholder="ECORET billing code"
                placeholderTextColor={colors.secondary}
                editable={isEditing}
              />
            </View>
          </View>
        </View>

        {/* Mobile Money Section - WITH BUTTONS */}
        <View style={[styles.section, styles.mobileSection]}>
          <View style={styles.sectionHeader}>
            <Icon name="phone-portrait-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}> Mobile Money</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Provider</Text>
            <View style={styles.providerRow}>
              <TouchableOpacity
                style={[
                  styles.providerButton,
                  mobileProvider === 'airtel' && styles.providerButtonActive,
                  !isEditing && styles.providerButtonDisabled,
                ]}
                onPress={() => isEditing && setMobileProvider('airtel')}
                activeOpacity={isEditing ? 0.7 : 1}
                disabled={!isEditing}
              >
                <Text
                  style={[
                    styles.providerButtonText,
                    mobileProvider === 'airtel' && styles.providerButtonTextActive,
                    !isEditing && styles.providerButtonTextDisabled,
                  ]}
                >
                  Airtel Money
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.providerButton,
                  mobileProvider === 'tnm' && styles.providerButtonActive,
                  !isEditing && styles.providerButtonDisabled,
                ]}
                onPress={() => isEditing && setMobileProvider('tnm')}
                activeOpacity={isEditing ? 0.7 : 1}
                disabled={!isEditing}
              >
                <Text
                  style={[
                    styles.providerButtonText,
                    mobileProvider === 'tnm' && styles.providerButtonTextActive,
                    !isEditing && styles.providerButtonTextDisabled,
                  ]}
                >
                  TNM Mpamba
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Mobile Money Number</Text>
            <View style={[styles.inputWrapper, !isEditing && styles.readOnlyWrapper]}>
              <Icon name="call-outline" size={18} color={colors.secondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, !isEditing && styles.readOnlyInput]}
                value={formData.mobile_money_number}
                onChangeText={(text) => setFormData({ ...formData, mobile_money_number: text })}
                placeholder="Enter mobile money number"
                keyboardType="phone-pad"
                placeholderTextColor={colors.secondary}
                editable={isEditing}
              />
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        {isEditing ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.saveButton, saving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.7}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Icon name="save-outline" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                  <Text style={styles.saveButtonText}>Save</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : hasDetails && (
          <View style={styles.editInfoContainer}>
            <Icon name="information-circle-outline" size={20} color={colors.secondary} />
            <Text style={styles.editInfoText}>
              Tap the edit button above to make changes
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bank Dropdown Modal */}
      {renderBankDropdown()}
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.secondary,
    marginTop: 2,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mobileSection: {
    borderColor: '#dbeafe',
    backgroundColor: '#f0f9ff',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 4,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  requiredLabel: {
    color: colors.text,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
  },
  readOnlyWrapper: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
  },
  readOnlyInput: {
    color: colors.secondary,
  },
  dropdownButton: {
    justifyContent: 'space-between',
    paddingVertical: 0,
  },
  dropdownText: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
  },
  placeholderText: {
    color: colors.secondary,
  },
  // Provider buttons
  providerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  providerButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  providerButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary ,
  },
  providerButtonDisabled: {
    opacity: 0.7,
  },
  providerButtonText: {
    fontSize: 13,
    color: colors.secondary,
  },
  providerButtonTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  providerButtonTextDisabled: {
    color: colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  editInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginTop: 8,
  },
  editInfoText: {
    fontSize: 13,
    color: colors.secondary,
    marginLeft: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
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
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  dropdownItemSelected: {
    backgroundColor: colors.primary + '10',
  },
  dropdownItemText: {
    fontSize: 15,
    color: colors.text,
  },
  dropdownItemTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  dropdownSeparator: {
    height: 1,
    backgroundColor: colors.border,
  },
});