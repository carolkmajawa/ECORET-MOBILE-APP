import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../theme/colors';
import { authAPI } from '../api/endpoints';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }
    setLoading(true);
    try {
      await authAPI.forgotPassword(email.trim());
      setSent(true);
    } catch (err: any) {
      const data = err?.response?.data;
      setError(data?.error || data?.detail || 'Something went wrong. Please try again.');
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
            <Icon name={sent ? 'mail-open-outline' : 'lock-closed-outline'} size={32} color={colors.secondary} />
          </View>

          {!sent ? (
            <>
              <Text style={styles.title}>Forgot Password?</Text>
              <Text style={styles.subtitle}>
                Enter the email linked to your account and we'll send you a reset link.
              </Text>

              <View style={styles.card}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputWrapper}>
                  <Icon name="mail-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    editable={!loading}
                  />
                </View>

                {error ? (
                  <View style={styles.errorRow}>
                    <Icon name="alert-circle-outline" size={14} color={colors.error} />
                    <Text style={styles.error}>{error}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleSubmit}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Icon name="paper-plane-outline" size={18} color="#fff" />
                      <Text style={styles.buttonText}>Send Reset Link</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.title}>Check your email</Text>
              <Text style={styles.subtitle}>
                If an account exists for{'\n'}
                <Text style={styles.emailHighlight}>{email.trim()}</Text>, we've sent a reset link.
                Open it, then enter the code on the next screen.
              </Text>

              <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.navigate('ResetPassword', { email: email.trim() })}
                activeOpacity={0.85}
              >
                <Icon name="key-outline" size={18} color="#fff" />
                <Text style={styles.buttonText}>I Have My Code</Text>
              </TouchableOpacity>
            </>
          )}

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
    backgroundColor: '#e5f6fa', // soft tint of secondary
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    borderWidth: 1.5, borderColor: colors.secondaryLight,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.text, textAlign: 'center', marginBottom: 8 },
  subtitle: {
    fontSize: 14, color: colors.textSecondary, textAlign: 'center',
    lineHeight: 20, marginBottom: 28, paddingHorizontal: 8,
  },
  emailHighlight: { fontWeight: '700', color: colors.text },
  card: {
    width: '100%', backgroundColor: colors.surface, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.secondaryDark, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 3,
  },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderColor: colors.border, borderRadius: 10, backgroundColor: colors.background,
  },
  inputIcon: { paddingLeft: 12 },
  input: { flex: 1, padding: 12, fontSize: 15, color: colors.text },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  error: { color: colors.error, fontSize: 12, flexShrink: 1 },
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 10,
    marginTop: 18, width: '100%',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  linkButton: { marginTop: 24, alignItems: 'center' },
  linkText: { color: colors.secondary, fontSize: 14, fontWeight: '600' },
});