// // // src/screens/AddRecordsScreen.tsx - WITH UI FIXES
// // import React, { useState } from 'react';
// // import {
// //   View,
// //   Text,
// //   StyleSheet,
// //   TouchableOpacity,
// //   ScrollView,
// //   SafeAreaView,
// //   Alert,
// //   ActivityIndicator,
// //   FlatList,
// //   TextInput,
// //   KeyboardAvoidingView,
// //   Platform,
// //   Modal,
// // } from 'react-native';
// // import * as DocumentPicker from 'expo-document-picker';
// // import * as ImagePicker from 'expo-image-picker';
// // import { colors } from '../theme/colors';
// // import { api } from '../api/client';

// // interface Document {
// //   id: string;
// //   uri: string;
// //   name: string;
// //   size: number;
// //   type: string;
// //   fileType: 'image' | 'pdf' | 'document' | 'text' | 'other';
// //   content?: string;
// // }

// // const RECORD_TYPES = [
// //   { label: 'Meeting Minutes', value: 'meeting_minutes' },
// //   { label: 'Financial Report', value: 'financial_report' },
// //   { label: 'Constitution', value: 'constitution' },
// //   { label: 'Member List', value: 'member_list' },
// //   { label: 'Other', value: 'other' },
// // ];

// // export function AddRecordsScreen({ route, navigation }: any) {
// //   const { groupId } = route.params || {};

// //   const [documents, setDocuments] = useState<Document[]>([]);
// //   const [uploading, setUploading] = useState(false);
// //   const [uploadProgress, setUploadProgress] = useState(0);
// //   const [isSuccess, setIsSuccess] = useState(false);
// //   const [showTextInput, setShowTextInput] = useState(false);
// //   const [textContent, setTextContent] = useState('');
// //   const [textTitle, setTextTitle] = useState('');
// //   const [selectedRecordType, setSelectedRecordType] = useState('other');
// //   const [recordName, setRecordName] = useState('');
// //   const [description, setDescription] = useState('');
// //   const [showRecordTypeDropdown, setShowRecordTypeDropdown] = useState(false);

// //   if (!groupId) {
// //     Alert.alert('Error', 'Group ID is missing');
// //     navigation.goBack();
// //     return null;
// //   }

// //   const getFileType = (mimeType: string, fileName: string): 'image' | 'pdf' | 'document' | 'text' | 'other' => {
// //     if (mimeType?.startsWith('image/')) return 'image';
// //     if (mimeType === 'application/pdf' || fileName?.toLowerCase().endsWith('.pdf')) return 'pdf';
// //     if (mimeType?.includes('word') || mimeType?.includes('document') || 
// //         fileName?.toLowerCase().endsWith('.doc') || fileName?.toLowerCase().endsWith('.docx')) {
// //       return 'document';
// //     }
// //     if (mimeType === 'text/plain' || fileName?.toLowerCase().endsWith('.txt')) return 'text';
// //     return 'other';
// //   };

// //   const getFileIcon = (fileType: string) => {
// //     switch (fileType) {
// //       case 'image': return '🖼️';
// //       case 'pdf': return '📄';
// //       case 'document': return '📝';
// //       case 'text': return '📃';
// //       default: return '📎';
// //     }
// //   };

// //   const getFileSizeDisplay = (bytes: number) => {
// //     if (bytes < 1024) return bytes + ' B';
// //     if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
// //     return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
// //   };

// //   const pickDocument = async () => {
// //     try {
// //       const result = await DocumentPicker.getDocumentAsync({
// //         type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
// //         copyToCacheDirectory: true,
// //       });

// //       if (!result.canceled && result.assets && result.assets.length > 0) {
// //         const asset = result.assets[0];
// //         const fileType = getFileType(asset.mimeType || '', asset.name || '');
// //         const newDoc: Document = {
// //           id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
// //           uri: asset.uri,
// //           name: asset.name || 'document',
// //           size: asset.size || 0,
// //           type: asset.mimeType || 'application/octet-stream',
// //           fileType: fileType,
// //         };
// //         setDocuments(prev => [...prev, newDoc]);
// //         Alert.alert('Success', `${newDoc.name} added successfully`);
// //       }
// //     } catch (error) {
// //       console.error('Document pick error:', error);
// //       Alert.alert('Error', 'Failed to pick document');
// //     }
// //   };

// //   const takePhoto = async () => {
// //     try {
// //       const { status } = await ImagePicker.requestCameraPermissionsAsync();
// //       if (status !== 'granted') {
// //         Alert.alert('Permission needed', 'Camera permission is required to take photo');
// //         return;
// //       }

// //       const result = await ImagePicker.launchCameraAsync({
// //         allowsEditing: true,
// //         quality: 0.8,
// //         base64: true,
// //       });

// //       if (!result.canceled && result.assets && result.assets.length > 0) {
// //         const asset = result.assets[0];
// //         const newDoc: Document = {
// //           id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
// //           uri: asset.uri,
// //           name: 'photo_' + new Date().toISOString().replace(/[:.]/g, '-') + '.jpg',
// //           size: asset.fileSize || 0,
// //           type: 'image/jpeg',
// //           fileType: 'image',
// //         };
// //         setDocuments(prev => [...prev, newDoc]);
// //         Alert.alert('Success', 'Photo captured successfully');
// //       }
// //     } catch (error) {
// //       console.error('Camera error:', error);
// //       Alert.alert('Error', 'Failed to open camera');
// //     }
// //   };

// //   const handleAddTextRecord = () => {
// //     if (!textTitle.trim()) {
// //       Alert.alert('Error', 'Please enter a title for the record');
// //       return;
// //     }
// //     if (!textContent.trim()) {
// //       Alert.alert('Error', 'Please enter some content');
// //       return;
// //     }

// //     const newDoc: Document = {
// //       id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
// //       uri: '',
// //       name: textTitle.trim() + '.txt',
// //       size: textContent.length,
// //       type: 'text/plain',
// //       fileType: 'text',
// //       content: textContent.trim(),
// //     };

// //     setDocuments(prev => [...prev, newDoc]);
// //     setTextTitle('');
// //     setTextContent('');
// //     setShowTextInput(false);
// //     Alert.alert('Success', 'Text record added successfully');
// //   };

// //   const removeDocument = (id: string, name: string) => {
// //     Alert.alert(
// //       'Remove Document',
// //       `Are you sure you want to remove "${name}"?`,
// //       [
// //         { text: 'Cancel', style: 'cancel' },
// //         { 
// //           text: 'Remove', 
// //           style: 'destructive',
// //           onPress: () => {
// //             setDocuments(prev => prev.filter(doc => doc.id !== id));
// //           }
// //         },
// //       ]
// //     );
// //   };

// //   const clearAllDocuments = () => {
// //     if (documents.length === 0) return;
    
// //     Alert.alert(
// //       'Clear All',
// //       'Are you sure you want to remove all documents?',
// //       [
// //         { text: 'Cancel', style: 'cancel' },
// //         { 
// //           text: 'Clear All', 
// //           style: 'destructive',
// //           onPress: () => {
// //             setDocuments([]);
// //           }
// //         },
// //       ]
// //     );
// //   };

// //   const resetForm = () => {
// //     setDocuments([]);
// //     setIsSuccess(false);
// //     setRecordName('');
// //     setDescription('');
// //     setSelectedRecordType('other');
// //     setUploadProgress(0);
// //   };

// //   const handleSubmit = async () => {
// //     if (documents.length === 0) {
// //       Alert.alert('Error', 'Please select at least one document');
// //       return;
// //     }

// //     if (!recordName.trim()) {
// //       Alert.alert('Error', 'Please enter a record name');
// //       return;
// //     }

// //     setUploading(true);
// //     setUploadProgress(0);

// //     try {
// //       const firstDoc = documents[0];
      
// //       const formData = new FormData();
      
// //       let file;
      
// //       if (firstDoc.fileType === 'text' && firstDoc.content) {
// //         const blob = new Blob([firstDoc.content], { type: 'text/plain' });
// //         file = new File([blob], firstDoc.name, { type: 'text/plain' });
// //       } else {
// //         const response = await fetch(firstDoc.uri);
// //         const blob = await response.blob();
// //         file = new File([blob], firstDoc.name, { type: firstDoc.type || 'application/octet-stream' });
// //       }
      
// //       formData.append('file', file);
// //       formData.append('record_name', recordName.trim());
// //       formData.append('record_type', selectedRecordType);
// //       if (description.trim()) {
// //         formData.append('description', description.trim());
// //       }

// //       console.log('=== UPLOAD DETAILS ===');
// //       console.log('Record Name:', recordName);
// //       console.log('Record Type:', selectedRecordType);
// //       console.log('File Name:', firstDoc.name);
// //       console.log('=======================');

// //       const response = await api.post(`/groups/${groupId}/upload_record/`, formData, {
// //         headers: {
// //           'Content-Type': 'multipart/form-data',
// //           'Accept': 'application/json',
// //         },
// //       });

// //       console.log('Upload response:', response.data);
      
// //       setUploadProgress(100);
// //       setIsSuccess(true);
      
// //       Alert.alert(
// //         'Success!', 
// //         `Record "${recordName}" uploaded successfully!`,
// //         [
// //           { 
// //             text: 'OK', 
// //             onPress: () => {
// //               // Reset everything and go back
// //               resetForm();
// //               navigation.goBack();
// //             }
// //           }
// //         ]
// //       );
// //     } catch (error: any) {
// //       console.error('Upload error:', error);
// //       console.error('Error response:', error?.response?.data);
      
// //       let errorMessage = 'Failed to upload record. Please try again.';
      
// //       if (error?.response?.data) {
// //         const data = error.response.data;
// //         if (typeof data === 'object') {
// //           const messages = [];
// //           for (const [key, value] of Object.entries(data)) {
// //             if (Array.isArray(value)) {
// //               messages.push(`${key}: ${value.join(', ')}`);
// //             } else {
// //               messages.push(`${key}: ${value}`);
// //             }
// //           }
// //           if (messages.length > 0) {
// //             errorMessage = messages.join('\n');
// //           }
// //         } else if (typeof data === 'string') {
// //           errorMessage = data;
// //         }
// //       }
      
// //       Alert.alert('Error', errorMessage);
// //     } finally {
// //       setUploading(false);
// //       setUploadProgress(0);
// //     }
// //   };

// //   const renderDocument = ({ item }: { item: Document }) => (
// //     <View style={styles.documentItem}>
// //       <View style={styles.documentIcon}>
// //         <Text style={styles.documentIconText}>{getFileIcon(item.fileType)}</Text>
// //       </View>
// //       <View style={styles.documentInfo}>
// //         <Text style={styles.documentName} numberOfLines={1}>{item.name}</Text>
// //         <Text style={styles.documentSize}>
// //           {item.fileType === 'text' ? `${item.size} characters` : getFileSizeDisplay(item.size)}
// //         </Text>
// //         {item.fileType === 'text' && (
// //           <Text style={styles.documentPreview} numberOfLines={1}>
// //             {item.content?.substring(0, 50)}...
// //           </Text>
// //         )}
// //       </View>
// //       <TouchableOpacity
// //         style={styles.removeButton}
// //         onPress={() => removeDocument(item.id, item.name)}
// //         activeOpacity={0.7}
// //       >
// //         <Text style={styles.removeButtonText}>✕</Text>
// //       </TouchableOpacity>
// //     </View>
// //   );

// //   const getSelectedRecordTypeLabel = () => {
// //     const found = RECORD_TYPES.find(t => t.value === selectedRecordType);
// //     return found ? found.label : 'Select record type';
// //   };

// //   return (
// //     <SafeAreaView style={styles.container}>
// //       <KeyboardAvoidingView
// //         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
// //         style={styles.container}
// //       >
// //         <ScrollView 
// //           contentContainerStyle={styles.scrollContent}
// //           keyboardShouldPersistTaps="handled"
// //         >
// //           <View style={styles.header}>
// //             <Text style={styles.title}>Add Records</Text>
// //             <Text style={styles.subtitle}>Upload documents or write notes to ECORET</Text>
// //           </View>

// //           <View style={styles.metadataSection}>
// //             <View style={styles.metadataField}>
// //               <Text style={styles.metadataLabel}>Record Name *</Text>
// //               <TextInput
// //                 style={styles.metadataInput}
// //                 value={recordName}
// //                 onChangeText={setRecordName}
// //                 placeholder="Enter record name"
// //                 placeholderTextColor={colors.secondary}
// //               />
// //             </View>

// //             <View style={styles.metadataField}>
// //               <Text style={styles.metadataLabel}>Record Type *</Text>
// //               <TouchableOpacity
// //                 style={styles.dropdownButton}
// //                 onPress={() => setShowRecordTypeDropdown(!showRecordTypeDropdown)}
// //                 activeOpacity={0.7}
// //               >
// //                 <Text style={[
// //                   styles.dropdownButtonText,
// //                   !selectedRecordType && styles.dropdownPlaceholder
// //                 ]}>
// //                   {getSelectedRecordTypeLabel()}
// //                 </Text>
// //                 <Text style={styles.dropdownArrow}>▼</Text>
// //               </TouchableOpacity>
// //             </View>

// //             <View style={styles.metadataField}>
// //               <Text style={styles.metadataLabel}>Description</Text>
// //               <TextInput
// //                 style={styles.metadataInput}
// //                 value={description}
// //                 onChangeText={setDescription}
// //                 placeholder="Optional description"
// //                 placeholderTextColor={colors.secondary}
// //                 multiline
// //               />
// //             </View>
// //           </View>

// //           <View style={styles.uploadOptions}>
// //             <TouchableOpacity 
// //               style={[styles.uploadOption, styles.uploadDocument]} 
// //               onPress={pickDocument}
// //               activeOpacity={0.7}
// //             >
// //               <Text style={styles.uploadOptionIcon}>📄</Text>
// //               <Text style={styles.uploadOptionText}>Choose Document</Text>
// //               <Text style={styles.uploadOptionSubtext}>PDF, Word, Images</Text>
// //             </TouchableOpacity>

// //             <TouchableOpacity 
// //               style={[styles.uploadOption, styles.uploadPhoto]} 
// //               onPress={takePhoto}
// //               activeOpacity={0.7}
// //             >
// //               <Text style={styles.uploadOptionIcon}>📷</Text>
// //               <Text style={styles.uploadOptionText}>Take Photo</Text>
// //               <Text style={styles.uploadOptionSubtext}>Capture with camera</Text>
// //             </TouchableOpacity>

// //             <TouchableOpacity 
// //               style={[styles.uploadOption, styles.uploadText]} 
// //               onPress={() => setShowTextInput(true)}
// //               activeOpacity={0.7}
// //             >
// //               <Text style={styles.uploadOptionIcon}>✍️</Text>
// //               <Text style={styles.uploadOptionText}>Write Note</Text>
// //               <Text style={styles.uploadOptionSubtext}>Type text content</Text>
// //             </TouchableOpacity>
// //           </View>

// //           {showTextInput && (
// //             <View style={styles.textInputContainer}>
// //               <View style={styles.textInputHeader}>
// //                 <Text style={styles.textInputTitle}>Write Note</Text>
// //                 <TouchableOpacity 
// //                   onPress={() => {
// //                     setShowTextInput(false);
// //                     setTextTitle('');
// //                     setTextContent('');
// //                   }}
// //                   activeOpacity={0.7}
// //                 >
// //                   <Text style={styles.textInputClose}>✕</Text>
// //                 </TouchableOpacity>
// //               </View>

// //               <View style={styles.textInputField}>
// //                 <Text style={styles.textInputLabel}>Title *</Text>
// //                 <TextInput
// //                   style={styles.textTitleInput}
// //                   value={textTitle}
// //                   onChangeText={setTextTitle}
// //                   placeholder="Enter record title"
// //                   placeholderTextColor={colors.secondary}
// //                 />
// //               </View>

// //               <View style={styles.textInputField}>
// //                 <Text style={styles.textInputLabel}>Content *</Text>
// //                 <TextInput
// //                   style={styles.textContentInput}
// //                   value={textContent}
// //                   onChangeText={setTextContent}
// //                   placeholder="Write your notes here..."
// //                   placeholderTextColor={colors.secondary}
// //                   multiline
// //                   textAlignVertical="top"
// //                 />
// //               </View>

// //               <View style={styles.textInputActions}>
// //                 <TouchableOpacity
// //                   style={[styles.textInputButton, styles.textInputCancel]}
// //                   onPress={() => {
// //                     setShowTextInput(false);
// //                     setTextTitle('');
// //                     setTextContent('');
// //                   }}
// //                   activeOpacity={0.7}
// //                 >
// //                   <Text style={styles.textInputCancelText}>Cancel</Text>
// //                 </TouchableOpacity>
// //                 <TouchableOpacity
// //                   style={[styles.textInputButton, styles.textInputSave]}
// //                   onPress={handleAddTextRecord}
// //                   activeOpacity={0.7}
// //                 >
// //                   <Text style={styles.textInputSaveText}>Add Note</Text>
// //                 </TouchableOpacity>
// //               </View>
// //             </View>
// //           )}

// //           {documents.length > 0 && (
// //             <View style={styles.documentsSection}>
// //               <View style={styles.documentsHeader}>
// //                 <Text style={styles.sectionTitle}>
// //                   Selected Documents ({documents.length})
// //                 </Text>
// //                 <TouchableOpacity 
// //                   onPress={clearAllDocuments}
// //                   activeOpacity={0.7}
// //                 >
// //                   <Text style={styles.clearAllText}>Clear All</Text>
// //                 </TouchableOpacity>
// //               </View>

// //               <FlatList
// //                 data={documents}
// //                 renderItem={renderDocument}
// //                 keyExtractor={(item) => item.id}
// //                 scrollEnabled={false}
// //                 contentContainerStyle={styles.documentsList}
// //               />

// //               <TouchableOpacity
// //                 style={[
// //                   styles.submitButton,
// //                   uploading && styles.uploadingButton,
// //                   isSuccess && styles.successButton,
// //                   (!recordName.trim() || documents.length === 0) && styles.disabledButton
// //                 ]}
// //                 onPress={handleSubmit}
// //                 disabled={uploading || isSuccess || !recordName.trim() || documents.length === 0}
// //                 activeOpacity={0.7}
// //               >
// //                 {uploading ? (
// //                   <View style={styles.uploadProgressContainer}>
// //                     <ActivityIndicator color="#fff" size="small" />
// //                     <Text style={styles.submitButtonText}>
// //                       Uploading... {uploadProgress}%
// //                     </Text>
// //                   </View>
// //                 ) : isSuccess ? (
// //                   <Text style={styles.submitButtonText}>✅ Uploaded Successfully</Text>
// //                 ) : (
// //                   <Text style={styles.submitButtonText}>
// //                     Submit Record to ECORET
// //                   </Text>
// //                 )}
// //               </TouchableOpacity>

// //               {uploading && (
// //                 <View style={styles.progressBarContainer}>
// //                   <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
// //                 </View>
// //               )}
// //             </View>
// //           )}

// //           {documents.length === 0 && !uploading && !isSuccess && !showTextInput && (
// //             <View style={styles.emptyState}>
// //               <Text style={styles.emptyEmoji}>📂</Text>
// //               <Text style={styles.emptyTitle}>No records added yet</Text>
// //               <Text style={styles.emptyText}>
// //                 Choose a document, take a photo, or write a note
// //               </Text>
// //             </View>
// //           )}

// //           <View style={styles.infoBox}>
// //             <Text style={styles.infoTitle}>📌 What happens next?</Text>
// //             <Text style={styles.infoText}>• Records are sent to ECORET administrators</Text>
// //             <Text style={styles.infoText}>• You'll receive a notification when reviewed</Text>
// //             <Text style={styles.infoText}>• Keep records for your group's reference</Text>
// //           </View>
// //         </ScrollView>
// //       </KeyboardAvoidingView>

// //       <Modal
// //         visible={showRecordTypeDropdown}
// //         transparent
// //         animationType="fade"
// //         onRequestClose={() => setShowRecordTypeDropdown(false)}
// //       >
// //         <TouchableOpacity
// //           style={styles.dropdownModalOverlay}
// //           activeOpacity={1}
// //           onPress={() => setShowRecordTypeDropdown(false)}
// //         >
// //           <View style={styles.dropdownModalContent}>
// //             <View style={styles.dropdownModalHeader}>
// //               <Text style={styles.dropdownModalTitle}>Select Record Type</Text>
// //               <TouchableOpacity
// //                 onPress={() => setShowRecordTypeDropdown(false)}
// //                 activeOpacity={0.7}
// //               >
// //                 <Text style={styles.dropdownModalClose}>✕</Text>
// //               </TouchableOpacity>
// //             </View>
// //             {RECORD_TYPES.map((type) => (
// //               <TouchableOpacity
// //                 key={type.value}
// //                 style={[
// //                   styles.dropdownModalItem,
// //                   selectedRecordType === type.value && styles.dropdownModalItemSelected,
// //                 ]}
// //                 onPress={() => {
// //                   setSelectedRecordType(type.value);
// //                   setShowRecordTypeDropdown(false);
// //                 }}
// //                 activeOpacity={0.7}
// //               >
// //                 <Text style={[
// //                   styles.dropdownModalItemText,
// //                   selectedRecordType === type.value && styles.dropdownModalItemTextSelected,
// //                 ]}>
// //                   {type.label}
// //                 </Text>
// //                 {selectedRecordType === type.value && (
// //                   <Text style={styles.dropdownModalCheck}>✓</Text>
// //                 )}
// //               </TouchableOpacity>
// //             ))}
// //           </View>
// //         </TouchableOpacity>
// //       </Modal>
// //     </SafeAreaView>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   container: {
// //     flex: 1,
// //     backgroundColor: colors.background,
// //   },
// //   scrollContent: {
// //     padding: 20,
// //     paddingBottom: 40,
// //   },
// //   header: {
// //     marginBottom: 16,
// //   },
// //   title: {
// //     fontSize: 24,
// //     fontWeight: 'bold',
// //     color: colors.text,
// //   },
// //   subtitle: {
// //     fontSize: 14,
// //     color: colors.secondary,
// //     marginTop: 4,
// //   },
// //   metadataSection: {
// //     backgroundColor: colors.surface,
// //     borderRadius: 12,
// //     padding: 16,
// //     marginBottom: 16,
// //     borderWidth: 1,
// //     borderColor: colors.border,
// //   },
// //   metadataField: {
// //     marginBottom: 12,
// //   },
// //   metadataLabel: {
// //     fontSize: 14,
// //     fontWeight: '600',
// //     color: colors.text,
// //     marginBottom: 6,
// //   },
// //   metadataInput: {
// //     borderWidth: 1,
// //     borderColor: colors.border,
// //     borderRadius: 8,
// //     padding: 12,
// //     fontSize: 16,
// //     color: colors.text,
// //     backgroundColor: colors.background,
// //     minHeight: 50,
// //     textAlignVertical: 'top',
// //   },
// //   dropdownButton: {
// //     borderWidth: 1,
// //     borderColor: colors.border,
// //     borderRadius: 8,
// //     padding: 12,
// //     backgroundColor: colors.background,
// //     flexDirection: 'row',
// //     justifyContent: 'space-between',
// //     alignItems: 'center',
// //   },
// //   dropdownButtonText: {
// //     fontSize: 16,
// //     color: colors.text,
// //   },
// //   dropdownPlaceholder: {
// //     color: colors.secondary,
// //   },
// //   dropdownArrow: {
// //     fontSize: 16,
// //     color: colors.secondary,
// //   },
// //   dropdownModalOverlay: {
// //     flex: 1,
// //     backgroundColor: 'rgba(0,0,0,0.5)',
// //     justifyContent: 'center',
// //     alignItems: 'center',
// //     padding: 20,
// //   },
// //   dropdownModalContent: {
// //     backgroundColor: colors.surface,
// //     borderRadius: 16,
// //     padding: 20,
// //     width: '100%',
// //     maxWidth: 400,
// //     maxHeight: '80%',
// //   },
// //   dropdownModalHeader: {
// //     flexDirection: 'row',
// //     justifyContent: 'space-between',
// //     alignItems: 'center',
// //     marginBottom: 16,
// //     paddingBottom: 12,
// //     borderBottomWidth: 1,
// //     borderBottomColor: colors.border,
// //   },
// //   dropdownModalTitle: {
// //     fontSize: 18,
// //     fontWeight: 'bold',
// //     color: colors.text,
// //   },
// //   dropdownModalClose: {
// //     fontSize: 20,
// //     color: colors.secondary,
// //     padding: 4,
// //   },
// //   dropdownModalItem: {
// //     flexDirection: 'row',
// //     justifyContent: 'space-between',
// //     alignItems: 'center',
// //     paddingVertical: 14,
// //     paddingHorizontal: 12,
// //     borderBottomWidth: 1,
// //     borderBottomColor: colors.border,
// //   },
// //   dropdownModalItemSelected: {
// //     backgroundColor: colors.primary + '15',
// //     borderRadius: 8,
// //   },
// //   dropdownModalItemText: {
// //     fontSize: 16,
// //     color: colors.text,
// //   },
// //   dropdownModalItemTextSelected: {
// //     color: colors.primary,
// //     fontWeight: '600',
// //   },
// //   dropdownModalCheck: {
// //     fontSize: 16,
// //     color: colors.primary,
// //     fontWeight: 'bold',
// //   },
// //   uploadOptions: {
// //     flexDirection: 'row',
// //     gap: 10,
// //     marginBottom: 16,
// //   },
// //   uploadOption: {
// //     flex: 1,
// //     backgroundColor: colors.surface,
// //     borderRadius: 12,
// //     padding: 14,
// //     alignItems: 'center',
// //     borderWidth: 1,
// //     borderColor: colors.border,
// //     shadowColor: '#000',
// //     shadowOffset: { width: 0, height: 1 },
// //     shadowOpacity: 0.05,
// //     shadowRadius: 2,
// //     elevation: 1,
// //     minHeight: 80,
// //   },
// //   uploadDocument: {
// //     borderTopColor: colors.primary,
// //     borderTopWidth: 3,
// //   },
// //   uploadPhoto: {
// //     borderTopColor: colors.accent,
// //     borderTopWidth: 3,
// //   },
// //   uploadText: {
// //     borderTopColor: colors.success,
// //     borderTopWidth: 3,
// //   },
// //   uploadOptionIcon: {
// //     fontSize: 24,
// //     marginBottom: 4,
// //   },
// //   uploadOptionText: {
// //     fontSize: 12,
// //     fontWeight: '600',
// //     color: colors.text,
// //   },
// //   uploadOptionSubtext: {
// //     fontSize: 10,
// //     color: colors.secondary,
// //     marginTop: 2,
// //     textAlign: 'center',
// //   },
// //   textInputContainer: {
// //     backgroundColor: colors.surface,
// //     borderRadius: 12,
// //     padding: 16,
// //     marginBottom: 20,
// //     borderWidth: 1,
// //     borderColor: colors.border,
// //     shadowColor: '#000',
// //     shadowOffset: { width: 0, height: 2 },
// //     shadowOpacity: 0.1,
// //     shadowRadius: 4,
// //     elevation: 3,
// //   },
// //   textInputHeader: {
// //     flexDirection: 'row',
// //     justifyContent: 'space-between',
// //     alignItems: 'center',
// //     marginBottom: 16,
// //   },
// //   textInputTitle: {
// //     fontSize: 18,
// //     fontWeight: 'bold',
// //     color: colors.text,
// //   },
// //   textInputClose: {
// //     fontSize: 20,
// //     color: colors.secondary,
// //     padding: 4,
// //   },
// //   textInputField: {
// //     marginBottom: 12,
// //   },
// //   textInputLabel: {
// //     fontSize: 14,
// //     fontWeight: '600',
// //     color: colors.text,
// //     marginBottom: 4,
// //   },
// //   textTitleInput: {
// //     borderWidth: 1,
// //     borderColor: colors.border,
// //     borderRadius: 8,
// //     padding: 12,
// //     fontSize: 16,
// //     color: colors.text,
// //     backgroundColor: colors.background,
// //   },
// //   textContentInput: {
// //     borderWidth: 1,
// //     borderColor: colors.border,
// //     borderRadius: 8,
// //     padding: 12,
// //     fontSize: 16,
// //     color: colors.text,
// //     backgroundColor: colors.background,
// //     minHeight: 120,
// //     maxHeight: 200,
// //   },
// //   textInputActions: {
// //     flexDirection: 'row',
// //     gap: 8,
// //     marginTop: 8,
// //   },
// //   textInputButton: {
// //     flex: 1,
// //     padding: 12,
// //     borderRadius: 8,
// //     alignItems: 'center',
// //   },
// //   textInputCancel: {
// //     backgroundColor: '#f3f4f6',
// //   },
// //   textInputCancelText: {
// //     color: colors.text,
// //     fontWeight: '600',
// //   },
// //   textInputSave: {
// //     backgroundColor: colors.primary,
// //   },
// //   textInputSaveText: {
// //     color: '#fff',
// //     fontWeight: '600',
// //   },
// //   documentsSection: {
// //     marginBottom: 20,
// //   },
// //   documentsHeader: {
// //     flexDirection: 'row',
// //     justifyContent: 'space-between',
// //     alignItems: 'center',
// //     marginBottom: 12,
// //   },
// //   sectionTitle: {
// //     fontSize: 16,
// //     fontWeight: '600',
// //     color: colors.text,
// //   },
// //   clearAllText: {
// //     fontSize: 14,
// //     color: colors.error,
// //     fontWeight: '500',
// //   },
// //   documentsList: {
// //     gap: 8,
// //   },
// //   documentItem: {
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //     backgroundColor: colors.surface,
// //     padding: 12,
// //     borderRadius: 8,
// //     marginBottom: 8,
// //     borderWidth: 1,
// //     borderColor: colors.border,
// //   },
// //   documentIcon: {
// //     width: 40,
// //     height: 40,
// //     borderRadius: 8,
// //     backgroundColor: colors.background,
// //     alignItems: 'center',
// //     justifyContent: 'center',
// //     marginRight: 12,
// //   },
// //   documentIconText: {
// //     fontSize: 20,
// //   },
// //   documentInfo: {
// //     flex: 1,
// //   },
// //   documentName: {
// //     fontSize: 14,
// //     color: colors.text,
// //     fontWeight: '500',
// //   },
// //   documentSize: {
// //     fontSize: 12,
// //     color: colors.secondary,
// //     marginTop: 2,
// //   },
// //   documentPreview: {
// //     fontSize: 12,
// //     color: colors.secondary,
// //     marginTop: 2,
// //     fontStyle: 'italic',
// //   },
// //   removeButton: {
// //     paddingHorizontal: 12,
// //     paddingVertical: 8,
// //     borderRadius: 6,
// //   },
// //   removeButtonText: {
// //     color: colors.error,
// //     fontSize: 18,
// //     fontWeight: 'bold',
// //   },
// //   submitButton: {
// //     backgroundColor: colors.primary,
// //     padding: 16,
// //     borderRadius: 12,
// //     alignItems: 'center',
// //     marginTop: 8,
// //   },
// //   uploadingButton: {
// //     backgroundColor: colors.primary,
// //     opacity: 0.8,
// //   },
// //   successButton: {
// //     backgroundColor: colors.success,
// //   },
// //   disabledButton: {
// //     backgroundColor: colors.secondary,
// //     opacity: 0.5,
// //   },
// //   uploadProgressContainer: {
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //     gap: 8,
// //   },
// //   submitButtonText: {
// //     color: '#fff',
// //     fontSize: 16,
// //     fontWeight: '600',
// //   },
// //   progressBarContainer: {
// //     height: 4,
// //     backgroundColor: colors.border,
// //     borderRadius: 2,
// //     marginTop: 8,
// //     overflow: 'hidden',
// //   },
// //   progressBar: {
// //     height: '100%',
// //     backgroundColor: colors.success,
// //     borderRadius: 2,
// //   },
// //   emptyState: {
// //     alignItems: 'center',
// //     paddingVertical: 40,
// //   },
// //   emptyEmoji: {
// //     fontSize: 48,
// //     marginBottom: 12,
// //   },
// //   emptyTitle: {
// //     fontSize: 16,
// //     fontWeight: '600',
// //     color: colors.text,
// //     marginBottom: 4,
// //   },
// //   emptyText: {
// //     fontSize: 14,
// //     color: colors.secondary,
// //     textAlign: 'center',
// //   },
// //   infoBox: {
// //     backgroundColor: '#f0fdf4',
// //     borderRadius: 12,
// //     padding: 16,
// //     marginTop: 12,
// //     borderWidth: 1,
// //     borderColor: '#bbf7d0',
// //   },
// //   infoTitle: {
// //     fontSize: 14,
// //     fontWeight: '600',
// //     color: '#166534',
// //     marginBottom: 8,
// //   },
// //   infoText: {
// //     fontSize: 13,
// //     color: '#166534',
// //     marginBottom: 4,
// //     paddingLeft: 8,
// //   },
// // });








// // src/screens/AddRecordsScreen.tsx - SIMPLIFIED FLOW
// import React, { useState } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
//   SafeAreaView,
//   Alert,
//   ActivityIndicator,
//   TextInput,
//   KeyboardAvoidingView,
//   Platform,
//   Modal,
// } from 'react-native';
// import * as DocumentPicker from 'expo-document-picker';
// import * as ImagePicker from 'expo-image-picker';
// import { colors } from '../theme/colors';
// import { api } from '../api/client';

// interface Document {
//   uri: string;
//   name: string;
//   size: number;
//   type: string;
// }

// const RECORD_TYPES = [
//   { label: 'Meeting Minutes', value: 'meeting_minutes' },
//   { label: 'Financial Report', value: 'financial_report' },
//   { label: 'Constitution', value: 'constitution' },
//   { label: 'Member List', value: 'member_list' },
//   { label: 'Other', value: 'other' },
// ];

// export function AddRecordsScreen({ route, navigation }: any) {
//   const { groupId } = route.params || {};

//   // State
//   const [document, setDocument] = useState<Document | null>(null);
//   const [uploading, setUploading] = useState(false);
//   const [recordName, setRecordName] = useState('');
//   const [description, setDescription] = useState('');
//   const [selectedRecordType, setSelectedRecordType] = useState('other');
//   const [showRecordTypeDropdown, setShowRecordTypeDropdown] = useState(false);
//   const [showTextInput, setShowTextInput] = useState(false);
//   const [textTitle, setTextTitle] = useState('');
//   const [textContent, setTextContent] = useState('');
//   const [textContentForSubmit, setTextContentForSubmit] = useState('');

//   if (!groupId) {
//     Alert.alert('Error', 'Group ID is missing');
//     navigation.goBack();
//     return null;
//   }

//   const pickDocument = async () => {
//     try {
//       const result = await DocumentPicker.getDocumentAsync({
//         type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
//         copyToCacheDirectory: true,
//       });

//       if (!result.canceled && result.assets && result.assets.length > 0) {
//         const asset = result.assets[0];
//         setDocument({
//           uri: asset.uri,
//           name: asset.name || 'document',
//           size: asset.size || 0,
//           type: asset.mimeType || 'application/octet-stream',
//         });
//         Alert.alert('Success', `${asset.name} added successfully`);
//       }
//     } catch (error) {
//       console.error('Document pick error:', error);
//       Alert.alert('Error', 'Failed to pick document');
//     }
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
//         base64: true,
//       });

//       if (!result.canceled && result.assets && result.assets.length > 0) {
//         const asset = result.assets[0];
//         const fileName = 'photo_' + new Date().toISOString().replace(/[:.]/g, '-') + '.jpg';
//         setDocument({
//           uri: asset.uri,
//           name: fileName,
//           size: asset.fileSize || 0,
//           type: 'image/jpeg',
//         });
//         Alert.alert('Success', 'Photo captured successfully');
//       }
//     } catch (error) {
//       console.error('Camera error:', error);
//       Alert.alert('Error', 'Failed to open camera');
//     }
//   };

//   const handleAddTextRecord = () => {
//     if (!textTitle.trim()) {
//       Alert.alert('Error', 'Please enter a title');
//       return;
//     }
//     if (!textContent.trim()) {
//       Alert.alert('Error', 'Please enter some content');
//       return;
//     }

//     // Set the document
//     setDocument({
//       uri: '',
//       name: textTitle.trim() + '.txt',
//       size: textContent.length,
//       type: 'text/plain',
//     });
    
//     // Store the content for submission
//     setTextContentForSubmit(textContent.trim());
    
//     // Auto-fill the record name with the title
//     setRecordName(textTitle.trim());
    
//     // Close the text input modal
//     setTextTitle('');
//     setTextContent('');
//     setShowTextInput(false);
    
//     Alert.alert('Success', 'Text record added successfully! You can now submit it.');
//   };

//   const removeDocument = () => {
//     Alert.alert(
//       'Remove Document',
//       'Are you sure you want to remove this document?',
//       [
//         { text: 'Cancel', style: 'cancel' },
//         { 
//           text: 'Remove', 
//           style: 'destructive',
//           onPress: () => {
//             setDocument(null);
//             setTextContentForSubmit('');
//             setRecordName('');
//           }
//         },
//       ]
//     );
//   };

//   const resetForm = () => {
//     setDocument(null);
//     setRecordName('');
//     setDescription('');
//     setSelectedRecordType('other');
//     setTextContentForSubmit('');
//     setUploading(false);
//   };

//   const handleSubmit = async () => {
//     if (!document) {
//       Alert.alert('Error', 'Please select a document or write a note');
//       return;
//     }

//     if (!recordName.trim()) {
//       Alert.alert('Error', 'Please enter a record name');
//       return;
//     }

//     setUploading(true);

//     try {
//       const formData = new FormData();
      
//       let file;
      
//       // Handle text content
//       if (document.type === 'text/plain' && document.uri === '') {
//         const blob = new Blob([textContentForSubmit], { type: 'text/plain' });
//         file = new File([blob], document.name, { type: 'text/plain' });
//       } else {
//         const response = await fetch(document.uri);
//         const blob = await response.blob();
//         file = new File([blob], document.name, { type: document.type || 'application/octet-stream' });
//       }
      
//       formData.append('file', file);
//       formData.append('record_name', recordName.trim());
//       formData.append('record_type', selectedRecordType);
//       if (description.trim()) {
//         formData.append('description', description.trim());
//       }

//       await api.post(`/groups/${groupId}/upload_record/`, formData, {
//         headers: {
//           'Content-Type': 'multipart/form-data',
//           'Accept': 'application/json',
//         },
//       });
      
//       // Show success and navigate back
//       Alert.alert(
//         '✅ Success!', 
//         `Record "${recordName}" uploaded successfully!`,
//         [
//           { 
//             text: 'OK', 
//             onPress: () => {
//               resetForm();
//               navigation.goBack();
//             }
//           }
//         ],
//         { cancelable: false }
//       );
//     } catch (error: any) {
//       console.error('Upload error:', error);
//       let errorMessage = 'Failed to upload record. Please try again.';
      
//       if (error?.response?.data) {
//         const data = error.response.data;
//         if (typeof data === 'object') {
//           const messages = [];
//           for (const [key, value] of Object.entries(data)) {
//             if (Array.isArray(value)) {
//               messages.push(`${key}: ${value.join(', ')}`);
//             }
//           }
//           if (messages.length > 0) {
//             errorMessage = messages.join('\n');
//           }
//         }
//       }
      
//       Alert.alert('Error', errorMessage);
//       setUploading(false);
//     } finally {
//       setUploading(false);
//     }
//   };

//   const getSelectedRecordTypeLabel = () => {
//     const found = RECORD_TYPES.find(t => t.value === selectedRecordType);
//     return found ? found.label : 'Select record type';
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <KeyboardAvoidingView
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         style={styles.container}
//       >
//         <ScrollView 
//           contentContainerStyle={styles.scrollContent}
//           keyboardShouldPersistTaps="handled"
//         >
//           <View style={styles.header}>
//             <Text style={styles.title}>Add Records</Text>
//             <Text style={styles.subtitle}>Upload documents or write notes to ECORET</Text>
//           </View>

//           {/* Form Fields */}
//           <View style={styles.section}>
//             <Text style={styles.sectionTitle}>Record Details</Text>
            
//             <View style={styles.field}>
//               <Text style={styles.label}>Record Name *</Text>
//               <TextInput
//                 style={styles.input}
//                 value={recordName}
//                 onChangeText={setRecordName}
//                 placeholder="Enter record name"
//                 placeholderTextColor={colors.secondary}
//               />
//             </View>

//             <View style={styles.field}>
//               <Text style={styles.label}>Record Type *</Text>
//               <TouchableOpacity
//                 style={styles.dropdownButton}
//                 onPress={() => setShowRecordTypeDropdown(!showRecordTypeDropdown)}
//                 activeOpacity={0.7}
//               >
//                 <Text style={styles.dropdownButtonText}>
//                   {getSelectedRecordTypeLabel()}
//                 </Text>
//                 <Text style={styles.dropdownArrow}>▼</Text>
//               </TouchableOpacity>
//             </View>

//             <View style={styles.field}>
//               <Text style={styles.label}>Description</Text>
//               <TextInput
//                 style={[styles.input, styles.textArea]}
//                 value={description}
//                 onChangeText={setDescription}
//                 placeholder="Optional description"
//                 placeholderTextColor={colors.secondary}
//                 multiline
//                 numberOfLines={3}
//               />
//             </View>
//           </View>

//           {/* Upload Options */}
//           <View style={styles.section}>
//             <Text style={styles.sectionTitle}>Upload Document</Text>
            
//             <View style={styles.uploadOptions}>
//               <TouchableOpacity 
//                 style={[styles.uploadOption, styles.uploadDocument]} 
//                 onPress={pickDocument}
//                 activeOpacity={0.7}
//               >
//                 <Text style={styles.uploadOptionIcon}>📄</Text>
//                 <Text style={styles.uploadOptionText}>Choose Document</Text>
//                 <Text style={styles.uploadOptionSubtext}>PDF, Word, Images</Text>
//               </TouchableOpacity>

//               <TouchableOpacity 
//                 style={[styles.uploadOption, styles.uploadPhoto]} 
//                 onPress={takePhoto}
//                 activeOpacity={0.7}
//               >
//                 <Text style={styles.uploadOptionIcon}>📷</Text>
//                 <Text style={styles.uploadOptionText}>Take Photo</Text>
//                 <Text style={styles.uploadOptionSubtext}>Capture with camera</Text>
//               </TouchableOpacity>

//               <TouchableOpacity 
//                 style={[styles.uploadOption, styles.uploadText]} 
//                 onPress={() => setShowTextInput(true)}
//                 activeOpacity={0.7}
//               >
//                 <Text style={styles.uploadOptionIcon}>✍️</Text>
//                 <Text style={styles.uploadOptionText}>Write Note</Text>
//                 <Text style={styles.uploadOptionSubtext}>Type text content</Text>
//               </TouchableOpacity>
//             </View>
//           </View>

//           {/* Text Input Modal */}
//           {showTextInput && (
//             <View style={styles.textInputContainer}>
//               <View style={styles.textInputHeader}>
//                 <Text style={styles.textInputTitle}>Write Note</Text>
//                 <TouchableOpacity 
//                   onPress={() => {
//                     setShowTextInput(false);
//                     setTextTitle('');
//                     setTextContent('');
//                   }}
//                   activeOpacity={0.7}
//                 >
//                   <Text style={styles.textInputClose}>✕</Text>
//                 </TouchableOpacity>
//               </View>

//               <View style={styles.field}>
//                 <Text style={styles.label}>Title *</Text>
//                 <TextInput
//                   style={styles.input}
//                   value={textTitle}
//                   onChangeText={setTextTitle}
//                   placeholder="Enter record title"
//                   placeholderTextColor={colors.secondary}
//                 />
//               </View>

//               <View style={styles.field}>
//                 <Text style={styles.label}>Content *</Text>
//                 <TextInput
//                   style={[styles.input, styles.textArea]}
//                   value={textContent}
//                   onChangeText={setTextContent}
//                   placeholder="Write your notes here..."
//                   placeholderTextColor={colors.secondary}
//                   multiline
//                   numberOfLines={4}
//                   textAlignVertical="top"
//                 />
//               </View>

//               <View style={styles.textInputActions}>
//                 <TouchableOpacity
//                   style={[styles.button, styles.cancelButton]}
//                   onPress={() => {
//                     setShowTextInput(false);
//                     setTextTitle('');
//                     setTextContent('');
//                   }}
//                   activeOpacity={0.7}
//                 >
//                   <Text style={styles.cancelButtonText}>Cancel</Text>
//                 </TouchableOpacity>
//                 <TouchableOpacity
//                   style={[styles.button, styles.saveButton]}
//                   onPress={handleAddTextRecord}
//                   activeOpacity={0.7}
//                 >
//                   <Text style={styles.saveButtonText}>Add Note</Text>
//                 </TouchableOpacity>
//               </View>
//             </View>
//           )}

//           {/* Selected Document */}
//           {document && (
//             <View style={styles.section}>
//               <View style={styles.documentHeader}>
//                 <Text style={styles.sectionTitle}>Selected Document</Text>
//                 <TouchableOpacity 
//                   onPress={removeDocument}
//                   activeOpacity={0.7}
//                 >
//                   <Text style={styles.removeText}>Remove</Text>
//                 </TouchableOpacity>
//               </View>

//               <View style={styles.documentCard}>
//                 <Text style={styles.documentIcon}>📎</Text>
//                 <View style={styles.documentInfo}>
//                   <Text style={styles.documentName} numberOfLines={1}>{document.name}</Text>
//                   <Text style={styles.documentSize}>
//                     {(document.size / 1024).toFixed(2)} KB
//                   </Text>
//                 </View>
//                 <TouchableOpacity
//                   style={styles.documentRemoveButton}
//                   onPress={removeDocument}
//                   activeOpacity={0.7}
//                 >
//                   <Text style={styles.documentRemoveText}>✕</Text>
//                 </TouchableOpacity>
//               </View>
//             </View>
//           )}

//           {/* Submit Button */}
//           <TouchableOpacity
//             style={[
//               styles.submitButton,
//               (!recordName.trim() || !document) && styles.disabledButton
//             ]}
//             onPress={handleSubmit}
//             disabled={uploading || !recordName.trim() || !document}
//             activeOpacity={0.7}
//           >
//             {uploading ? (
//               <View style={styles.loadingContainer}>
//                 <ActivityIndicator color="#fff" size="small" />
//                 <Text style={styles.submitButtonText}> Uploading...</Text>
//               </View>
//             ) : (
//               <Text style={styles.submitButtonText}>
//                 Submit Record to ECORET
//               </Text>
//             )}
//           </TouchableOpacity>

//           {/* Info Box */}
//           <View style={styles.infoBox}>
//             <Text style={styles.infoTitle}>📌 What happens next?</Text>
//             <Text style={styles.infoText}>• Records are sent to ECORET administrators</Text>
//             <Text style={styles.infoText}>• You'll receive a notification when reviewed</Text>
//             <Text style={styles.infoText}>• Keep records for your group's reference</Text>
//           </View>
//         </ScrollView>
//       </KeyboardAvoidingView>

//       {/* Dropdown Modal */}
//       <Modal
//         visible={showRecordTypeDropdown}
//         transparent
//         animationType="fade"
//         onRequestClose={() => setShowRecordTypeDropdown(false)}
//       >
//         <TouchableOpacity
//           style={styles.modalOverlay}
//           activeOpacity={1}
//           onPress={() => setShowRecordTypeDropdown(false)}
//         >
//           <View style={styles.modalContent}>
//             <View style={styles.modalHeader}>
//               <Text style={styles.modalTitle}>Select Record Type</Text>
//               <TouchableOpacity
//                 onPress={() => setShowRecordTypeDropdown(false)}
//                 activeOpacity={0.7}
//               >
//                 <Text style={styles.modalClose}>✕</Text>
//               </TouchableOpacity>
//             </View>
//             {RECORD_TYPES.map((type) => (
//               <TouchableOpacity
//                 key={type.value}
//                 style={[
//                   styles.modalItem,
//                   selectedRecordType === type.value && styles.modalItemSelected,
//                 ]}
//                 onPress={() => {
//                   setSelectedRecordType(type.value);
//                   setShowRecordTypeDropdown(false);
//                 }}
//                 activeOpacity={0.7}
//               >
//                 <Text style={[
//                   styles.modalItemText,
//                   selectedRecordType === type.value && styles.modalItemTextSelected,
//                 ]}>
//                   {type.label}
//                 </Text>
//                 {selectedRecordType === type.value && (
//                   <Text style={styles.modalCheck}>✓</Text>
//                 )}
//               </TouchableOpacity>
//             ))}
//           </View>
//         </TouchableOpacity>
//       </Modal>
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
//     paddingBottom: 40,
//   },
//   header: {
//     marginBottom: 20,
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: colors.text,
//   },
//   subtitle: {
//     fontSize: 14,
//     color: colors.secondary,
//     marginTop: 4,
//   },
//   section: {
//     backgroundColor: colors.surface,
//     borderRadius: 12,
//     padding: 16,
//     marginBottom: 16,
//     borderWidth: 1,
//     borderColor: colors.border,
//   },
//   sectionTitle: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: colors.text,
//     marginBottom: 12,
//   },
//   field: {
//     marginBottom: 12,
//   },
//   label: {
//     fontSize: 14,
//     fontWeight: '500',
//     color: colors.text,
//     marginBottom: 4,
//   },
//   input: {
//     borderWidth: 1,
//     borderColor: colors.border,
//     borderRadius: 8,
//     padding: 12,
//     fontSize: 16,
//     color: colors.text,
//     backgroundColor: colors.background,
//   },
//   textArea: {
//     minHeight: 80,
//     textAlignVertical: 'top',
//   },
//   dropdownButton: {
//     borderWidth: 1,
//     borderColor: colors.border,
//     borderRadius: 8,
//     padding: 12,
//     backgroundColor: colors.background,
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   dropdownButtonText: {
//     fontSize: 16,
//     color: colors.text,
//   },
//   dropdownArrow: {
//     fontSize: 16,
//     color: colors.secondary,
//   },
//   uploadOptions: {
//     flexDirection: 'row',
//     gap: 10,
//   },
//   uploadOption: {
//     flex: 1,
//     backgroundColor: colors.background,
//     borderRadius: 12,
//     padding: 14,
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: colors.border,
//     minHeight: 80,
//   },
//   uploadDocument: {
//     borderTopColor: colors.primary,
//     borderTopWidth: 3,
//   },
//   uploadPhoto: {
//     borderTopColor: colors.accent,
//     borderTopWidth: 3,
//   },
//   uploadText: {
//     borderTopColor: colors.success,
//     borderTopWidth: 3,
//   },
//   uploadOptionIcon: {
//     fontSize: 24,
//     marginBottom: 4,
//   },
//   uploadOptionText: {
//     fontSize: 12,
//     fontWeight: '600',
//     color: colors.text,
//   },
//   uploadOptionSubtext: {
//     fontSize: 10,
//     color: colors.secondary,
//     marginTop: 2,
//     textAlign: 'center',
//   },
//   textInputContainer: {
//     backgroundColor: colors.surface,
//     borderRadius: 12,
//     padding: 16,
//     marginBottom: 16,
//     borderWidth: 1,
//     borderColor: colors.border,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   textInputHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 16,
//   },
//   textInputTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: colors.text,
//   },
//   textInputClose: {
//     fontSize: 20,
//     color: colors.secondary,
//     padding: 4,
//   },
//   textInputActions: {
//     flexDirection: 'row',
//     gap: 8,
//     marginTop: 8,
//   },
//   button: {
//     flex: 1,
//     padding: 12,
//     borderRadius: 8,
//     alignItems: 'center',
//   },
//   cancelButton: {
//     backgroundColor: '#f3f4f6',
//   },
//   cancelButtonText: {
//     color: colors.text,
//     fontWeight: '600',
//   },
//   saveButton: {
//     backgroundColor: colors.primary,
//   },
//   saveButtonText: {
//     color: '#fff',
//     fontWeight: '600',
//   },
//   documentHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   removeText: {
//     fontSize: 14,
//     color: colors.error,
//     fontWeight: '500',
//   },
//   documentCard: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: colors.background,
//     padding: 12,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: colors.border,
//   },
//   documentIcon: {
//     fontSize: 24,
//     marginRight: 12,
//   },
//   documentInfo: {
//     flex: 1,
//   },
//   documentName: {
//     fontSize: 14,
//     color: colors.text,
//     fontWeight: '500',
//   },
//   documentSize: {
//     fontSize: 12,
//     color: colors.secondary,
//     marginTop: 2,
//   },
//   documentRemoveButton: {
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//   },
//   documentRemoveText: {
//     color: colors.error,
//     fontSize: 18,
//     fontWeight: 'bold',
//   },
//   submitButton: {
//     backgroundColor: colors.primary,
//     padding: 16,
//     borderRadius: 12,
//     alignItems: 'center',
//     marginTop: 8,
//   },
//   disabledButton: {
//     backgroundColor: colors.secondary,
//     opacity: 0.5,
//   },
//   loadingContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   submitButtonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   infoBox: {
//     backgroundColor: '#f0fdf4',
//     borderRadius: 12,
//     padding: 16,
//     marginTop: 12,
//     borderWidth: 1,
//     borderColor: '#bbf7d0',
//   },
//   infoTitle: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#166534',
//     marginBottom: 8,
//   },
//   infoText: {
//     fontSize: 13,
//     color: '#166534',
//     marginBottom: 4,
//     paddingLeft: 8,
//   },
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 20,
//   },
//   modalContent: {
//     backgroundColor: colors.surface,
//     borderRadius: 16,
//     padding: 20,
//     width: '100%',
//     maxWidth: 400,
//     maxHeight: '80%',
//   },
//   modalHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 16,
//     paddingBottom: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: colors.border,
//   },
//   modalTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: colors.text,
//   },
//   modalClose: {
//     fontSize: 20,
//     color: colors.secondary,
//     padding: 4,
//   },
//   modalItem: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingVertical: 14,
//     paddingHorizontal: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: colors.border,
//   },
//   modalItemSelected: {
//     backgroundColor: colors.primary + '15',
//     borderRadius: 8,
//   },
//   modalItemText: {
//     fontSize: 16,
//     color: colors.text,
//   },
//   modalItemTextSelected: {
//     color: colors.primary,
//     fontWeight: '600',
//   },
//   modalCheck: {
//     fontSize: 16,
//     color: colors.primary,
//     fontWeight: 'bold',
//   },
// });

// src/screens/AddRecordsScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  RefreshControl,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../theme/colors';
import { api } from '../api/client';
import { groupAPI } from '../api/endpoints';

interface Document {
  uri: string;
  name: string;
  size: number;
  type: string;
}

interface Record {
  id: string;
  record_name: string;
  record_type: string;
  description: string;
  uploaded_at: string;
  file: string;
}

const RECORD_TYPES = [
  { label: 'Meeting Minutes', value: 'meeting_minutes' },
  { label: 'Financial Report', value: 'financial_report' },
  { label: 'Constitution', value: 'constitution' },
  { label: 'Member List', value: 'member_list' },
  { label: 'Other', value: 'other' },
];

export function AddRecordsScreen({ route, navigation }: any) {
  const { groupId } = route.params || {};

  const [document, setDocument] = useState<Document | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recordName, setRecordName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedRecordType, setSelectedRecordType] = useState('other');
  const [showRecordTypeDropdown, setShowRecordTypeDropdown] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [textContentForSubmit, setTextContentForSubmit] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const [sentRecords, setSentRecords] = useState<Record[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSentRecords, setShowSentRecords] = useState(false);

  if (!groupId) {
    Alert.alert('Error', 'Group ID is missing');
    navigation.goBack();
    return null;
  }

  const loadSentRecords = async () => {
    try {
      setLoadingRecords(true);
      const response = await groupAPI.getRecords(groupId);
      console.log('Sent records response:', response.data);
      
      let recordsData = [];
      if (Array.isArray(response.data)) {
        recordsData = response.data;
      } else if (response.data?.results) {
        recordsData = response.data.results;
      }
      setSentRecords(recordsData);
    } catch (error) {
      console.error('Failed to load sent records:', error);
      setSentRecords([]);
    } finally {
      setLoadingRecords(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (showSentRecords) {
      loadSentRecords();
    }
  }, [showSentRecords]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSentRecords();
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setDocument({
          uri: asset.uri,
          name: asset.name || 'document',
          size: asset.size || 0,
          type: asset.mimeType || 'application/octet-stream',
        });
        Alert.alert('Success', `${asset.name} added successfully`);
      }
    } catch (error) {
      console.error('Document pick error:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photo');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileName = 'photo_' + new Date().toISOString().replace(/[:.]/g, '-') + '.jpg';
        setDocument({
          uri: asset.uri,
          name: fileName,
          size: asset.fileSize || 0,
          type: 'image/jpeg',
        });
        Alert.alert('Success', 'Photo captured successfully');
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  const handleAddTextRecord = () => {
    if (!textTitle.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    if (!textContent.trim()) {
      Alert.alert('Error', 'Please enter some content');
      return;
    }

    setDocument({
      uri: '',
      name: textTitle.trim() + '.txt',
      size: textContent.length,
      type: 'text/plain',
    });
    
    setTextContentForSubmit(textContent.trim());
    setRecordName(textTitle.trim());
    
    setTextTitle('');
    setTextContent('');
    setShowTextInput(false);
    
    Alert.alert('Success', 'Text record added successfully! You can now submit it.');
  };

  const removeDocument = () => {
    Alert.alert(
      'Remove Document',
      'Are you sure you want to remove this document?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            setDocument(null);
            setTextContentForSubmit('');
            setRecordName('');
          }
        },
      ]
    );
  };

  const resetForm = () => {
    setDocument(null);
    setRecordName('');
    setDescription('');
    setSelectedRecordType('other');
    setTextContentForSubmit('');
    setUploading(false);
    setIsSuccess(false);
  };

  const handleSubmit = async () => {
    if (!document) {
      Alert.alert('Error', 'Please select a document or write a note');
      return;
    }

    if (!recordName.trim()) {
      Alert.alert('Error', 'Please enter a record name');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      
      let file;
      
      if (document.type === 'text/plain' && document.uri === '') {
        const blob = new Blob([textContentForSubmit], { type: 'text/plain' });
        file = new File([blob], document.name, { type: 'text/plain' });
      } else {
        const response = await fetch(document.uri);
        const blob = await response.blob();
        file = new File([blob], document.name, { type: document.type || 'application/octet-stream' });
      }
      
      formData.append('file', file);
      formData.append('record_name', recordName.trim());
      formData.append('record_type', selectedRecordType);
      if (description.trim()) {
        formData.append('description', description.trim());
      }

      await api.post(`/groups/${groupId}/upload_record/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json',
        },
      });
      
      setIsSuccess(true);
      resetForm();
      await loadSentRecords();
      
      Alert.alert(
        '✅ Success!', 
        `Record "${recordName}" uploaded successfully!`,
        [
          { 
            text: 'View Sent Records', 
            onPress: () => {
              setShowSentRecords(true);
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('Upload error:', error);
      let errorMessage = 'Failed to upload record. Please try again.';
      
      if (error?.response?.data) {
        const data = error.response.data;
        if (typeof data === 'object') {
          const messages = [];
          for (const [key, value] of Object.entries(data)) {
            if (Array.isArray(value)) {
              messages.push(`${key}: ${value.join(', ')}`);
            }
          }
          if (messages.length > 0) {
            errorMessage = messages.join('\n');
          }
        }
      }
      
      Alert.alert('Error', errorMessage);
      setUploading(false);
    } finally {
      setUploading(false);
    }
  };

  const getSelectedRecordTypeLabel = () => {
    const found = RECORD_TYPES.find(t => t.value === selectedRecordType);
    return found ? found.label : 'Select record type';
  };

  const getRecordTypeLabel = (value: string) => {
    const found = RECORD_TYPES.find(t => t.value === value);
    return found ? found.label : value;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return dateString;
    }
  };

  const renderRecordItem = ({ item }: { item: Record }) => (
    <View style={styles.recordCard}>
      <View style={styles.recordIcon}>
        <Icon name="document-text-outline" size={24} color="#fff" />
      </View>
      <View style={styles.recordInfo}>
        <Text style={styles.recordName}>{item.record_name}</Text>
        <Text style={styles.recordType}>{getRecordTypeLabel(item.record_type)}</Text>
        {item.description && (
          <Text style={styles.recordDescription} numberOfLines={1}>{item.description}</Text>
        )}
        <Text style={styles.recordDate}>{formatDate(item.uploaded_at)}</Text>
      </View>
      <View style={styles.recordStatus}>
        <View style={styles.sentBadge}>
          <Text style={styles.sentBadgeText}>✓ Sent</Text>
        </View>
      </View>
    </View>
  );

  if (showSentRecords) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.blueHeader}>
          <TouchableOpacity
            style={styles.headerBackButton}
            onPress={() => {
              setShowSentRecords(false);
              resetForm();
            }}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitleWhite}>Sent Records</Text>
            <Text style={styles.headerSubtitleWhite}>{sentRecords.length} records sent</Text>
          </View>
          <TouchableOpacity
            style={styles.headerNewButton}
            onPress={() => {
              setShowSentRecords(false);
              resetForm();
            }}
            activeOpacity={0.7}
          >
            <Icon name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={sentRecords}
          renderItem={renderRecordItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.recordsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon name="document-text-outline" size={48} color={colors.secondary} />
              <Text style={styles.emptyTitle}>No records sent yet</Text>
              <Text style={styles.emptySubtext}>Tap the + button to create a new record</Text>
            </View>
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.blueHeader}>
            <TouchableOpacity
              style={styles.headerBackButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Icon name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitleWhite}>Add Records</Text>
              <Text style={styles.headerSubtitleWhite}>Upload documents or write notes</Text>
            </View>
            <TouchableOpacity
              style={styles.headerSentButton}
              onPress={() => setShowSentRecords(true)}
              activeOpacity={0.7}
            >
              <Icon name="folder-open-outline" size={20} color="#FFFFFF" />
              <Text style={styles.headerSentText}>Sent</Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields with Shadows */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Record Details</Text>
            
            <View style={styles.field}>
              <Text style={styles.label}>Record Name *</Text>
              <View style={styles.shadowContainer}>
                <TextInput
                  style={[styles.input, styles.inputWithShadow]}
                  value={recordName}
                  onChangeText={setRecordName}
                  placeholder="Enter record name"
                  placeholderTextColor={colors.secondary}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Record Type *</Text>
              <View style={styles.shadowContainer}>
                <TouchableOpacity
                  style={[styles.dropdownButton, styles.inputWithShadow]}
                  onPress={() => setShowRecordTypeDropdown(!showRecordTypeDropdown)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dropdownButtonText}>
                    {getSelectedRecordTypeLabel()}
                  </Text>
                  <Icon name="chevron-down" size={20} color={colors.secondary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <View style={styles.shadowContainer}>
                <TextInput
                  style={[styles.input, styles.inputWithShadow, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Optional description"
                  placeholderTextColor={colors.secondary}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
          </View>

          {/* Upload Options */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upload Document</Text>
            
            <View style={styles.uploadOptions}>
              <TouchableOpacity 
                style={[styles.uploadOption, styles.uploadDocument, styles.uploadOptionWithShadow]} 
                onPress={pickDocument}
                activeOpacity={0.7}
              >
                <Text style={styles.uploadOptionIcon}>📄</Text>
                <Text style={styles.uploadOptionText}>Choose</Text>
                <Text style={styles.uploadOptionSubtext}>Document</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.uploadOption, styles.uploadPhoto, styles.uploadOptionWithShadow]} 
                onPress={takePhoto}
                activeOpacity={0.7}
              >
                <Text style={styles.uploadOptionIcon}>📷</Text>
                <Text style={styles.uploadOptionText}>Take</Text>
                <Text style={styles.uploadOptionSubtext}>Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.uploadOption, styles.uploadText, styles.uploadOptionWithShadow]} 
                onPress={() => setShowTextInput(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.uploadOptionIcon}>✍️</Text>
                <Text style={styles.uploadOptionText}>Write</Text>
                <Text style={styles.uploadOptionSubtext}>Note</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Text Input Modal */}
          {showTextInput && (
            <View style={[styles.textInputContainer, styles.shadowContainer]}>
              <View style={styles.textInputHeader}>
                <Text style={styles.textInputTitle}>Write Note</Text>
                <TouchableOpacity 
                  onPress={() => {
                    setShowTextInput(false);
                    setTextTitle('');
                    setTextContent('');
                  }}
                  activeOpacity={0.7}
                >
                  <Icon name="close" size={24} color={colors.secondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Title *</Text>
                <View style={styles.shadowContainer}>
                  <TextInput
                    style={[styles.input, styles.inputWithShadow]}
                    value={textTitle}
                    onChangeText={setTextTitle}
                    placeholder="Enter record title"
                    placeholderTextColor={colors.secondary}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Content *</Text>
                <View style={styles.shadowContainer}>
                  <TextInput
                    style={[styles.input, styles.inputWithShadow, styles.textArea]}
                    value={textContent}
                    onChangeText={setTextContent}
                    placeholder="Write your notes here..."
                    placeholderTextColor={colors.secondary}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              </View>

              <View style={styles.textInputActions}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => {
                    setShowTextInput(false);
                    setTextTitle('');
                    setTextContent('');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={handleAddTextRecord}
                  activeOpacity={0.7}
                >
                  <Text style={styles.saveButtonText}>Add Note</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Selected Document */}
          {document && (
            <View style={styles.section}>
              <View style={styles.documentHeader}>
                <Text style={styles.sectionTitle}>Selected Document</Text>
                <TouchableOpacity 
                  onPress={removeDocument}
                  activeOpacity={0.7}
                >
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.documentCard, styles.shadowContainer]}>
                <Text style={styles.documentIcon}>📎</Text>
                <View style={styles.documentInfo}>
                  <Text style={styles.documentName} numberOfLines={1}>{document.name}</Text>
                  <Text style={styles.documentSize}>
                    {(document.size / 1024).toFixed(2)} KB
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.documentRemoveButton}
                  onPress={removeDocument}
                  activeOpacity={0.7}
                >
                  <Icon name="close-circle" size={22} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!recordName.trim() || !document) && styles.disabledButton
            ]}
            onPress={handleSubmit}
            disabled={uploading || !recordName.trim() || !document || isSuccess}
            activeOpacity={0.7}
          >
            {uploading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.submitButtonText}> Uploading...</Text>
              </View>
            ) : isSuccess ? (
              <Text style={styles.submitButtonText}>✅ Sent Successfully</Text>
            ) : (
              <Text style={styles.submitButtonText}>
                Submit to ECORET
              </Text>
            )}
          </TouchableOpacity>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Icon name="information-circle-outline" size={20} color="#059669" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>What happens next?</Text>
              <Text style={styles.infoText}>• Records are sent to ECORET administrators</Text>
              <Text style={styles.infoText}>• You'll receive a notification when reviewed</Text>
              <Text style={styles.infoText}>• View all sent records in the "Sent" tab</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Record Type Dropdown Modal */}
      <Modal
        visible={showRecordTypeDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRecordTypeDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowRecordTypeDropdown(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Record Type</Text>
              <TouchableOpacity
                onPress={() => setShowRecordTypeDropdown(false)}
                activeOpacity={0.7}
              >
                <Icon name="close" size={24} color={colors.secondary} />
              </TouchableOpacity>
            </View>
            {RECORD_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.modalItem,
                  selectedRecordType === type.value && styles.modalItemSelected,
                ]}
                onPress={() => {
                  setSelectedRecordType(type.value);
                  setShowRecordTypeDropdown(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.modalItemText,
                  selectedRecordType === type.value && styles.modalItemTextSelected,
                ]}>
                  {type.label}
                </Text>
                {selectedRecordType === type.value && (
                  <Icon name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  // Blue Header Styles
  blueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '30',
  },
  headerBackButton: {
    padding: 4,
    marginRight: 12,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitleWhite: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitleWhite: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 2,
  },
  headerSentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  headerSentText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  headerNewButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Shadow Container
  shadowContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  field: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: '#FFFFFF',
  },
  inputWithShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: colors.text,
  },
  uploadOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  uploadOption: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 70,
  },
  uploadOptionWithShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  uploadDocument: {
    borderTopColor: colors.primary,
    borderTopWidth: 3,
  },
  uploadPhoto: {
    borderTopColor: colors.accent,
    borderTopWidth: 3,
  },
  uploadText: {
    borderTopColor: colors.success,
    borderTopWidth: 3,
  },
  uploadOptionIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  uploadOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  uploadOptionSubtext: {
    fontSize: 9,
    color: colors.secondary,
    marginTop: 2,
    textAlign: 'center',
  },
  textInputContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textInputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  textInputTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  textInputActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  removeText: {
    fontSize: 14,
    color: colors.error,
    fontWeight: '500',
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  documentIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  documentSize: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 2,
  },
  documentRemoveButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  submitButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: colors.secondary,
    opacity: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#166534',
    marginBottom: 3,
    paddingLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalItemSelected: {
    backgroundColor: colors.primary + '15',
    borderRadius: 8,
  },
  modalItemText: {
    fontSize: 16,
    color: colors.text,
  },
  modalItemTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  // Sent Records Styles
  recordsList: {
    padding: 16,
    paddingBottom: 80,
  },
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  recordIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recordInfo: {
    flex: 1,
  },
  recordName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  recordType: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 2,
  },
  recordDescription: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 2,
  },
  recordDate: {
    fontSize: 11,
    color: colors.secondary,
    marginTop: 2,
  },
  recordStatus: {
    alignItems: 'flex-end',
  },
  sentBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sentBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#16A34A',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.secondary,
    marginTop: 4,
    textAlign: 'center',
  },
});