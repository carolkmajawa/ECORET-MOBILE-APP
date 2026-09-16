// src/screens/RoleSelectScreen.tsx
import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import Icon from 'react-native-vector-icons/Ionicons'
import { colors } from '../theme/colors'

export function RoleSelectScreen() {
  const navigation = useNavigation<any>()

  const handleAdminRequest = () => {
    navigation.navigate('Register', { role: 'admin', action: 'request' })
  }

  const handleChairmanSignup = () => {
    navigation.navigate('Register', { role: 'chairman', action: 'signup' })
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to ECORET</Text>
          <Text style={styles.subtitle}>Select your role to get started</Text>
        </View>

        {/* Admin Role - Submit Request */}
        <View style={styles.roleSection}>
          <Text style={styles.sectionTitle}>🔐 ECORET Admin</Text>
          <Text style={styles.sectionSubtitle}>Request admin access for approval</Text>

          <TouchableOpacity
            style={[styles.roleCard, styles.adminCard]}
            onPress={handleAdminRequest}
          >
            <View style={styles.roleHeader}>
              <View style={[styles.roleIcon, { backgroundColor: `${colors.secondary}15` }]}>
                <Icon name="shield-checkmark" size={28} color={colors.secondary} />
              </View>
              <View style={styles.roleInfo}>
                <Text style={styles.roleTitle}>ECORET Administrator</Text>
                <Text style={styles.roleDescription}>
                  Request admin access. Your request must be approved by existing ECORET Administrators.
                </Text>
              </View>
            </View>
            <View style={[styles.actionButton, styles.requestButton]}>
              <Text style={[styles.actionText, styles.requestText]}>Submit Request →</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.adminNotice}>
            <Icon name="information-circle" size={18} color={colors.warning} />
            <Text style={styles.adminNoticeText}>
              Admin requests require approval from existing admins. You'll be notified once approved.
            </Text>
          </View>
        </View>

        {/* Chairman Role - Sign Up */}
        <View style={styles.roleSection}>
          <Text style={styles.sectionTitle}>👥 Group Chairman</Text>
          <Text style={styles.sectionSubtitle}>Sign up to manage your group</Text>

          <TouchableOpacity
            style={[styles.roleCard, styles.chairmanCard]}
            onPress={handleChairmanSignup}
          >
            <View style={styles.roleHeader}>
              <View style={[styles.roleIcon, { backgroundColor: `${colors.primary}15` }]}>
                <Icon name="people" size={28} color={colors.primary} />
              </View>
              <View style={styles.roleInfo}>
                <Text style={styles.roleTitle}>Group Chairman</Text>
                <Text style={styles.roleDescription}>
                  Manage your group, members, loans, and savings instantly.
                </Text>
              </View>
            </View>
            <View style={styles.actionButton}>
              <Text style={styles.actionText}>Sign Up →</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Back to Login */}
        <TouchableOpacity 
          style={styles.backLink}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.backText}>
            Already have an account? <Text style={styles.backHighlight}>Login</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  roleSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 12,
  },
  roleCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chairmanCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  adminCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  roleDescription: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  actionButton: {
    alignSelf: 'flex-end',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: colors.primary,
    borderRadius: 20,
  },
  requestButton: {
    backgroundColor: colors.secondary,
  },
  actionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  requestText: {
    color: '#fff',
  },
  adminNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.warning}10`,
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  adminNoticeText: {
    flex: 1,
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: 8,
    lineHeight: 16,
  },
  backLink: {
    alignItems: 'center',
    marginTop: 8,
  },
  backText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  backHighlight: {
    color: colors.primary,
    fontWeight: '600',
  },
})