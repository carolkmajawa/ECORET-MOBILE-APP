// import React, { useState } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   ActivityIndicator,
//   ScrollView,
//   Alert,
//   KeyboardAvoidingView,
//   Platform,
//   SafeAreaView,
// } from 'react-native';
// import { useAuth } from '../auth/AuthContext';
// import { colors } from '../theme/colors';
// import Icon from 'react-native-vector-icons/Ionicons';

// // Alert.alert with a button array never renders a dialog on web, so its
// // onPress callbacks (including navigation) never fire. This helper falls
// // back to window.alert + an immediate action on web, and keeps the native
// // button-based Alert.alert everywhere else.
// const notifyAndProceed = (title: string, message: string, action: () => void) => {
//   if (Platform.OS === 'web') {
//     window.alert(`${title}\n\n${message}`);
//     action();
//   } else {
//     Alert.alert(title, message, [{ text: 'Go to Login', onPress: action }], { cancelable: false });
//   }
// };

// export default function RegisterScreen({ navigation, route }: any) {
//   const { register, setPendingApprovalUser } = useAuth();
//   const isAdminRequest = route?.params?.role === 'admin' && route?.params?.action === 'request';
//   const [loading, setLoading] = useState(false);
//   const [showPassword, setShowPassword] = useState(false);
//   const [showConfirmPassword, setShowConfirmPassword] = useState(false);
//   const [error, setError] = useState('');
//   const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

//   const [formData, setFormData] = useState({
//     first_name: '',
//     last_name: '',
//     email: '',
//     phone_number: '',
//     password: '',
//     confirm_password: '',
//     role: isAdminRequest ? 'admin' : 'chairman',
//   });

//   const formatPhoneNumber = (phone: string): string => {
//     let cleaned = phone.replace(/[^0-9]/g, '');
//     if (cleaned.startsWith('0')) {
//       cleaned = cleaned.substring(1);
//     }
//     if (!cleaned.startsWith('265')) {
//       cleaned = '265' + cleaned;
//     }
//     return '+' + cleaned;
//   };

//   const validate = (): boolean => {
//     const errors: Record<string, string> = {};

//     if (!formData.first_name.trim()) {
//       errors.first_name = 'First name is required';
//     }
//     if (!formData.last_name.trim()) {
//       errors.last_name = 'Last name is required';
//     }
//     if (!formData.email.trim()) {
//       errors.email = 'Email is required';
//     } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
//       errors.email = 'Email is invalid';
//     }
//     if (!formData.phone_number.trim()) {
//       errors.phone_number = 'Phone number is required';
//     } else {
//       const phoneDigits = formData.phone_number.replace(/[^0-9]/g, '');
//       if (phoneDigits.length < 10 || phoneDigits.length > 15) {
//         errors.phone_number = 'Phone number must be 10-15 digits';
//       }
//     }
//     if (!formData.password) {
//       errors.password = 'Password is required';
//     } else if (formData.password.length < 8) {
//       errors.password = 'Password must be at least 8 characters';
//     }
//     if (formData.password !== formData.confirm_password) {
//       errors.confirm_password = 'Passwords do not match';
//     }

//     setFieldErrors(errors);
//     return Object.keys(errors).length === 0;
//   };

//   const handleRegister = async () => {
//     setError('');
//     setFieldErrors({});

//     console.log('🔵 Register button pressed!');

//     if (!validate()) {
//       console.log('❌ Validation failed');
//       return;
//     }

//     setLoading(true);
//     try {
//       const formattedPhone = formatPhoneNumber(formData.phone_number.trim());

//       const registerData = {
//         email: formData.email.trim().toLowerCase(),
//         password: formData.password,
//         confirm_password: formData.confirm_password,
//         first_name: formData.first_name.trim(),
//         last_name: formData.last_name.trim(),
//         phone_number: formattedPhone,
//         role: formData.role,
//       };

//       console.log('🚀 Sending registration data:', JSON.stringify(registerData, null, 2));

//       const registrationResponse = await register(registerData);
//       console.log('✅ Registration successful!');

//       if (isAdminRequest) {
//         setPendingApprovalUser({
//           ...registerData,
//           ...(registrationResponse?.user ?? registrationResponse ?? {}),
//           is_approved: false,
//         });
//         return;
//       }

//       notifyAndProceed(
//         'Registration Successful! 🎉',
//         'Your account has been created. Please log in to continue.',
//         () => {
//           navigation.reset({
//             index: 0,
//             routes: [{ name: 'Login' }],
//           });
//         }
//       );
//     } catch (err: any) {
//       console.error('❌ Registration error:', err);

//       if (err.response?.data) {
//         const data = err.response.data;
//         console.log('❌ Server response:', JSON.stringify(data, null, 2));

//         if (typeof data === 'object') {
//           const fieldErrs: Record<string, string> = {};
//           let generalError = '';

//           for (const [key, value] of Object.entries(data)) {
//             if (key === 'non_field_errors' || key === 'detail') {
//               if (Array.isArray(value)) {
//                 generalError = value.join(', ');
//               } else {
//                 generalError = String(value);
//               }
//             } else if (Array.isArray(value) && value.length > 0) {
//               fieldErrs[key] = value.join(', ');
//             } else if (typeof value === 'string') {
//               fieldErrs[key] = value;
//             }
//           }

//           setFieldErrors(fieldErrs);
//           if (generalError) {
//             setError(generalError);
//           } else if (Object.keys(fieldErrs).length > 0) {
//             setError('Please fix the errors below');
//           }
//         }
//       } else {
//         setError(err.message || 'Registration failed. Please try again.');
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <KeyboardAvoidingView
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         style={{ flex: 1 }}
//       >
//         <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
//           <TouchableOpacity
//             style={styles.backButton}
//             onPress={() => navigation.goBack()}
//             activeOpacity={0.7}
//           >
//             <Icon name="arrow-back" size={24} color={colors.primary} />
//           </TouchableOpacity>

//           <View style={styles.brandBlock}>
//             <View style={styles.logoCircle}>
//               <Icon name="person-add-outline" size={32} color={colors.secondary} />
//             </View>
//             <Text style={styles.title}>Create Account</Text>
//             <Text style={styles.subtitle}>Join ECORET as a Chairman</Text>
//           </View>

//           <View style={styles.card}>
//             <View style={styles.fieldContainer}>
//               <Text style={styles.label}>First Name *</Text>
//               <View style={[styles.inputWrapper, fieldErrors.first_name && styles.inputWrapperError]}>
//                 <Icon name="person-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
//                 <TextInput
//                   style={styles.input}
//                   value={formData.first_name}
//                   onChangeText={(text) => {
//                     setFormData({ ...formData, first_name: text });
//                     setFieldErrors({ ...fieldErrors, first_name: '' });
//                   }}
//                   placeholder="Enter your first name"
//                   placeholderTextColor={colors.textMuted}
//                 />
//               </View>
//               {fieldErrors.first_name && <Text style={styles.errorText}>{fieldErrors.first_name}</Text>}
//             </View>

//             <View style={styles.fieldContainer}>
//               <Text style={styles.label}>Last Name *</Text>
//               <View style={[styles.inputWrapper, fieldErrors.last_name && styles.inputWrapperError]}>
//                 <Icon name="person-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
//                 <TextInput
//                   style={styles.input}
//                   value={formData.last_name}
//                   onChangeText={(text) => {
//                     setFormData({ ...formData, last_name: text });
//                     setFieldErrors({ ...fieldErrors, last_name: '' });
//                   }}
//                   placeholder="Enter your last name"
//                   placeholderTextColor={colors.textMuted}
//                 />
//               </View>
//               {fieldErrors.last_name && <Text style={styles.errorText}>{fieldErrors.last_name}</Text>}
//             </View>

//             <View style={styles.fieldContainer}>
//               <Text style={styles.label}>Email Address *</Text>
//               <View style={[styles.inputWrapper, fieldErrors.email && styles.inputWrapperError]}>
//                 <Icon name="mail-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
//                 <TextInput
//                   style={styles.input}
//                   value={formData.email}
//                   onChangeText={(text) => {
//                     setFormData({ ...formData, email: text });
//                     setFieldErrors({ ...fieldErrors, email: '' });
//                   }}
//                   placeholder="Enter your email"
//                   placeholderTextColor={colors.textMuted}
//                   keyboardType="email-address"
//                   autoCapitalize="none"
//                 />
//               </View>
//               {fieldErrors.email && <Text style={styles.errorText}>{fieldErrors.email}</Text>}
//             </View>

//             <View style={styles.fieldContainer}>
//               <Text style={styles.label}>Phone Number *</Text>
//               <View style={[styles.inputWrapper, fieldErrors.phone_number && styles.inputWrapperError]}>
//                 <Icon name="call-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
//                 <TextInput
//                   style={styles.input}
//                   value={formData.phone_number}
//                   onChangeText={(text) => {
//                     setFormData({ ...formData, phone_number: text });
//                     setFieldErrors({ ...fieldErrors, phone_number: '' });
//                   }}
//                   placeholder="e.g., 0888123456"
//                   placeholderTextColor={colors.textMuted}
//                   keyboardType="phone-pad"
//                 />
//               </View>
//               <Text style={styles.helperText}>Format: 0888123456 or +265888123456</Text>
//               {fieldErrors.phone_number && <Text style={styles.errorText}>{fieldErrors.phone_number}</Text>}
//             </View>

//             <View style={styles.sectionDivider}>
//               <View style={styles.dividerLine} />
//               <Text style={styles.dividerText}>Security</Text>
//               <View style={styles.dividerLine} />
//             </View>

//             <View style={styles.fieldContainer}>
//               <Text style={styles.label}>Password *</Text>
//               <View style={[styles.inputWrapper, fieldErrors.password && styles.inputWrapperError]}>
//                 <Icon name="lock-closed-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
//                 <TextInput
//                   style={styles.input}
//                   value={formData.password}
//                   onChangeText={(text) => {
//                     setFormData({ ...formData, password: text });
//                     setFieldErrors({ ...fieldErrors, password: '' });
//                   }}
//                   placeholder="Create a password (min 8 characters)"
//                   placeholderTextColor={colors.textMuted}
//                   secureTextEntry={!showPassword}
//                 />
//                 <TouchableOpacity
//                   style={styles.eyeButton}
//                   onPress={() => setShowPassword(!showPassword)}
//                   activeOpacity={0.7}
//                 >
//                   <Icon name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSecondary} />
//                 </TouchableOpacity>
//               </View>
//               <Text style={styles.helperText}>Password must be at least 8 characters</Text>
//               {fieldErrors.password && <Text style={styles.errorText}>{fieldErrors.password}</Text>}
//             </View>

//             <View style={styles.fieldContainer}>
//               <Text style={styles.label}>Confirm Password *</Text>
//               <View style={[styles.inputWrapper, fieldErrors.confirm_password && styles.inputWrapperError]}>
//                 <Icon name="lock-closed-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
//                 <TextInput
//                   style={styles.input}
//                   value={formData.confirm_password}
//                   onChangeText={(text) => {
//                     setFormData({ ...formData, confirm_password: text });
//                     setFieldErrors({ ...fieldErrors, confirm_password: '' });
//                   }}
//                   placeholder="Confirm your password"
//                   placeholderTextColor={colors.textMuted}
//                   secureTextEntry={!showConfirmPassword}
//                 />
//                 <TouchableOpacity
//                   style={styles.eyeButton}
//                   onPress={() => setShowConfirmPassword(!showConfirmPassword)}
//                   activeOpacity={0.7}
//                 >
//                   <Icon name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSecondary} />
//                 </TouchableOpacity>
//               </View>
//               {fieldErrors.confirm_password && <Text style={styles.errorText}>{fieldErrors.confirm_password}</Text>}
//             </View>

//             {error ? (
//               <View style={styles.errorRow}>
//                 <Icon name="alert-circle-outline" size={14} color={colors.error} />
//                 <Text style={styles.generalError}>{error}</Text>
//               </View>
//             ) : null}

//             <TouchableOpacity
//               style={[styles.registerButton, loading && styles.registerButtonDisabled]}
//               onPress={handleRegister}
//               disabled={loading}
//               activeOpacity={0.85}
//             >
//               {loading ? (
//                 <ActivityIndicator color="#fff" size="small" />
//               ) : (
//                 <>
//                   <Icon name="checkmark-circle-outline" size={18} color="#fff" />
//                   <Text style={styles.registerButtonText}>
//                     {isAdminRequest ? 'Submit Info' : 'Create Account'}
//                   </Text>
//                 </>
//               )}
//             </TouchableOpacity>
//           </View>

//           <View style={styles.footer}>
//             <Text style={styles.footerText}>Already have an account? </Text>
//             <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
//               <Text style={styles.loginLink}>Sign In</Text>
//             </TouchableOpacity>
//           </View>
//         </ScrollView>
//       </KeyboardAvoidingView>
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
//     paddingTop: 8,
//     paddingBottom: 40,
//   },
//   backButton: {
//     padding: 8,
//     marginBottom: 4,
//     width: 40,
//   },
//   brandBlock: {
//     alignItems: 'center',
//     marginBottom: 24,
//   },
//   logoCircle: {
//     width: 68,
//     height: 68,
//     borderRadius: 34,
//     backgroundColor: '#e5f6fa',
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginBottom: 12,
//     borderWidth: 1.5,
//     borderColor: colors.secondaryLight,
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: colors.text,
//     textAlign: 'center',
//   },
//   subtitle: {
//     fontSize: 13,
//     color: colors.textSecondary,
//     marginTop: 4,
//     textAlign: 'center',
//   },
//   card: {
//     backgroundColor: colors.surface,
//     borderRadius: 16,
//     padding: 20,
//     borderWidth: 1,
//     borderColor: colors.border,
//     shadowColor: colors.secondaryDark,
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.1,
//     shadowRadius: 10,
//     elevation: 3,
//   },
//   fieldContainer: {
//     marginBottom: 14,
//   },
//   label: {
//     fontSize: 13,
//     fontWeight: '600',
//     color: colors.text,
//     marginBottom: 6,
//   },
//   inputWrapper: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: colors.border,
//     borderRadius: 10,
//     backgroundColor: colors.background,
//   },
//   inputWrapperError: {
//     borderColor: colors.error,
//     backgroundColor: '#fef2f2',
//   },
//   inputIcon: {
//     paddingLeft: 12,
//   },
//   input: {
//     flex: 1,
//     padding: 12,
//     fontSize: 15,
//     color: colors.text,
//   },
//   eyeButton: {
//     padding: 10,
//   },
//   helperText: {
//     fontSize: 11,
//     color: colors.textMuted,
//     marginTop: 4,
//     marginLeft: 2,
//   },
//   errorText: {
//     fontSize: 12,
//     color: colors.error,
//     marginTop: 4,
//     marginLeft: 2,
//   },
//   sectionDivider: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginVertical: 6,
//     marginBottom: 16,
//   },
//   dividerLine: {
//     flex: 1,
//     height: 1,
//     backgroundColor: colors.border,
//   },
//   dividerText: {
//     fontSize: 12,
//     fontWeight: '600',
//     color: colors.textSecondary,
//     paddingHorizontal: 8,
//   },
//   errorRow: {
//     flexDirection: 'row',
//     alignItems: 'flex-start',
//     gap: 6,
//     padding: 10,
//     backgroundColor: '#fef2f2',
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: '#fecaca',
//     marginBottom: 6,
//   },
//   generalError: {
//     fontSize: 13,
//     color: colors.error,
//     flexShrink: 1,
//   },
//   registerButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 8,
//     backgroundColor: colors.primary,
//     paddingVertical: 14,
//     borderRadius: 10,
//     marginTop: 6,
//   },
//   registerButtonDisabled: {
//     opacity: 0.6,
//   },
//   registerButtonText: {
//     color: '#fff',
//     fontSize: 15,
//     fontWeight: '600',
//   },
//   footer: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     marginTop: 20,
//     marginBottom: 10,
//   },
//   footerText: {
//     fontSize: 14,
//     color: colors.textSecondary,
//   },
//   loginLink: {
//     fontSize: 14,
//     color: colors.secondary,
//     fontWeight: '700',
//   },
// });

// src/screens/RegisterScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { authAPI } from '../api/endpoints';

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  
  const role = route.params?.role || 'member';
  const action = route.params?.action || 'signup';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gender, setGender] = useState('');
  const [reason, setReason] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email is invalid';
    if (!phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (role === 'admin' && !reason.trim()) newErrors.reason = 'Reason for admin request is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const payload = {
        email: email.trim().toLowerCase(),
        password: password,
        confirm_password: confirmPassword,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phoneNumber.trim(),
        role: role,
        gender: gender || 'M',
        reason: role === 'admin' ? reason : '',
      };
      
      console.log('🚀 Sending registration data:', { ...payload, password: '***' });
      
      const response = await authAPI.register(payload);
      console.log('✅ Registration response:', response.data);
      
      if (role === 'admin') {
        Alert.alert(
          'Admin Request Submitted',
          'Your admin request has been submitted successfully. Please wait for approval from existing ECORET Administrators. You will be notified once your request is reviewed.',
          [
            { 
              text: 'OK', 
              onPress: () => navigation.navigate('Login') 
            }
          ]
        );
      } else {
        Alert.alert(
          'Registration Successful',
          'Your account has been created successfully. Please login to continue.',
          [
            { 
              text: 'OK', 
              onPress: () => navigation.navigate('Login') 
            }
          ]
        );
      }
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      
      // Handle different error types
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        
        const data = error.response.data;
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (data.error) {
          errorMessage = data.error;
        } else if (data.message) {
          errorMessage = data.message;
        } else if (data.email) {
          errorMessage = Array.isArray(data.email) ? data.email[0] : data.email;
        } else if (data.phone_number) {
          errorMessage = Array.isArray(data.phone_number) ? data.phone_number[0] : data.phone_number;
        } else {
          errorMessage = JSON.stringify(data);
        }
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = 'Cannot connect to server. Please check your internet connection.';
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMessage = error.message || 'Registration failed. Please try again.';
      }
      
      Alert.alert('Registration Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {role === 'admin' ? 'Request Admin Access' : 'Create Account'}
            </Text>
            <Text style={styles.subtitle}>
              {role === 'admin' 
                ? 'Submit your request to become an ECORET Administrator' 
                : 'Join ECORET as a Group Chairman'}
            </Text>
          </View>

          {/* Role Badge */}
          <View style={styles.roleBadge}>
            <Icon 
              name={role === 'admin' ? 'shield-checkmark' : 'people'} 
              size={16} 
              color="#fff" 
            />
            <Text style={styles.roleBadgeText}>
              {role === 'admin' ? 'Admin Request' : 'Chairman Signup'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={[styles.input, errors.firstName && styles.inputError]}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Enter first name"
                placeholderTextColor={colors.textMuted}
              />
              {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={[styles.input, errors.lastName && styles.inputError]}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Enter last name"
                placeholderTextColor={colors.textMuted}
              />
              {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email address"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={[styles.input, errors.phoneNumber && styles.inputError]}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Enter phone number (e.g., 0888123456)"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
              {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderContainer}>
                {['M', 'F'].map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.genderButton,
                      gender === g && styles.genderButtonActive,
                    ]}
                    onPress={() => setGender(g)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.genderText,
                        gender === g && styles.genderTextActive,
                      ]}
                    >
                      {g === 'M' ? 'Male' : 'Female'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password *</Text>
              <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <Icon
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Confirm Password *</Text>
              <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputError]}>
                <TextInput
                  style={styles.passwordInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  activeOpacity={0.7}
                >
                  <Icon
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
            </View>

            {role === 'admin' && (
              <View style={styles.field}>
                <Text style={[styles.label, styles.requiredLabel]}>
                  Reason for Admin Request *
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea, errors.reason && styles.inputError]}
                  value={reason}
                  onChangeText={setReason}
                  placeholder="Explain why you need admin access..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                {errors.reason && <Text style={styles.errorText}>{errors.reason}</Text>}
                
                <View style={styles.infoBox}>
                  <Icon name="information-circle-outline" size={18} color={colors.warning} />
                  <Text style={styles.infoText}>
                    Admin requests require approval from existing ECORET Administrators. 
                    You will be notified once your request is reviewed.
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.registerButton, loading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.registerButtonText}>
                  {role === 'admin' ? 'Submit Request' : 'Sign Up'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.7}
            >
              <Text style={styles.loginText}>
                Already have an account? <Text style={styles.loginHighlight}>Login</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  backButton: {
    padding: 4,
    marginBottom: 16,
  },
  header: {
    marginBottom: 20,
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
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  form: {
    gap: 16,
  },
  field: {
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  requiredLabel: {
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  genderButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  genderText: {
    color: colors.text,
    fontSize: 14,
  },
  genderTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    marginLeft: 8,
    lineHeight: 18,
  },
  registerButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  loginText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  loginHighlight: {
    color: colors.primary,
    fontWeight: '600',
  },
});




