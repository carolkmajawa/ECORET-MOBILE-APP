import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../theme/colors';
import { authAPI } from '../api/endpoints';

export default function ResetPasswordScreen({ route, navigation }: any) {
  const [token, setToken] = useState(route?.params?.token || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const requirements = useMemo(() => ([
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'One number', met: /\d/.test(newPassword) },
    { label: 'One uppercase letter', met: /[A-Z]/.test(newPassword) },
  ]), [newPassword]);

  const strength = requirements.filter(r => r.met).length;
  const strengthLabel = ['Too weak', 'Weak', 'Good', 'Strong'][strength];
  const strengthColor = [colors.error, colors.warning, colors.secondary, colors.success][strength];

  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleReset = async () => {
    setError('');
    if (!token.trim()) {
      setError('Please enter the reset code from your email.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await authAPI.resetPassword(token.trim(), newPassword);
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (err: any) {
      const data = err?.response?.data;
      setError(
        data?.non_field_errors?.[0] || data?.detail || data?.error ||
        'Invalid or expired code. Please request a new one.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Icon name="shield-checkmark-outline" size={32} color={colors.secondary} />
          </View>

          <Text style={styles.title}>Set New Password</Text>
          <Text style={styles.subtitle}>
            Enter the code from your email and choose a new password.
          </Text>

          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>Reset Code</Text>
              <View style={styles.inputWrapper}>
                <Icon name="key-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Code from email"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  value={token}
                  onChangeText={setToken}
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputWrapper}>
                <Icon name="lock-closed-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="At least 8 characters"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  <Icon name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {newPassword.length > 0 && (
                <View style={styles.strengthSection}>
                  <View style={styles.strengthBarTrack}>
                    <View
                      style={[
                        styles.strengthBarFill,
                        { width: `${(strength / 3) * 100}%`, backgroundColor: strengthColor },
                      ]}
                    />
                  </View>
                  <Text style={[styles.strengthLabel, { color: strengthColor }]}>{strengthLabel}</Text>
                </View>
              )}

              <View style={styles.requirementsList}>
                {requirements.map((req) => (
                  <View key={req.label} style={styles.requirementRow}>
                    <Icon
                      name={req.met ? 'checkmark-circle' : 'ellipse-outline'}
                      size={14}
                      color={req.met ? colors.success : colors.textMuted}
                    />
                    <Text style={[styles.requirementText, req.met && styles.requirementTextMet]}>
                      {req.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={[
                styles.inputWrapper,
                passwordsMatch && styles.inputWrapperSuccess,
                passwordsMismatch && styles.inputWrapperError,
              ]}>
                <Icon name="lock-closed-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!loading}
                />
                {passwordsMatch && (
                  <Icon name="checkmark-circle" size={18} color={colors.success} style={styles.checkIcon} />
                )}
              </View>
              {passwordsMismatch && (
                <Text style={styles.fieldError}>Passwords don't match</Text>
              )}
            </View>

            {error ? (
              <View style={styles.errorRow}>
                <Icon name="alert-circle-outline" size={14} color={colors.error} />
                <Text style={styles.error}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleReset}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="checkmark-circle-outline" size={18} color="#fff" />
                  <Text style={styles.buttonText}>Reset Password</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Login')} disabled={loading}>
            <Text style={styles.linkText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  backButton: { padding: 16 },
  content: { flex: 1, paddingHorizontal: 24, alignItems: 'center', paddingTop: 8 },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#e5f6fa',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    borderWidth: 1.5, borderColor: colors.secondaryLight,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.text, textAlign: 'center', marginBottom: 8 },
  subtitle: {
    fontSize: 14, color: colors.textSecondary, textAlign: 'center',
    lineHeight: 20, marginBottom: 24, paddingHorizontal: 8,
  },
  card: {
    width: '100%', backgroundColor: colors.surface, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.secondaryDark, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 3,
  },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderColor: colors.border, borderRadius: 10, backgroundColor: colors.background,
  },
  inputWrapperSuccess: {
    borderColor: colors.success,
    backgroundColor: '#f0fdf4',
  },
  inputWrapperError: {
    borderColor: colors.error,
    backgroundColor: '#fef2f2',
  },
  inputIcon: { paddingLeft: 12 },
  input: { flex: 1, padding: 12, fontSize: 15, color: colors.text },
  eyeButton: { padding: 10 },
  checkIcon: { paddingRight: 12 },
  strengthSection: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8,
  },
  strengthBarTrack: {
    flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%', borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11, fontWeight: '700', minWidth: 62, textAlign: 'right',
  },
  requirementsList: {
    marginTop: 10, gap: 4,
  },
  requirementRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  requirementText: {
    fontSize: 12, color: colors.textMuted,
  },
  requirementTextMet: {
    color: colors.success,
  },
  fieldError: {
    fontSize: 11, color: colors.error, marginTop: 4, marginLeft: 2,
  },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  error: { color: colors.error, fontSize: 12, flexShrink: 1 },
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 10, marginTop: 6,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  linkButton: { marginTop: 24, alignItems: 'center' },
  linkText: { color: colors.secondary, fontSize: 14, fontWeight: '600' },
});