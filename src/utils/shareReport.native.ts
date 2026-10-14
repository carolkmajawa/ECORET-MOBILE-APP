// Needs two packages on phones:
//   npm install react-native-fs react-native-share
//   cd ios && pod install   (iOS only), then rebuild the app
import RNFS from 'react-native-fs';
import RNShare from 'react-native-share';
import type { ReportFile, ShareResult } from './shareReport';

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onloadend = () => {
      const result = String(reader.result || '');
      resolve(result.split(',')[1] ?? '');
    };
    reader.readAsDataURL(blob);
  });

async function writeTempFile(file: ReportFile): Promise<string> {
  const path = `${RNFS.CachesDirectoryPath}/${file.filename}`;
  await RNFS.writeFile(path, await blobToBase64(file.blob), 'base64');
  return path;
}

export async function shareReportFile(file: ReportFile): Promise<ShareResult> {
  const path = await writeTempFile(file);
  try {
    await RNShare.open({
      url: `file://${path}`,
      type: file.mime,
      title: file.title,
      failOnCancel: false,
    });
    return 'shared';
  } catch (error: any) {
    if (/cancel|dismiss/i.test(String(error?.message))) return 'cancelled';
    throw error;
  }
}

// On phones, "download" goes through the share sheet (choose "Save to Files" / Drive).
export const saveReportFile = shareReportFile;