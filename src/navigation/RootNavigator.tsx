// // src/navigation/RootNavigator.tsx

// import { createNativeStackNavigator } from '@react-navigation/native-stack'
// import { ActivityIndicator, View } from 'react-native'
// import { useAuth } from '../auth/AuthContext'
// import { colors } from '../theme/colors'

// // Auth flow
// import {SplashScreen} from '../screens/SplashScreen'
// import {RoleSelectScreen} from '../screens/RoleSelectScreen'
// import RegisterScreen from '../screens/RegisterScreen'
// import LoginScreen from '../screens/LoginScreen'
// import {PendingApprovalScreen} from '../screens/PendingApprovalScreen'

// // Home + feature screens
// import HomeScreen from '../screens/HomeScreen'
// import LogoutScreen from '../screens/LogoutScreen'
// import GroupDetailScreen from '../screens/GroupDetailsScreen'
// import {AddRecordsScreen} from '../screens/AddRecordsScreen'
// import {MemberRegistrationScreen} from '../screens/MemberRegistrationScreen'
// import MembersManagementScreen from '../screens/MembersManagementScreen'  // ✅ ADD THIS
// import {BankDetailsScreen} from '../screens/BankDetailsScreen'
// import {ReportsScreen} from '../screens/ReportsScreen'
// import {SavingsScreen} from '../screens/SavingsScreen'
// import LoanRepaymentScreen from '../screens/LoanRepaymentScreen'
// import AttendanceScreen from '../screens/AttendanceScreen'
// import GroupLedgerScreen from '../screens/GroupLedgerScreen'
// import NotificationsScreen from '../screens/NotificationsScreen'
// import ProfileScreen from '../screens/ProfileScreen'

// // Loans flow
// import LoansScreen from '../screens/LoansScreen'
// import {LoanRequestScreen} from '../screens/LoanRequestScreen'
// import {LoanApprovalScreen} from '../screens/LoanApprovalScreen'
// import LoanDisbursementScreen from '../screens/LoanDisbursementScreen'
// import {LoanDetailsScreen} from '../screens/LoanDetailsScreen'

// const Stack = createNativeStackNavigator()

// export function RootNavigator() {
//   const { user, isLoading } = useAuth()

//   console.log('🔍 RootNavigator - User:', user)
//   console.log('🔍 RootNavigator - IsLoading:', isLoading)

//   if (isLoading) {
//     return (
//       <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
//         <ActivityIndicator size="large" color={colors.primary} />
//       </View>
//     )
//   }

//   const isPendingAdmin = user && user.role === 'admin' && user.is_approved === false

//   return (
//     <Stack.Navigator screenOptions={{ headerShown: false }}>
//       {!user ? (
//         // ✅ Unauthenticated screens
//         <>
//           <Stack.Screen name="Splash" component={SplashScreen} />
//           <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
//           <Stack.Screen name="Register" component={RegisterScreen} />
//           <Stack.Screen name="Login" component={LoginScreen} />
//         </>
//       ) : isPendingAdmin ? (
//         // ✅ Pending approval screen
//         <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
//       ) : (
//         // ✅ Authenticated screens
//         <>
//           <Stack.Screen name="Home" component={HomeScreen} />
//           <Stack.Screen 
//             name="Logout" 
//             component={LogoutScreen} 
//             options={{ 
//               presentation: 'modal',
//               headerShown: false,
//             }}
//           />
//           <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
//           <Stack.Screen name="AddRecords" component={AddRecordsScreen} />
          
//           {/* ✅ Member Management Screens */}
//           <Stack.Screen 
//             name="MembersManagement" 
//             component={MembersManagementScreen} 
//             options={{ headerShown: false }}
//           />
//           <Stack.Screen 
//             name="MemberRegistration" 
//             component={MemberRegistrationScreen} 
//             options={{ headerShown: false }}
//           />
          
//           <Stack.Screen name="BankDetails" component={BankDetailsScreen} />
//           <Stack.Screen name="Reports" component={ReportsScreen} />
//           <Stack.Screen name="Savings" component={SavingsScreen} />
//           <Stack.Screen name="LoanRepayments" component={LoanRepaymentScreen} />
//           <Stack.Screen name="Attendance" component={AttendanceScreen} />
//           <Stack.Screen name="GroupLedger" component={GroupLedgerScreen} />
//           <Stack.Screen name="Notifications" component={NotificationsScreen} />
//           <Stack.Screen name="Profile" component={ProfileScreen} />
//           <Stack.Screen name="Loans" component={LoansScreen} />
//           <Stack.Screen name="LoanRequest" component={LoanRequestScreen} />
//           <Stack.Screen name="LoanApproval" component={LoanApprovalScreen} />
//           <Stack.Screen name="LoanDisbursement" component={LoanDisbursementScreen} />
//           <Stack.Screen name="LoanDetails" component={LoanDetailsScreen} />
//         </>
//       )}
//     </Stack.Navigator>
//   )
// }






// src/navigation/RootNavigator.tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '../auth/AuthContext'
import { colors } from '../theme/colors'

import {SplashScreen} from '../screens/SplashScreen'
import {RoleSelectScreen} from '../screens/RoleSelectScreen'
import RegisterScreen from '../screens/RegisterScreen'
import LoginScreen from '../screens/LoginScreen'
import {PendingApprovalScreen} from '../screens/PendingApprovalScreen'
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen'
import ResetPasswordScreen from '../screens/ResetPasswordScreen'
import HomeScreen from '../screens/HomeScreen'
// import LogoutScreen from '../screens/LogoutScreen'
import GroupDetailScreen from '../screens/GroupDetailsScreen'
import {AddRecordsScreen} from '../screens/AddRecordsScreen'
import MemberRegistrationScreen from '../screens/MemberRegistrationScreen'
import MembersManagementScreen from '../screens/MembersManagementScreen'
import ReportGenerationScreen from '../screens/ReportGenerationScreen';
import ReportsListScreen from '../screens/ReportsListScreen';
import {BankDetailsScreen} from '../screens/BankDetailsScreen'
import {ReportsScreen} from '../screens/ReportsScreen'
import {SavingsScreen} from '../screens/SavingsScreen'
import LoanRepaymentScreen from '../screens/LoanRepaymentScreen'
import AttendanceScreen from '../screens/AttendanceScreen'
import GroupLedgerScreen from '../screens/GroupLedgerScreen'
import NotificationsScreen from '../screens/NotificationsScreen'
import ProfileScreen from '../screens/ProfileScreen'

// Loans flow
import LoansScreen from '../screens/LoansScreen'
import {LoanRequestScreen} from '../screens/LoanRequestScreen'
import {LoanApprovalScreen} from '../screens/LoanApprovalScreen'
import LoanDisbursementScreen from '../screens/LoanDisbursementScreen'
import {LoanDetailsScreen} from '../screens/LoanDetailsScreen'

const Stack = createNativeStackNavigator()

export function RootNavigator() {
  const { user, isLoading } = useAuth()

  console.log('🔍 RootNavigator - User:', user)
  console.log('🔍 RootNavigator - IsLoading:', isLoading)

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  const isPendingAdmin = user && user.role === 'admin' && user.is_approved === false

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </>
      ) : isPendingAdmin ? (
        <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
      ) : (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          {/* <Stack.Screen name="Logout" component={LogoutScreen} options={{ presentation: 'modal',headerShown: false,}}/> */}
          <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />          
          <Stack.Screen name="MembersManagement" component={MembersManagementScreen} options={{ headerShown: false }}/>
          <Stack.Screen name="ReportGeneration" component={ReportGenerationScreen} options={{ headerShown: false }}/>
          <Stack.Screen name="ReportsList" component={ReportsListScreen} options={{ headerShown: false }}/>
          <Stack.Screen name="MemberRegistration" component={MemberRegistrationScreen} options={{ headerShown: false }}/>
          <Stack.Screen name="AddRecords" component={AddRecordsScreen} options={{ headerShown: false }}/>
          <Stack.Screen name="BankDetails" component={BankDetailsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Reports" component={ReportsScreen} />
          <Stack.Screen name="Savings" component={SavingsScreen} />
          <Stack.Screen name="LoanRepayments" component={LoanRepaymentScreen} />
          <Stack.Screen name="Attendance" component={AttendanceScreen} />
          <Stack.Screen name="GroupLedger" component={GroupLedgerScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Loans" component={LoansScreen} />
          <Stack.Screen name="LoanRequest" component={LoanRequestScreen} />
          <Stack.Screen name="LoanApproval" component={LoanApprovalScreen} />
          <Stack.Screen name="LoanDisbursement" component={LoanDisbursementScreen} />
          <Stack.Screen name="LoanDetails" component={LoanDetailsScreen} />
        </>
      )}
    </Stack.Navigator>
  )
}