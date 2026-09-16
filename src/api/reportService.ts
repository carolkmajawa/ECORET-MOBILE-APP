// src/api/reportService.ts

import api from './client';
import { ENDPOINTS } from './endpoints';

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
  deleteReport: (id: string) => api.delete(ENDPOINTS.reports.delete(id)),
};