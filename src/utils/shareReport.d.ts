// Types for the platform-specific helpers:
//   shareReport.web.ts    -> used by the browser build
//   shareReport.native.ts -> used by iOS / Android builds
// The bundler picks the right one automatically.

export interface ReportFile {
  blob: Blob;
  filename: string;
  mime: string;
  title: string;
}

export type ShareResult = 'shared' | 'downloaded' | 'cancelled';

/** Open the system share sheet with the report file attached. */
export function shareReportFile(file: ReportFile): Promise<ShareResult>;

/** Save the report to the device (browser download / native "save to files"). */
export function saveReportFile(file: ReportFile): Promise<ShareResult>;