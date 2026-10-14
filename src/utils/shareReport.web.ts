import type { ReportFile, ShareResult } from './shareReport';

function triggerDownload(file: ReportFile) {
  const url = window.URL.createObjectURL(file.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export async function saveReportFile(file: ReportFile): Promise<ShareResult> {
  triggerDownload(file);
  return 'downloaded';
}

export async function shareReportFile(file: ReportFile): Promise<ShareResult> {
  const nav: any = typeof navigator !== 'undefined' ? navigator : undefined;

  // The Web Share API only exists in secure contexts (https:// or localhost)
  // and on browsers that can share files. Otherwise fall back to a download.
  if (nav?.share && nav?.canShare) {
    try {
      const shareable = new File([file.blob], file.filename, { type: file.mime });
      if (nav.canShare({ files: [shareable] })) {
        await nav.share({ files: [shareable], title: file.title });
        return 'shared';
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') return 'cancelled'; // user closed the sheet
      console.warn('Web share failed, falling back to download:', error);
    }
  }

  triggerDownload(file);
  return 'downloaded';
}