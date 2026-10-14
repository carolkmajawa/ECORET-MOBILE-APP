import axios, { AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

export const BASE_URL = API_BASE_URL;

export const ENDPOINTS = {
  auth: {
    login: '/auth/login/',
    logout: '/auth/logout/',
    register: '/auth/register/',
    checkAuth: '/auth/check/',
    profile: '/auth/profile/',
    tokenRefresh: '/auth/refresh/',
    registerDevice: '/auth/device/register/',
  },
  groups: {
    list: '/groups/',
    detail: (id: string) => `/groups/${id}/`,
    members: (id: string) => `/groups/${id}/members/`,
    addMember: (id: string) => `/groups/${id}/add_member/`,
    updateMemberRole: (id: string) => `/groups/${id}/update_member_role/`,
    updateMember: (id: string) => `/groups/${id}/update_member/`,
    cycleStatus: (id: string) => `/groups/${id}/cycle_status/`,
    startCycle: (id: string) => `/groups/${id}/start_cycle/`,
    endCycle: (id: string) => `/groups/${id}/end_cycle/`,
    ledgerEntries: (id: string) => `/groups/${id}/ledger_entries/`,
    addLedgerEntry: (id: string) => `/groups/${id}/add_ledger_entry/`,
    updateLedgerEntry: (id: string) => `/groups/${id}/update_ledger_entry/`,
    deleteLedgerEntry: (id: string) => `/groups/${id}/delete_ledger_entry/`,
    verifyLedgerEntry: (id: string) => `/groups/${id}/verify_ledger_entry/`,
    ledgerSummary: (id: string) => `/groups/${id}/ledger_summary/`,
    memberLedger: (id: string) => `/groups/${id}/member_ledger/`,
    ledgerCategories: (id: string) => `/groups/${id}/ledger_categories/`,
    addLedgerCategory: (id: string) => `/groups/${id}/add_ledger_category/`,
    updateLedgerCategory: (id: string) => `/groups/${id}/update_ledger_category/`,
    deleteLedgerCategory: (id: string) => `/groups/${id}/delete_ledger_category/`,
  },
  loans: {
    list: '/loans/',
    detail: (id: string) => `/loans/${id}/`,
    approve: (id: string) => `/loans/${id}/approve/`,
    decline: (id: string) => `/loans/${id}/decline/`,
    recordRepayment: (id: string) => `/loans/${id}/record_repayment/`,
    balance: (id: string) => `/loans/${id}/balance/`,
    repayments: (id: string) => `/loans/${id}/repayments/`,
    requests: '/loan-requests/',
    requestApprove: (id: string) => `/loan-requests/${id}/approve/`,
    requestDecline: (id: string) => `/loan-requests/${id}/decline/`,
    availableAccounts: (id: string) => `/loans/${id}/available_accounts/`,
    disburseCash: (id: string) => `/loans/${id}/disburse_cash/`,
    disburseBankTransfer: (id: string) => `/loans/${id}/disburse_bank_transfer/`,
    disburseWait: (id: string) => `/loans/${id}/disburse_wait/`,
    ecoretAccounts: '/ecoret-accounts/',
    ecoretAccountSetDefault: (id: string) => `/ecoret-accounts/${id}/set_default/`,
    ecoretSettings: '/ecoret-settings/',
    memberBankDetails: (id: string) => `/loans/${id}/member_bank_details/`,
    chairmanDisburseCash: (id: string) => `/loans/${id}/chairman_disburse_cash/`,
    chairmanDisburseBank: (id: string) => `/loans/${id}/chairman_disburse_bank/`,
    chairmanDisburseMobileMoney: (id: string) => `/loans/${id}/chairman_disburse_mobile_money/`,
    chairmanDisburseWait: (id: string) => `/loans/${id}/chairman_disburse_wait/`,
  },
  savings: {
    list: '/savings/',
    memberSavings: (id: string) => `/savings/member/${id}/`,
  },
  attendance: {
    list: '/attendance/',
    bulkCreate: '/attendance/bulk_create/',
    statistics: '/attendance/statistics/',
    meetings: '/meetings/',
    participation: '/participation/',
    cases: '/attendance-cases/',
    caseSummary: '/attendance-cases/summary/',
    caseAddPayment: (id: string) => `/attendance-cases/${id}/add_payment/`,
    caseResolve: (id: string) => `/attendance-cases/${id}/resolve/`,
    caseWaive: (id: string) => `/attendance-cases/${id}/waive/`,
  },
  notifications: {
    list: '/notifications/',
    unreadCount: '/notifications/unread_count/',
    markRead: (id: string) => `/notifications/${id}/mark_read/`,
    markAllRead: '/notifications/mark_all_read/',
    preferences: '/preferences/',
    send: '/send-notification/',
  },
  sync: {
    pull: '/sync/',
    push: '/sync/',
    status: '/sync/status/',
  },
   reports: {
    list: '/reports/',
    generate: '/reports/generate/',
    detail: (id: string) => `/reports/${id}/`,
    download: (id: string) => `/reports/${id}/download/`,
    pending: '/reports/pending/',
    regenerate: (id: string) => `/reports/${id}/regenerate/`,
    delete: (id: string) => `/reports/${id}/delete/`,
  },
};

const api = axios.create({
  baseURL: BASE_URL,
});

async function uploadFormData(path: string, method: 'POST' | 'PATCH', formData: FormData, isRetry = false): Promise<AxiosResponse<any>> {
  const token = await AsyncStorage.getItem('access_token');

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
  }

  if (response.status === 401 && !isRetry) {
    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      const refreshResponse = await axios.post(`${BASE_URL}${ENDPOINTS.auth.tokenRefresh}`, {
        refresh: refreshToken,
      });
      await AsyncStorage.setItem('access_token', refreshResponse.data.access);
      return uploadFormData(path, method, formData, true);
    } catch (refreshError) {
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('refresh_token');
      await AsyncStorage.removeItem('user');
      const error: any = new Error('Session expired');
      error.response = { status: 401, data: { error: 'Session expired. Please log in again.' } };
      throw error;
    }
  }

  if (!response.ok) {
    const error: any = new Error(`Request failed with status ${response.status}`);
    error.response = { status: response.status, data };
    throw error;
  }

  return {
    data,
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    config: { url: path, method } as any,
  };
}

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        const response = await axios.post(`${BASE_URL}${ENDPOINTS.auth.tokenRefresh}`, {
          refresh: refreshToken,
        });
        const { access } = response.data;
        await AsyncStorage.setItem('access_token', access);
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('refresh_token');
        await AsyncStorage.removeItem('user');
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

async function fetchAllPages<T = any>(url: string, params?: any): Promise<T[]> {
  const allResults: T[] = [];
  let nextUrl: string | null = url;
  let nextParams: any = params;

  while (nextUrl) {
    const response: AxiosResponse = await api.get(nextUrl, nextParams ? { params: nextParams } : undefined);
    const data = response.data;

    if (Array.isArray(data)) {
      allResults.push(...data);
      nextUrl = null;
    } else if (data?.results) {
      allResults.push(...data.results);
      if (data.next) {
        nextUrl = data.next.startsWith(BASE_URL) ? data.next.slice(BASE_URL.length) : data.next;
        nextParams = undefined;
      } else {
        nextUrl = null;
      }
    } else {
      nextUrl = null;
    }
  }

  return allResults;
}

export const authAPI = {
  login: (email: string, password: string) => api.post(ENDPOINTS.auth.login, { email, password }),
  
  forgotPassword: (email: string) => api.post('/auth/forgot-password/', { email }),

  resetPassword: (token: string, new_password: string) => api.post('/auth/reset-password/', { token, new_password }),

  register: (userData: any) => api.post(ENDPOINTS.auth.register, userData),

  logout: (refreshToken: string) => api.post(ENDPOINTS.auth.logout, { refresh: refreshToken }),

  checkAuth: () => api.get(ENDPOINTS.auth.checkAuth),

  refreshToken: (refreshToken: string) => api.post(ENDPOINTS.auth.tokenRefresh, { refresh: refreshToken }),

  getProfile: () => api.get(ENDPOINTS.auth.profile),

  updateProfile: (data: any) => api.put(ENDPOINTS.auth.profile, data),

  registerDevice: (deviceData: any) => api.post(ENDPOINTS.auth.registerDevice, deviceData),
};

export const groupAPI = {
  getGroups: () => api.get('/groups/'),
  createGroup: (data: any) => api.post('/groups/', data),
  getGroup: (id: string) => api.get(`/groups/${id}/`),
  updateGroup: (id: string, data: any) => api.patch(`/groups/${id}/`, data),
  deleteGroup: (id: string) => api.delete(`/groups/${id}/`),
  addMemberMultipart: (id: string, formData: FormData) =>
    uploadFormData(`/groups/${id}/add_member/`, 'POST', formData),
  updateMemberMultipart: (groupId: string, memberId: string, formData: FormData) =>
    uploadFormData(`/groups/${groupId}/update_member/?member_id=${memberId}`, 'PATCH', formData),
  getMembers: (id: string) => api.get(`/groups/${id}/members/`),
  getGroupMembers: (id: string) => api.get(`/groups/${id}/members/`),
  addMember: (id: string, data: any, config?: any) =>
    api.post(`/groups/${id}/add_member/`, data, config),
  updateMember: (groupId: string, memberId: string, data: any, config?: any) =>
    api.patch(`/groups/${groupId}/update_member/?member_id=${memberId}`, data, config),
  updateMemberRole: (groupId: string, memberId: string, role: string) =>
    api.post(`/groups/${groupId}/update_member_role/`, {
      member_id: memberId,
      role: role,
    }),
  removeMember: (id: string, memberId: string) => api.delete(`/groups/${id}/members/${memberId}/`),

  uploadRecord: (id: string, data: any) => api.post(`/groups/${id}/upload_record/`, data),
  getRecords: (id: string) => api.get(`/groups/${id}/records/`),
  getBusinessTypes: () => api.get('/business-types/'),
  getBankAccount: (id: string) => api.get(`/groups/${id}/get_bank_account/`),
  updateBankAccount: (id: string, data: any) => api.patch(`/groups/${id}/update_bank_account/`, data),
  verifyBankAccount: (id: string, data: any) => api.post(`/groups/${id}/verify_bank_account/`, data),
  createLoanRequestMultipart: (formData: FormData) => uploadFormData('/loan-requests/', 'POST', formData),
  getMobileMoney: (id: string) => api.get(`/groups/${id}/get_mobile_money/`),
  updateMobileMoney: (id: string, data: any) => api.post(`/groups/${id}/update_mobile_money/`, data),

  getLimits: (id: string) => api.get(`/groups/${id}/get_limits/`),
  updateLimits: (id: string, data: any) => api.put(`/groups/${id}/update_limits/`, data),

  activateGroup: (id: string) => api.post(`/groups/${id}/activate/`),
  disableGroup: (id: string) => api.post(`/groups/${id}/disable/`),
  regenerateCode: (id: string) => api.post(`/groups/${id}/regenerate_code/`),

  startCycle: (id: string, data: any) => api.post(`/groups/${id}/start_cycle/`, data),
  endCycle: (id: string) => api.post(`/groups/${id}/end_cycle/`),
  getCycleStatus: (id: string) => api.get(`/groups/${id}/cycle_status/`),

  getGroupStatistics: (id: string) => api.get(`/groups/${id}/statistics/`),

  getLedgerEntries: (groupId: string, params?: any) => api.get(`/groups/${groupId}/ledger_entries/`, { params }),
  addLedgerEntry: (groupId: string, data: any) => api.post(`/groups/${groupId}/add_ledger_entry/`, data),
  updateLedgerEntry: (groupId: string, entryId: string, data: any) =>
    api.patch(`/groups/${groupId}/update_ledger_entry/?entry_id=${entryId}`, data),
  deleteLedgerEntry: (groupId: string, entryId: string) =>
    api.post(`/groups/${groupId}/delete_ledger_entry/`, { entry_id: entryId }),
  verifyLedgerEntry: (groupId: string, entryId: string) =>
    api.post(`/groups/${groupId}/verify_ledger_entry/`, { entry_id: entryId }),
  getLedgerSummary: (groupId: string) => api.get(`/groups/${groupId}/ledger_summary/`),
  getMemberLedger: (groupId: string, memberId: string) =>
    api.get(`/groups/${groupId}/member_ledger/?member_id=${memberId}`),
  getLedgerCategories: (groupId: string) => api.get(`/groups/${groupId}/ledger_categories/`),
  addLedgerCategory: (groupId: string, data: any) => api.post(`/groups/${groupId}/add_ledger_category/`, data),
};

interface LoanAPI {
  getLoans: () => Promise<AxiosResponse>;
  getAllLoans: () => Promise<any[]>;
  getLoansFiltered: (params: any) => Promise<AxiosResponse>;
  getAllLoansFiltered: (params: any) => Promise<any[]>;
  createLoan: (data: any) => Promise<AxiosResponse>;
  getLoan: (id: string) => Promise<AxiosResponse>;
  updateLoan: (id: string, data: any) => Promise<AxiosResponse>;
  deleteLoan: (id: string) => Promise<AxiosResponse>;
  approveLoan: (id: string, data: any) => Promise<AxiosResponse>;
  declineLoan: (id: string, data: any) => Promise<AxiosResponse>;
  recordRepayment: (id: string, data: any) => Promise<AxiosResponse>;
  getLoanBalance: (id: string) => Promise<AxiosResponse>;
  getLoanRequests: () => Promise<AxiosResponse>;
  createLoanRequest: (data: any) => Promise<AxiosResponse>;
  createLoanRequestMultipart: (data: FormData) => Promise<AxiosResponse>;
  getLoanRepayments: (id: string) => Promise<AxiosResponse>;
  getMemberBankDetails: (id: string) => Promise<AxiosResponse>;
  chairmanDisburseCash: (id: string, data: any) => Promise<AxiosResponse>;
  chairmanDisburseBank: (id: string, data: any) => Promise<AxiosResponse>;
  chairmanDisburseMobileMoney: (id: string, data: any) => Promise<AxiosResponse>;
  chairmanDisburseWait: (id: string, data: any) => Promise<AxiosResponse>;
  getEcoretAccounts: () => Promise<AxiosResponse>;
  getEcoretSettings: () => Promise<AxiosResponse>;
  getLoanSettings: () => Promise<AxiosResponse>;
  updateLoanSettings: (id: string, data: any) => Promise<AxiosResponse>;
}

export const loanAPI: LoanAPI = {
  getLoans: () => api.get(ENDPOINTS.loans.list),
  getAllLoans: () => fetchAllPages(ENDPOINTS.loans.list),
  getLoansFiltered: (params: any) => api.get(ENDPOINTS.loans.list, { params }),
  getAllLoansFiltered: (params: any) => fetchAllPages(ENDPOINTS.loans.list, params),
  createLoanRequestMultipart: (formData: FormData) => uploadFormData('/loan-requests/', 'POST', formData),
  createLoan: (data: any) => api.post(ENDPOINTS.loans.list, data),
  getLoan: (id: string) => api.get(ENDPOINTS.loans.detail(id)),
  updateLoan: (id: string, data: any) => api.put(ENDPOINTS.loans.detail(id), data),
  deleteLoan: (id: string) => api.delete(ENDPOINTS.loans.detail(id)),
  approveLoan: (id: string, data: any = {}) => {
    console.log(`📤 Approving loan ${id} at /loans/${id}/approve/`);
    return api.post(`/loans/${id}/approve/`, data);
  },
  declineLoan: (id: string, data: any = {}) => {
    console.log(`📤 Declining loan ${id} at /loans/${id}/decline/`);
    return api.post(`/loans/${id}/decline/`, data);
  },
  recordRepayment: (id: string, data: any) => {
    const url = `/loans/${id}/record_repayment/`;
    console.log(`📤 recordRepayment called with URL: ${url}`);
    console.log(`📤 Data:`, data);
    return api.post(url, data);
  },
  getLoanBalance: (id: string) => api.get(`/loans/${id}/balance/`),
  getLoanRequests: () => api.get('/loan-requests/'),
  createLoanRequest: (data: any) => api.post('/loan-requests/', data),
  getMemberBankDetails: (id: string) => {
    console.log(`📤 Getting member bank details for loan ${id}`);
    return api.get(`/loans/${id}/member_bank_details/`);
  },
  chairmanDisburseCash: (id: string, data: any) => {
    console.log(`📤 Disbursing cash for loan ${id}`);
    return api.post(`/loans/${id}/chairman_disburse_cash/`, data);
  },
  chairmanDisburseBank: (id: string, data: any) => {
    console.log(`📤 Disbursing bank transfer for loan ${id}`);
    return api.post(`/loans/${id}/chairman_disburse_bank/`, data);
  },
  chairmanDisburseMobileMoney: (id: string, data: any) => {
    console.log(`📤 Disbursing mobile money for loan ${id}`);
    return api.post(`/loans/${id}/chairman_disburse_mobile_money/`, data);
  },
  chairmanDisburseWait: (id: string, data: any) => {
    console.log(`📤 Marking loan ${id} as wait`);
    return api.post(`/loans/${id}/chairman_disburse_wait/`, data);
  },
  getLoanRepayments: (id: string) => {
    console.log(`📤 Getting repayments for loan ${id}`);
    return api.get(`/loans/${id}/repayments/`);
  },
  getEcoretAccounts: () => api.get('/ecoret-accounts/'),
  getEcoretSettings: () => api.get('/ecoret-settings/'),
  getLoanSettings: () => api.get('/loan-settings/'),
  updateLoanSettings: (id: string, data: any) => api.patch(`/loan-settings/${id}/update_settings/`, data),
};

export const savingsAPI = {
  getSavings: () => api.get('/savings/'),
  createSaving: (data: any) => api.post('/savings/', data),
  getMemberSavings: (memberId: string) => api.get(`/savings/member/${memberId}/`),
};

export const attendanceAPI = {
  getAttendance: () => api.get(ENDPOINTS.attendance.list),
  createAttendance: (data: any) => api.post(ENDPOINTS.attendance.list, data),
  updateAttendance: (id: string, data: any) => api.put(`${ENDPOINTS.attendance.list}${id}/`, data),
  bulkCreateAttendance: (data: any) => api.post(ENDPOINTS.attendance.bulkCreate, data),
  getAttendanceStatistics: () => api.get(ENDPOINTS.attendance.statistics),

  getMeetings: () => api.get(ENDPOINTS.attendance.meetings),
  createMeeting: (data: any) => api.post(ENDPOINTS.attendance.meetings, data),
  updateMeeting: (id: string, data: any) => api.patch(`${ENDPOINTS.attendance.meetings}${id}/`, data),
  markMeetingCompleted: (id: string) => api.post(`${ENDPOINTS.attendance.meetings}${id}/mark_completed/`, {}),
  addMeetingMinutes: (id: string, minutes: string) =>
    api.post(`${ENDPOINTS.attendance.meetings}${id}/add_minutes/`, { minutes }),

  getMemberAttendance: (memberId: string) => api.get(`/attendance/member/${memberId}/`),

  getCases: () => api.get(ENDPOINTS.attendance.cases),
  createCase: (data: any) => api.post(ENDPOINTS.attendance.cases, data),
  getCase: (id: string) => api.get(`${ENDPOINTS.attendance.cases}${id}/`),
  updateCase: (id: string, data: any) => api.put(`${ENDPOINTS.attendance.cases}${id}/`, data),
  addPaymentToCase: (caseId: string, data: any) => api.post(ENDPOINTS.attendance.caseAddPayment(caseId), data),
  resolveCase: (caseId: string, data: any) => api.post(ENDPOINTS.attendance.caseResolve(caseId), data),
  waiveCase: (caseId: string) => api.post(ENDPOINTS.attendance.caseWaive(caseId)),
  getCaseSummary: () => api.get(ENDPOINTS.attendance.caseSummary),
  getMemberCases: (memberId: string) => api.get(`/attendance-cases/member/${memberId}/`),
};

export const notificationAPI = {
  getNotifications: () => api.get(ENDPOINTS.notifications.list),
  getUnreadCount: () => api.get(ENDPOINTS.notifications.unreadCount),
  markAsRead: (notificationId: string) => api.post(ENDPOINTS.notifications.markRead(notificationId)),
  markAllRead: () => api.post(ENDPOINTS.notifications.markAllRead),
  getPreferences: () => api.get(ENDPOINTS.notifications.preferences),
  updatePreferences: (data: any) => api.put(ENDPOINTS.notifications.preferences, data),
  sendNotification: (data: any) => api.post(ENDPOINTS.notifications.send, data),
};

export const syncAPI = {
  syncPull: () => api.get(ENDPOINTS.sync.pull),
  syncPush: (data: any) => api.post(ENDPOINTS.sync.push, data),
  getSyncStatus: () => api.get(ENDPOINTS.sync.status),
};

export const ledgerAPI = {
  getEntries: (groupId: string, params?: any) => api.get(`/groups/${groupId}/ledger_entries/`, { params }),
  addEntry: (groupId: string, data: any) => api.post(`/groups/${groupId}/add_ledger_entry/`, data),
  updateEntry: (groupId: string, entryId: string, data: any) =>
    api.patch(`/groups/${groupId}/update_ledger_entry/?entry_id=${entryId}`, data),
  deleteEntry: (groupId: string, entryId: string) =>
    api.post(`/groups/${groupId}/delete_ledger_entry/`, { entry_id: entryId }),
  verifyEntry: (groupId: string, entryId: string) =>
    api.post(`/groups/${groupId}/verify_ledger_entry/`, { entry_id: entryId }),
  getSummary: (groupId: string) => api.get(`/groups/${groupId}/ledger_summary/`),
  getMemberLedger: (groupId: string, memberId: string) =>
    api.get(`/groups/${groupId}/member_ledger/?member_id=${memberId}`),
  getCategories: (groupId: string) => api.get(`/groups/${groupId}/ledger_categories/`),
  addCategory: (groupId: string, data: any) => api.post(`/groups/${groupId}/add_ledger_category/`, data),
};

export interface Report {
  id: string;
  group: string;
  group_name: string;
  cycle: string | null;
  report_type: string;
  format: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  generated_by: string;
  generated_by_name: string;
  start_date: string;
  end_date: string;
  include_members: string[];
  include_sections: string[];
  pdf_file: string | null;
  excel_file: string | null;
  file_size: number;
  download_count: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  is_ready: boolean;
  file_exists: boolean;
}

export interface GenerateReportRequest {
  group_id: string;
  period: 'this_cycle' | 'last_cycle' | 'this_month' | 'last_month' | 'custom' | 'all_time';
  start_date?: string;
  end_date?: string;
  cycle_id?: string;
  include_members?: string[];
  include_sections?: string[];
  format?: 'pdf' | 'excel' | 'both';
}

export const reportAPI = {
  getReports: () => api.get(ENDPOINTS.reports.list),
  
  getPendingReports: () => api.get(ENDPOINTS.reports.pending),
  
  generateReport: (data: GenerateReportRequest) => api.post(ENDPOINTS.reports.generate, data),
  
  getReport: (id: string) => api.get(ENDPOINTS.reports.detail(id)),
  
  downloadReport: (id: string) => api.get(ENDPOINTS.reports.download(id), { responseType: 'blob' }),
  
  regenerateReport: (id: string) => api.post(ENDPOINTS.reports.regenerate(id)),
  deleteReport: (id: string) => api.delete(ENDPOINTS.reports.detail(id)),
};

export default {
  auth: authAPI,
  groups: groupAPI,
  loans: loanAPI,
  savings: savingsAPI,
  attendance: attendanceAPI,
  notifications: notificationAPI,
  sync: syncAPI,
  ledger: ledgerAPI,
};
