// // src/screens/MemberRegistrationScreen.tsx

// import React, { useState, useEffect, useRef } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
//   SafeAreaView,
//   TextInput,
//   Alert,
//   ActivityIndicator,
//   Modal,
//   FlatList,
//   Image,
//   KeyboardAvoidingView,
//   Platform,
//   Animated,
// } from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import * as ImagePicker from 'expo-image-picker';
// import Icon from 'react-native-vector-icons/Ionicons';
// import { colors } from '../theme/colors';
// import { groupAPI } from '../api/endpoints';

// interface Member {
//   id: string;
//   full_name: string;
//   phone_number: string;
//   national_id: string;
//   national_id_photo?: string | null;
//   gender: string;
//   address: string;
//   village?: string;
//   ta?: string;
//   city?: string;
//   is_active: boolean;
//   created_at: string;
// }

// export default function MemberRegistrationScreen({ route, navigation }: any) {
//   const { groupId } = route.params || {};
//   console.log('MemberRegistrationScreen received groupId:', groupId);

//   const [members, setMembers] = useState<Member[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [showAddModal, setShowAddModal] = useState(false);
//   const [editingMember, setEditingMember] = useState<Member | null>(null);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [nationalIdPhoto, setNationalIdPhoto] = useState<string | null>(null);
//   const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

//   const [formData, setFormData] = useState({
//     full_name: '',
//     phone_number: '',
//     national_id: '',
//     gender: 'M',
//     business_type: '',
//     village: '',
//     ta: '',
//     city: '',
//   });

//   useEffect(() => {
//     if (!groupId) {
//       Alert.alert('Error', 'Group ID is missing. Please go back and try again.');
//       navigation.goBack();
//       return;
//     }
//     loadMembers();
//   }, [groupId]);

//   const loadMembers = async () => {
//     try {
//       setLoading(true);
//       console.log('Loading members for group:', groupId);
//       const response = await groupAPI.getMembers(groupId);
//       console.log('Members response:', response.data);
//       setMembers(Array.isArray(response.data) ? response.data : []);
//     } catch (error: any) {
//       console.error('Failed to load members:', error);
//       if (error?.response?.status !== 404) {
//         Alert.alert('Error', 'Failed to load members. Please pull to refresh.');
//       }
//       setMembers([]);
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };

//   const onRefresh = () => {
//     setRefreshing(true);
//     loadMembers();
//   };

//   const resetForm = () => {
//     setFormData({
//       full_name: '',
//       phone_number: '',
//       national_id: '',
//       gender: 'M',
//       business_type: '',
//       village: '',
//       ta: '',
//       city: '',
//     });
//     setNationalIdPhoto(null);
//     setEditingMember(null);
//   };

//   const closeModal = () => {
//     setShowAddModal(false);
//     resetForm();
//   };

//   const takePhoto = async () => {
//     try {
//       const { status } = await ImagePicker.requestCameraPermissionsAsync();
//       if (status !== 'granted') {
//         Alert.alert('Permission needed', 'Camera permission is required to take photo');
//         return;
//       }

//       const result = await ImagePicker.launchCameraAsync({
//         allowsEditing: true,
//         quality: 0.8,
//       });

//       if (!result.canceled && result.assets && result.assets.length > 0) {
//         setNationalIdPhoto(result.assets[0].uri);
//         Alert.alert('Success', 'National ID photo captured');
//       }
//     } catch (error) {
//       console.error('Camera error:', error);
//       Alert.alert('Error', 'Failed to open camera');
//     }
//   };

//   const handleAddMember = async () => {
//     if (!formData.full_name.trim() || !formData.phone_number.trim()) {
//       Alert.alert('Error', 'Name and phone number are required');
//       return;
//     }

//     setIsSubmitting(true);
//     try {
//       const addressParts = [];
//       if (formData.village) addressParts.push(formData.village);
//       if (formData.ta) addressParts.push(formData.ta);
//       if (formData.city) addressParts.push(formData.city);
//       const fullAddress = addressParts.join(', ') || 'N/A';

//       const memberData = new FormData();
//       memberData.append('full_name', formData.full_name.trim());
//       memberData.append('phone_number', formData.phone_number.trim());
//       memberData.append('national_id', formData.national_id.trim() || 'PENDING');
//       memberData.append('gender', formData.gender);
//       memberData.append('address', fullAddress);

//       if (nationalIdPhoto) {
//         const filename = nationalIdPhoto.split('/').pop() || 'national_id.jpg';
//         const match = /\.(\w+)$/.exec(filename);
//         const ext = match ? match[1].toLowerCase() : 'jpg';

//         memberData.append('national_id_photo', {
//           uri: nationalIdPhoto,
//           name: filename,
//           type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
//         } as any);
//       }

//       let response;
//       if (editingMember) {
//         response = await groupAPI.updateMember(groupId, editingMember.id, memberData);
//         Alert.alert('Success', 'Member updated successfully!');
//       } else {
//         response = await groupAPI.addMember(groupId, memberData);
//         Alert.alert('Success', 'Member added successfully!');
//       }

//       console.log('Member saved response:', response.data);

//       setShowAddModal(false);
//       resetForm();
//       await loadMembers();
//     } catch (error: any) {
//       console.error('Failed to save member:', error);
//       console.error('Error response:', error?.response?.data);

//       const errorMessage =
//         error?.response?.data?.error ||
//         error?.response?.data?.message ||
//         JSON.stringify(error?.response?.data) ||
//         'Failed to save member. Please check all fields.';
//       Alert.alert('Error', errorMessage);
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   // src/screens/MemberRegistrationScreen.tsx - Update the delete function

//   const handleDeleteMember = (memberId: string, memberName: string) => {
//     console.log('=== DELETE BUTTON PRESSED ===');
//     console.log('Member:', memberName, 'ID:', memberId);
//     console.log('Group ID:', groupId);

//     Alert.alert(
//       'Delete Member',
//       `Are you sure you want to delete ${memberName}? This action cannot be undone.`,
//       [
//         { text: 'Cancel', style: 'cancel' },
//         {
//           text: 'Delete',
//           style: 'destructive',
//           onPress: async () => {
//             try {
//               console.log(`🗑️ Calling removeMember with groupId: ${groupId}, memberId: ${memberId}`);
            
//             // ✅ Try using the API first
//               const response = await groupAPI.removeMember(groupId, memberId);
//               console.log('✅ Delete response:', response.data);
            
//               Alert.alert('Success', `${memberName} deleted successfully`);
//               await loadMembers();
//             } catch (error: any) {
//               console.error('❌ Delete error:', error);
//               console.error('❌ Error response:', error?.response?.data);
//               console.error('❌ Error status:', error?.response?.status);
            
//             // ✅ If API fails, try direct fetch as fallback
//               try {
//                 console.log('🔄 Trying direct fetch as fallback...');
//                 const token = await AsyncStorage.getItem('access_token');
//                 const baseUrl = 'http://192.168.1.103:8000/api'; // Your base URL
//                 const url = `${baseUrl}/groups/${groupId}/members/${memberId}/`;
              
//                 console.log('📤 DELETE URL:', url);
              
//                 const fetchResponse = await fetch(url, {
//                   method: 'DELETE',
//                   headers: {
//                     'Authorization': `Bearer ${token}`,
//                     'Content-Type': 'application/json',
//                   },
//                 });
              
//                 console.log('📥 Response status:', fetchResponse.status);
              
//                 if (fetchResponse.ok) {
//                   Alert.alert('Success', `${memberName} deleted successfully`);
//                   await loadMembers();
//                   return;
//                 } else {
//                   const errorData = await fetchResponse.text();
//                   console.error('❌ Fetch error:', errorData);
//                   throw new Error(`Server responded with ${fetchResponse.status}: ${errorData}`);
//                 }
//               } catch (fallbackError: any) {
//                 console.error('❌ Fallback delete error:', fallbackError);
//                 let errorMessage = 'Failed to delete member. Please try again.';
//                 if (fallbackError.message) {
//                   errorMessage = fallbackError.message;
//                 }
//                 Alert.alert('Error', errorMessage);
//               }
//             }
//           },
//         },
//       ]
//     );
//   };

  
//   const handleEditMember = (member: Member) => {
//     setEditingMember(member);
//     setFormData({
//       full_name: member.full_name,
//       phone_number: member.phone_number,
//       national_id: member.national_id || '',
//       gender: member.gender || 'M',
//       business_type: '',
//       village: member.village || '',
//       ta: member.ta || '',
//       city: member.city || '',
//     });
//     setNationalIdPhoto(null);
//     setShowAddModal(true);
//   };

//   const getInitials = (name: string) =>
//     name
//       .split(' ')
//       .filter(Boolean)
//       .slice(0, 2)
//       .map((n) => n[0]?.toUpperCase())
//       .join('');

//   // Animated Member Card Component
//   const AnimatedMemberCard = ({ item }: { item: Member }) => {
//     const scaleAnim = useRef(new Animated.Value(1)).current;
//     const isSelected = selectedCardId === item.id;

//     const handlePressIn = () => {
//       setSelectedCardId(item.id);
//       Animated.spring(scaleAnim, {
//         toValue: 0.96,
//         friction: 8,
//         tension: 40,
//         useNativeDriver: true,
//       }).start();
//     };

//     const handlePressOut = () => {
//       Animated.spring(scaleAnim, {
//         toValue: 1,
//         friction: 8,
//         tension: 40,
//         useNativeDriver: true,
//       }).start(() => {
//         setSelectedCardId(null);
//       });
//     };

//     return (
//       <Animated.View
//         style={[
//           styles.memberCard,
//           isSelected && styles.memberCardSelected,
//           {
//             transform: [{ scale: scaleAnim }],
//           },
//         ]}
//       >
//         <TouchableOpacity
//           activeOpacity={1}
//           onPressIn={handlePressIn}
//           onPressOut={handlePressOut}
//           style={styles.memberCardTouchable}
//         >
//           <View style={styles.memberRow}>
//             <View style={styles.avatarCircle}>
//               <Text style={styles.avatarText}>{getInitials(item.full_name) || '?'}</Text>
//             </View>
//             <View style={styles.memberInfo}>
//               <Text style={styles.memberName}>{item.full_name}</Text>
//               <Text style={styles.memberDetail}>📱 {item.phone_number}</Text>
//               <Text style={styles.memberDetail}>📍 {item.address || 'No address'}</Text>
//               <View
//                 style={[
//                   styles.statusBadge,
//                   item.is_active ? styles.activeBadge : styles.inactiveBadge,
//                 ]}
//               >
//                 <Text style={styles.statusText}>{item.is_active ? 'Active' : 'Inactive'}</Text>
//               </View>
//             </View>
//           </View>
//           <View style={styles.memberActions}>
//             <TouchableOpacity
//               style={styles.editButton}
//               onPress={() => handleEditMember(item)}
//               activeOpacity={0.7}
//             >
//               <Icon name="create-outline" size={14} color="#2563eb" />
//               <Text style={styles.editButtonText}>Edit</Text>
//             </TouchableOpacity>
//             <TouchableOpacity
//               style={styles.deleteButton}
//               onPress={() => handleDeleteMember(item.id, item.full_name)}
//               activeOpacity={0.7}
//             >
//               <Icon name="trash-outline" size={14} color="#dc2626" />
//               <Text style={styles.deleteButtonText}>Delete</Text>
//             </TouchableOpacity>
//           </View>
//         </TouchableOpacity>
//       </Animated.View>
//     );
//   };

//   const renderMember = ({ item }: { item: Member }) => <AnimatedMemberCard item={item} />;

//   if (loading) {
//     return (
//       <SafeAreaView style={styles.centered}>
//         <ActivityIndicator size="large" color={colors.primary} />
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       {/* Blue Header with Back Button */}
//       <View style={styles.blueHeader}>
//         <TouchableOpacity
//           onPress={() => navigation.goBack()}
//           activeOpacity={0.7}
//           style={styles.headerBackButton}
//         >
//           <Icon name="arrow-back" size={24} color="#FFFFFF" />
//         </TouchableOpacity>

//         <View style={styles.headerCenter}>
//           <View style={styles.titleRow}>
//             <View style={styles.titleIconCircleWhite}>
//               <Icon name="people" size={16} color={colors.primary} />
//             </View>
//             <Text style={styles.titleWhite}>Member Registration</Text>
//           </View>
//           <Text style={styles.subtitleWhite}>Total: {members.length} members</Text>
//         </View>

//         <TouchableOpacity
//           style={styles.addButtonWhite}
//           onPress={() => setShowAddModal(true)}
//           activeOpacity={0.7}
//         >
//           <Icon name="add" size={18} color="#FFFFFF" />
//           <Text style={styles.addButtonTextWhite}>Add</Text>
//         </TouchableOpacity>
//       </View>

//       <FlatList
//         data={members}
//         renderItem={renderMember}
//         keyExtractor={(item) => item.id}
//         contentContainerStyle={styles.listContent}
//         ListEmptyComponent={
//           <View style={styles.emptyState}>
//             <View style={styles.emptyIconCircle}>
//               <Icon name="people-outline" size={32} color={colors.primary} />
//             </View>
//             <Text style={styles.emptyText}>No members registered yet</Text>
//             <Text style={styles.emptySubtext}>Tap "Add" to register a new member</Text>
//           </View>
//         }
//         refreshing={refreshing}
//         onRefresh={onRefresh}
//       />

//       {/* Add/Edit Member Modal */}
//       <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={closeModal}>
//         <KeyboardAvoidingView
//           behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//           style={styles.modalContainer}
//         >
//           <View style={styles.modalOverlay}>
//             <View style={styles.modalContent}>
//               <ScrollView showsVerticalScrollIndicator={false}>
//                 <View style={styles.modalHeaderRow}>
//                   <View style={styles.modalTitleIconCircle}>
//                     <Icon
//                       name={editingMember ? 'create-outline' : 'person-add-outline'}
//                       size={18}
//                       color={colors.primary}
//                     />
//                   </View>
//                   <Text style={styles.modalTitle}>
//                     {editingMember ? 'Edit Member' : 'Add New Member'}
//                   </Text>
//                 </View>

//                 <View style={styles.modalField}>
//                   <Text style={styles.modalLabel}>Full Name *</Text>
//                   <TextInput
//                     style={styles.modalInput}
//                     value={formData.full_name}
//                     onChangeText={(text) => setFormData({ ...formData, full_name: text })}
//                     placeholder="Enter full name"
//                     placeholderTextColor={colors.secondary}
//                   />
//                 </View>

//                 <View style={styles.modalField}>
//                   <Text style={styles.modalLabel}>Phone Number *</Text>
//                   <TextInput
//                     style={styles.modalInput}
//                     value={formData.phone_number}
//                     onChangeText={(text) => setFormData({ ...formData, phone_number: text })}
//                     placeholder="Enter phone number"
//                     keyboardType="phone-pad"
//                     placeholderTextColor={colors.secondary}
//                   />
//                 </View>

//                 <View style={styles.modalField}>
//                   <Text style={styles.modalLabel}>National ID</Text>
//                   <View style={styles.idInputContainer}>
//                     <TextInput
//                       style={[styles.modalInput, styles.idInput]}
//                       value={formData.national_id}
//                       onChangeText={(text) => setFormData({ ...formData, national_id: text })}
//                       placeholder="Enter national ID"
//                       placeholderTextColor={colors.secondary}
//                     />
//                     <TouchableOpacity
//                       style={styles.cameraButton}
//                       onPress={takePhoto}
//                       activeOpacity={0.7}
//                     >
//                       <Icon name="camera-outline" size={22} color="#fff" />
//                     </TouchableOpacity>
//                   </View>
//                   {nationalIdPhoto && (
//                     <View style={styles.photoPreview}>
//                       <Image source={{ uri: nationalIdPhoto }} style={styles.photoPreviewImage} />
//                       <TouchableOpacity
//                         style={styles.removePhotoButton}
//                         onPress={() => setNationalIdPhoto(null)}
//                         activeOpacity={0.7}
//                       >
//                         <Text style={styles.removePhotoText}>✕ Remove</Text>
//                       </TouchableOpacity>
//                     </View>
//                   )}
//                 </View>

//                 <View style={styles.modalField}>
//                   <Text style={styles.modalLabel}>Gender</Text>
//                   <View style={styles.genderContainer}>
//                     {['M', 'F', 'O'].map((gender) => (
//                       <TouchableOpacity
//                         key={gender}
//                         style={[
//                           styles.genderButton,
//                           formData.gender === gender && styles.selectedGender,
//                         ]}
//                         onPress={() => setFormData({ ...formData, gender })}
//                         activeOpacity={0.7}
//                       >
//                         <Text
//                           style={[
//                             styles.genderText,
//                             formData.gender === gender && styles.selectedGenderText,
//                           ]}
//                         >
//                           {gender === 'M' ? 'Male' : gender === 'F' ? 'Female' : 'Other'}
//                         </Text>
//                       </TouchableOpacity>
//                     ))}
//                   </View>
//                 </View>

//                 <View style={styles.sectionDivider}>
//                   <View style={styles.sectionDividerLine} />
//                   <Text style={styles.sectionDividerText}>Address Details</Text>
//                   <View style={styles.sectionDividerLine} />
//                 </View>

//                 <View style={styles.modalField}>
//                   <Text style={styles.modalLabel}>Village</Text>
//                   <TextInput
//                     style={styles.modalInput}
//                     value={formData.village}
//                     onChangeText={(text) => setFormData({ ...formData, village: text })}
//                     placeholder="Enter village name"
//                     placeholderTextColor={colors.secondary}
//                   />
//                 </View>

//                 <View style={styles.modalField}>
//                   <Text style={styles.modalLabel}>Traditional Authority (TA)</Text>
//                   <TextInput
//                     style={styles.modalInput}
//                     value={formData.ta}
//                     onChangeText={(text) => setFormData({ ...formData, ta: text })}
//                     placeholder="Enter TA"
//                     placeholderTextColor={colors.secondary}
//                   />
//                 </View>

//                 <View style={styles.modalField}>
//                   <Text style={styles.modalLabel}>City/District</Text>
//                   <TextInput
//                     style={styles.modalInput}
//                     value={formData.city}
//                     onChangeText={(text) => setFormData({ ...formData, city: text })}
//                     placeholder="Enter city or district"
//                     placeholderTextColor={colors.secondary}
//                   />
//                 </View>

//                 <View style={styles.modalActions}>
//                   <TouchableOpacity
//                     style={[styles.modalButton, styles.cancelButton]}
//                     onPress={closeModal}
//                     activeOpacity={0.7}
//                   >
//                     <Text style={styles.cancelButtonText}>Cancel</Text>
//                   </TouchableOpacity>
//                   <TouchableOpacity
//                     style={[styles.modalButton, styles.submitModalButton]}
//                     onPress={handleAddMember}
//                     disabled={isSubmitting}
//                     activeOpacity={0.7}
//                   >
//                     <Text style={styles.submitModalButtonText}>
//                       {isSubmitting ? 'Saving...' : editingMember ? 'Update' : 'Save'}
//                     </Text>
//                   </TouchableOpacity>
//                 </View>
//               </ScrollView>
//             </View>
//           </View>
//         </KeyboardAvoidingView>
//       </Modal>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#F5F7FA',
//   },
//   centered: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#F5F7FA',
//   },

//   // Blue Header
//   blueHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: colors.primary,
//     paddingHorizontal: 16,
//     paddingVertical: 16,
//     paddingTop: Platform.OS === 'ios' ? 8 : 16,
//     borderBottomWidth: 1,
//     borderBottomColor: colors.primary + '30',
//   },
//   headerBackButton: {
//     padding: 4,
//     marginRight: 8,
//   },
//   headerCenter: {
//     flex: 1,
//   },
//   titleRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   titleIconCircleWhite: {
//     width: 24,
//     height: 24,
//     borderRadius: 12,
//     backgroundColor: '#FFFFFF',
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginRight: 6,
//   },
//   titleWhite: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#FFFFFF',
//   },
//   subtitleWhite: {
//     fontSize: 12,
//     color: '#FFFFFF',
//     opacity: 0.8,
//     marginTop: 2,
//     marginLeft: 30,
//   },
//   addButtonWhite: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: 'rgba(255,255,255,0.2)',
//     paddingHorizontal: 14,
//     paddingVertical: 8,
//     borderRadius: 8,
//     minWidth: 76,
//     justifyContent: 'center',
//     gap: 4,
//   },
//   addButtonTextWhite: {
//     color: '#FFFFFF',
//     fontSize: 14,
//     fontWeight: '600',
//   },

//   // List
//   listContent: {
//     padding: 16,
//     paddingBottom: 80,
//   },
//   emptyState: {
//     alignItems: 'center',
//     paddingVertical: 60,
//   },
//   emptyIconCircle: {
//     width: 64,
//     height: 64,
//     borderRadius: 32,
//     backgroundColor: '#dbeafe',
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginBottom: 12,
//   },
//   emptyText: {
//     fontSize: 16,
//     color: colors.text,
//     fontWeight: '600',
//   },
//   emptySubtext: {
//     fontSize: 14,
//     color: colors.secondary,
//     marginTop: 4,
//   },

//   // Member card with animation
//   memberCard: {
//     backgroundColor: '#FFFFFF',
//     borderRadius: 12,
//     padding: 16,
//     marginBottom: 12,
//     borderWidth: 1,
//     borderColor: '#E5E7EB',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.06,
//     shadowRadius: 4,
//     elevation: 2,
//   },
//   memberCardSelected: {
//     borderColor: colors.primary,
//     borderWidth: 2,
//     shadowColor: colors.primary,
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.15,
//     shadowRadius: 8,
//     elevation: 4,
//   },
//   memberCardTouchable: {
//     flex: 1,
//   },
//   memberRow: {
//     flexDirection: 'row',
//     alignItems: 'flex-start',
//     marginBottom: 12,
//   },
//   avatarCircle: {
//     width: 44,
//     height: 44,
//     borderRadius: 22,
//     backgroundColor: colors.primary,
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginRight: 12,
//   },
//   avatarText: {
//     color: '#fff',
//     fontWeight: '700',
//     fontSize: 16,
//   },
//   memberInfo: {
//     flex: 1,
//   },
//   memberName: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: colors.text,
//     marginBottom: 4,
//   },
//   memberDetail: {
//     fontSize: 14,
//     color: colors.secondary,
//     marginBottom: 2,
//   },
//   statusBadge: {
//     alignSelf: 'flex-start',
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 12,
//     marginTop: 4,
//   },
//   activeBadge: {
//     backgroundColor: '#DCFCE7',
//   },
//   inactiveBadge: {
//     backgroundColor: '#F3F4F6',
//   },
//   statusText: {
//     fontSize: 10,
//     fontWeight: '600',
//   },
//   memberActions: {
//     flexDirection: 'row',
//     gap: 8,
//   },
//   editButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 6,
//     backgroundColor: '#DBEAFE',
//     gap: 4,
//   },
//   editButtonText: {
//     color: '#2563EB',
//     fontSize: 12,
//     fontWeight: '600',
//   },
//   deleteButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 6,
//     backgroundColor: '#FEE2E2',
//     gap: 4,
//   },
//   deleteButtonText: {
//     color: '#DC2626',
//     fontSize: 12,
//     fontWeight: '600',
//   },

//   // Modal
//   modalContainer: {
//     flex: 1,
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
//     padding: 24,
//     borderRadius: 16,
//     width: '100%',
//     maxWidth: 400,
//     maxHeight: '90%',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.15,
//     shadowRadius: 8,
//     elevation: 6,
//   },
//   modalHeaderRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 16,
//   },
//   modalTitleIconCircle: {
//     width: 32,
//     height: 32,
//     borderRadius: 16,
//     backgroundColor: '#dbeafe',
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginRight: 10,
//   },
//   modalTitle: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: colors.text,
//   },
//   modalField: {
//     marginBottom: 16,
//   },
//   modalLabel: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: colors.text,
//     marginBottom: 6,
//   },
//   modalInput: {
//     borderWidth: 1,
//     borderColor: '#E5E7EB',
//     borderRadius: 8,
//     padding: 12,
//     fontSize: 16,
//     color: colors.text,
//     backgroundColor: '#FFFFFF',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.04,
//     shadowRadius: 4,
//     elevation: 1,
//   },
//   idInputContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   idInput: {
//     flex: 1,
//   },
//   cameraButton: {
//     backgroundColor: colors.primary,
//     padding: 12,
//     borderRadius: 8,
//     alignItems: 'center',
//     justifyContent: 'center',
//     width: 48,
//     height: 48,
//   },
//   photoPreview: {
//     marginTop: 8,
//     alignItems: 'center',
//   },
//   photoPreviewImage: {
//     width: 100,
//     height: 60,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: '#E5E7EB',
//   },
//   removePhotoButton: {
//     marginTop: 4,
//     padding: 4,
//   },
//   removePhotoText: {
//     color: colors.error,
//     fontSize: 12,
//   },
//   genderContainer: {
//     flexDirection: 'row',
//     gap: 8,
//   },
//   genderButton: {
//     flex: 1,
//     padding: 10,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: '#E5E7EB',
//     alignItems: 'center',
//     backgroundColor: '#FFFFFF',
//   },
//   selectedGender: {
//     backgroundColor: colors.primary,
//     borderColor: colors.primary,
//   },
//   genderText: {
//     color: colors.text,
//   },
//   selectedGenderText: {
//     color: '#fff',
//   },
//   sectionDivider: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginVertical: 12,
//   },
//   sectionDividerLine: {
//     flex: 1,
//     height: 1,
//     backgroundColor: '#E5E7EB',
//   },
//   sectionDividerText: {
//     fontSize: 13,
//     fontWeight: '600',
//     color: colors.secondary,
//     paddingHorizontal: 8,
//   },
//   modalActions: {
//     flexDirection: 'row',
//     gap: 8,
//     marginTop: 8,
//     marginBottom: 4,
//   },
//   modalButton: {
//     flex: 1,
//     padding: 14,
//     borderRadius: 8,
//     alignItems: 'center',
//   },
//   cancelButton: {
//     backgroundColor: '#F3F4F6',
//   },
//   cancelButtonText: {
//     color: colors.text,
//     fontWeight: '600',
//   },
//   submitModalButton: {
//     backgroundColor: colors.primary,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.15,
//     shadowRadius: 6,
//     elevation: 4,
//   },
//   submitModalButtonText: {
//     color: '#fff',
//     fontWeight: '600',
//   },
// });




// src/screens/MemberRegistrationScreen.tsx
import React, { useState, useEffect } from 'react';
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
  Modal,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../theme/colors';
import { groupAPI } from '../api/endpoints';

// Alert.alert with only a title/message (no button array) renders nothing
// on web - no dialog, no console output, nothing. Every "silent" bug so far
// (logout, delete, save) traced back to this. Route all simple notifications
// through this helper so web gets a real window.alert instead of nothing.
const notify = (title: string, message?: string) => {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
};

interface Member {
  id: string;
  full_name: string;
  phone_number: string;
  national_id: string;
  national_id_photo?: string | null;
  business_type?: string;
  business_description?: string | null;
  gender: string;
  address: string;
  is_active: boolean;
  joined_date?: string;
}

interface BusinessTypeOption {
  value: string;
  label: string;
}

export default function MemberRegistrationScreen({ route, navigation }: any) {
  const { groupId } = route.params || {};
  console.log('MemberRegistrationScreen received groupId:', groupId);

  const [businessTypes, setBusinessTypes] = useState<BusinessTypeOption[]>([]);
  const [showBusinessTypePicker, setShowBusinessTypePicker] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nationalIdPhoto, setNationalIdPhoto] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    national_id: '',
    gender: 'M',
    business_type: '',
    business_description: '',
    address: '',
  });

  useEffect(() => {
    if (!groupId) {
      notify('Error', 'Group ID is missing. Please go back and try again.');
      navigation.goBack();
      return;
    }
    loadMembers();
  }, [groupId]);

  useEffect(() => {
    groupAPI.getBusinessTypes()
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);
        setBusinessTypes(data);
      })
      .catch((err) => {
        console.error('Failed to load business types:', err);
        setBusinessTypes([]);
      });
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      console.log('Loading members for group:', groupId);
      const response = await groupAPI.getMembers(groupId);
      console.log('Members response:', response.data);
      setMembers(Array.isArray(response.data) ? response.data : []);
    } catch (error: any) {
      console.error('Failed to load members:', error);
      if (error?.response?.status !== 404) {
        notify('Error', 'Failed to load members. Please pull to refresh.');
      }
      setMembers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMembers();
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      phone_number: '',
      national_id: '',
      gender: 'M',
      business_type: '',
      business_description: '',
      address: '',
    });
    setNationalIdPhoto(null);
    setEditingMember(null);
  };

  const closeModal = () => {
    setShowAddModal(false);
    resetForm();
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        notify('Permission needed', 'Camera permission is required to take photo');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setNationalIdPhoto(result.assets[0].uri);
        notify('Success', 'National ID photo captured');
      }
    } catch (error) {
      console.error('Camera error:', error);
      notify('Error', 'Failed to open camera');
    }
  };

  const handleAddMember = async () => {
    if (!formData.full_name.trim() || !formData.phone_number.trim()) {
      notify('Error', 'Name and phone number are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const phoneDigitsOnly = formData.phone_number.replace(/[^0-9]/g, '');
      const localPhoneDigits = phoneDigitsOnly.startsWith('0')
        ? phoneDigitsOnly.slice(1)
        : phoneDigitsOnly;

      if (localPhoneDigits.length !== 9) {
        notify('Error', 'Phone number must be 9 digits (excluding +265 or leading 0)');
        setIsSubmitting(false);
        return;
      }

      if (formData.national_id.trim() && formData.national_id.trim().length !== 8) {
        notify('Error', 'National ID must be exactly 8 characters');
        setIsSubmitting(false);
        return;
      }

      // Build multipart form data so the photo file can travel with the request
      const memberData = new FormData();
      memberData.append('full_name', formData.full_name.trim());
      memberData.append('phone_number', normalizePhoneNumber(formData.phone_number.trim()));
      memberData.append('national_id', formData.national_id.trim() || 'PENDING');
      memberData.append('gender', formData.gender);
      memberData.append('address', formData.address.trim() || 'N/A');
      memberData.append('business_type', formData.business_type.trim() || '');
      memberData.append('business_description', formData.business_description.trim() || '');

      // Only attach a photo if the user took/picked a NEW one this session.
      if (nationalIdPhoto) {
        if (Platform.OS === 'web') {
          // On web, expo-image-picker returns a blob: URI with no real filename
          // or extension. We must fetch it into a real Blob, detect its actual
          // MIME type, and build a properly-named File from that - a plain
          // {uri, name, type} object is NOT understood by the browser's FormData.
          const fileResponse = await fetch(nationalIdPhoto);
          const blob = await fileResponse.blob();
          const detectedType = blob.type || 'image/jpeg';
          const detectedExt = detectedType.split('/')[1] || 'jpg';
          const filename = `national_id_${Date.now()}.${detectedExt}`;
          const file = new File([blob], filename, { type: detectedType });
          memberData.append('national_id_photo', file);
        } else {
          // Native (iOS/Android) - RN's FormData polyfill understands this shape
          // and streams the file directly from the local file:// URI.
          const rawName = nationalIdPhoto.split('/').pop() || '';
          const match = /\.(\w+)$/.exec(rawName);
          const ext = match ? match[1].toLowerCase() : 'jpg';
          const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
          const filename = `national_id_${Date.now()}.${ext}`;

          memberData.append('national_id_photo', {
            uri: nationalIdPhoto,
            name: filename,
            type: mimeType,
          } as any);
        }
      }

      let response;
      if (editingMember) {
        response = await groupAPI.updateMemberMultipart(groupId, editingMember.id, memberData);
        notify('Success', 'Member updated successfully!');
      } else {
        response = await groupAPI.addMemberMultipart(groupId, memberData);
        notify('Success', 'Member added successfully!');
      }

      console.log('Member saved response:', response.data);

      setShowAddModal(false);
      resetForm();
      await loadMembers();
    } catch (error: any) {
      console.error('Failed to save member:', error);
      console.error('Error response:', error?.response?.data);

      const errorMessage =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        (error?.response?.data ? JSON.stringify(error.response.data) : null) ||
        'Failed to save member. Please check all fields.';
      notify('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmAndDeleteMember = async (memberId: string) => {
    try {
      await groupAPI.removeMember(groupId, memberId);
      notify('Success', 'Member deleted successfully');
      await loadMembers();
    } catch (error: any) {
      const msg = error?.response?.data?.error || 'Failed to delete member';
      notify('Error', msg);
    }
  };

  const handleDeleteMember = (memberId: string, memberName: string) => {
    if (Platform.OS === 'web') {
      // Alert.alert never shows a dialog on web, so its button callbacks
      // (including the delete action) never fire — this was the bug.
      if (window.confirm(`Are you sure you want to delete ${memberName}?`)) {
        confirmAndDeleteMember(memberId);
      }
      return;
    }

    Alert.alert('Delete Member', `Are you sure you want to delete ${memberName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => confirmAndDeleteMember(memberId) },
    ]);
  };

  const handleEditMember = (member: Member) => {
    setEditingMember(member);
    setFormData({
      full_name: member.full_name,
      phone_number: member.phone_number,
      national_id: member.national_id || '',
      gender: member.gender || 'M',
      business_type: member.business_type || '',
      business_description: member.business_description || '',
      address: member.address === 'N/A' ? '' : (member.address || ''),
    });
    setNationalIdPhoto(null);
    setShowAddModal(true);
  };

  const normalizePhoneNumber = (raw: string): string => {
    const digits = raw.replace(/[^0-9]/g, '');

    if (digits.startsWith('265') && digits.length === 12) {
      return `+${digits}`;
    }
    if (digits.startsWith('0') && digits.length === 10) {
      return `+265${digits.slice(1)}`;
    }
    if (digits.length === 9) {
      return `+265${digits}`;
    }
    return digits ? `+${digits}` : raw.trim();
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join('');

  const AVATAR_COLORS = ['#0B6B80', '#7c3aed', '#dc2626', '#d97706', '#16a34a', '#2563eb'];
  const getAvatarColor = (name: string) => {
    const idx = name.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
    return AVATAR_COLORS[idx];
  };

  const renderMember = ({ item }: { item: Member }) => (
    <View style={[styles.memberCard, { borderLeftColor: item.is_active ? '#16a34a' : '#d1d5db' }]}>
      <View style={styles.memberRow}>
        <View style={[styles.avatarCircle, { backgroundColor: getAvatarColor(item.full_name) }]}>
          <Text style={styles.avatarText}>{getInitials(item.full_name) || '?'}</Text>
        </View>

        <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
            <Text style={styles.memberName} numberOfLines={1}>{item.full_name}</Text>
            <View style={[styles.statusDot, { backgroundColor: item.is_active ? '#16a34a' : '#9ca3af' }]} />
          </View>

          <View style={styles.detailRow}>
            <Icon name="call-outline" size={13} color={colors.secondary} />
            <Text style={styles.memberDetail}>{item.phone_number}</Text>
          </View>
          {item.business_type ? (
            <View style={styles.detailRow}>
              <Icon name="briefcase-outline" size={13} color={colors.secondary} />
              <Text style={styles.memberDetail}>
                {businessTypes.find((b) => b.value === item.business_type)?.label || item.business_type}
              </Text>
            </View>
          ) : null}
          <View style={styles.detailRow}>
            <Icon name="location-outline" size={13} color={colors.secondary} />
            <Text style={styles.memberDetail} numberOfLines={1}>{item.address || 'No address'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.memberActions}>
        <TouchableOpacity style={styles.editButton} onPress={() => handleEditMember(item)} activeOpacity={0.7}>
          <Icon name="create-outline" size={15} color="#2563eb" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteMember(item.id, item.full_name)} activeOpacity={0.7}>
          <Icon name="trash-outline" size={15} color="#dc2626" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back button + icon accent */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.titleRow}>
            <View style={styles.titleIconCircle}>
              <Icon name="people" size={16} color={colors.primary} />
            </View>
            <Text style={styles.title}>Member Registration</Text>
          </View>
          <Text style={styles.subtitle}>Total: {members.length} members</Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.7}
        >
          <Icon name="add" size={16} color="#fff" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={members}
        renderItem={renderMember}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Icon name="people-outline" size={32} color={colors.primary} />
            </View>
            <Text style={styles.emptyText}>No members registered yet</Text>
            <Text style={styles.emptySubtext}>Tap "Add" to register a new member</Text>
          </View>
        }
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      {/* Add/Edit Member Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeaderRow}>
                  <View style={styles.modalTitleIconCircle}>
                    <Icon
                      name={editingMember ? 'create-outline' : 'person-add-outline'}
                      size={18}
                      color={colors.primary}
                    />
                  </View>
                  <Text style={styles.modalTitle}>
                    {editingMember ? 'Edit Member' : 'Add New Member'}
                  </Text>
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Full Name *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={formData.full_name}
                    onChangeText={(text) => setFormData({ ...formData, full_name: text })}
                    placeholder="Enter full name"
                    placeholderTextColor={colors.secondary}
                  />
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Phone Number *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={formData.phone_number}
                    onChangeText={(text) => setFormData({ ...formData, phone_number: text })}
                    placeholder="Enter phone number"
                    keyboardType="phone-pad"
                    placeholderTextColor={colors.secondary}
                    maxLength={13}
                  />
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>National ID *</Text>
                  <View style={styles.idInputContainer}>
                    <TextInput
                      style={[styles.modalInput, styles.idInput]}
                      value={formData.national_id}
                      onChangeText={(text) => setFormData({ ...formData, national_id: text })}
                      placeholder="Enter national ID"
                      placeholderTextColor={colors.secondary}
                      maxLength={8}
                      autoCapitalize="characters"
                    />
                    <TouchableOpacity
                      style={styles.cameraButton}
                      onPress={takePhoto}
                      activeOpacity={0.7}
                    >
                      <Icon name="camera-outline" size={22} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.charCount}>{formData.national_id.length}/8 characters</Text>
                  {nationalIdPhoto && (
                    <View style={styles.photoPreview}>
                      <Image source={{ uri: nationalIdPhoto }} style={styles.photoPreviewImage} />
                      <TouchableOpacity
                        style={styles.removePhotoButton}
                        onPress={() => setNationalIdPhoto(null)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.removePhotoText}>✕ Remove</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Gender</Text>
                  <View style={styles.genderContainer}>
                    {['M', 'F', 'O'].map((gender) => (
                      <TouchableOpacity
                        key={gender}
                        style={[
                          styles.genderButton,
                          formData.gender === gender && styles.selectedGender,
                        ]}
                        onPress={() => setFormData({ ...formData, gender })}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.genderText,
                            formData.gender === gender && styles.selectedGenderText,
                          ]}
                        >
                          {gender === 'M' ? 'Male' : gender === 'F' ? 'Female' : 'Other'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.sectionDivider}>
                  <View style={styles.sectionDividerLine} />
                  <Text style={styles.sectionDividerText}>Address</Text>
                  <View style={styles.sectionDividerLine} />
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Address</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={formData.address}
                    onChangeText={(text) => setFormData({ ...formData, address: text })}
                    placeholder="Village, TA, City/District"
                    placeholderTextColor={colors.secondary}
                  />
                </View>

                <View style={styles.sectionDivider}>
                  <View style={styles.sectionDividerLine} />
                  <Text style={styles.sectionDividerText}>Business</Text>
                  <View style={styles.sectionDividerLine} />
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Business Type</Text>
                  <TouchableOpacity
                    style={styles.modalInput}
                    onPress={() => setShowBusinessTypePicker(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: formData.business_type ? colors.text : colors.secondary, fontSize: 16 }}>
                      {businessTypes.find((b) => b.value === formData.business_type)?.label || 'Select business type'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Business Description</Text>
                  <TextInput
                    style={[styles.modalInput, styles.textArea]}
                    value={formData.business_description}
                    onChangeText={(text) => setFormData({ ...formData, business_description: text })}
                    placeholder="Brief description of the business (optional)"
                    placeholderTextColor={colors.secondary}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={closeModal}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.submitModalButton]}
                    onPress={handleAddMember}
                    disabled={isSubmitting}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.submitModalButtonText}>
                      {isSubmitting ? 'Saving...' : editingMember ? 'Update' : 'Save'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showBusinessTypePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBusinessTypePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowBusinessTypePicker(false)}
        >
          <View style={[styles.modalContent, { maxHeight: '70%', padding: 16 }]}>
            <Text style={styles.modalTitle}>Select Business Type</Text>
            <ScrollView style={{ marginTop: 12 }}>
              {businessTypes.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={{
                    paddingVertical: 14,
                    paddingHorizontal: 4,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  onPress={() => {
                    setFormData({ ...formData, business_type: type.value });
                    setShowBusinessTypePicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 15, color: colors.text }}>{type.label}</Text>
                  {formData.business_type === type.value && (
                    <Icon name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerCenter: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 2,
    marginLeft: 30,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 76,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.secondary,
    marginTop: 4,
  },
  memberCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    shadowColor: '#0B6B80',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginRight: 6,
    flexShrink: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  memberDetail: {
    fontSize: 13,
    color: colors.secondary,
    flexShrink: 1,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  activeBadge: {
    backgroundColor: '#d1fae5',
  },
  inactiveBadge: {
    backgroundColor: '#f3f4f6',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  editButtonText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
  },
  deleteButtonText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
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
    padding: 24,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitleIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalField: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  textArea: {
    minHeight: 70,
  },
  idInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  idInput: {
    flex: 1,
  },
  cameraButton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
  },
  photoPreview: {
    marginTop: 8,
    alignItems: 'center',
  },
  photoPreviewImage: {
    width: 100,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  removePhotoButton: {
    marginTop: 4,
    padding: 4,
  },
  removePhotoText: {
    color: colors.error,
    fontSize: 12,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  genderButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  selectedGender: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  genderText: {
    color: colors.text,
  },
  selectedGenderText: {
    color: '#fff',
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  sectionDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  sectionDividerText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
    paddingHorizontal: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
  submitModalButton: {
    backgroundColor: colors.primary,
  },
  submitModalButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  charCount: {
    fontSize: 11,
    color: colors.secondary,
    marginTop: 4,
    marginLeft: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
});