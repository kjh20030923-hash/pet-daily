import { requireOptionalNativeModule } from 'expo-modules-core';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { FootprintRecord } from '../../types';
import { generateTraveloguePdfHtml, TraveloguePdfPhoto } from './generateTraveloguePdfHtml';

export type TravelogueExportRange = 'month' | 'year' | 'all';

type ExpoPrintModule = {
  printToFileAsync: (options: { html: string; base64?: boolean }) => Promise<{
    uri: string;
    numberOfPages: number;
    base64?: string;
  }>;
};

export class TravelogueExportError extends Error {
  constructor(public readonly code: 'NO_PHOTOS' | 'PRINT_UNAVAILABLE' | 'SHARING_UNAVAILABLE' | 'IMAGE_READ_FAILED') {
    super(code);
  }
}

const MORANDI_DOT_COLORS = ['#D9BDB5', '#A8B1A2', '#A9B5C2', '#E3D5B8', '#C49A80'] as const;

const isInRange = (iso: string, range: TravelogueExportRange, now = new Date()) => {
  if (range === 'all') return true;
  const date = new Date(iso);
  if (date.getFullYear() !== now.getFullYear()) return false;
  return range === 'year' || date.getMonth() === now.getMonth();
};

const getMimeType = (uri: string) => {
  const cleanUri = uri.split('?')[0].toLowerCase();
  if (cleanUri.endsWith('.png')) return 'image/png';
  if (cleanUri.endsWith('.webp')) return 'image/webp';
  if (cleanUri.endsWith('.heic') || cleanUri.endsWith('.heif')) return 'image/heic';
  return 'image/jpeg';
};

const imageUriToDataUrl = async (uri: string, index: number) => {
  if (uri.startsWith('data:image/')) return uri;

  let readableUri = uri;
  let downloadedUri: string | undefined;
  try {
    if (/^https?:\/\//i.test(uri)) {
      if (!FileSystem.cacheDirectory) throw new Error('Cache directory unavailable');
      downloadedUri = `${FileSystem.cacheDirectory}travelogue-export-${Date.now()}-${index}`;
      const result = await FileSystem.downloadAsync(uri, downloadedUri);
      readableUri = result.uri;
    }
    const base64 = await FileSystem.readAsStringAsync(readableUri, { encoding: FileSystem.EncodingType.Base64 });
    return `data:${getMimeType(uri)};base64,${base64}`;
  } catch {
    throw new TravelogueExportError('IMAGE_READ_FAILED');
  } finally {
    if (downloadedUri) FileSystem.deleteAsync(downloadedUri, { idempotent: true }).catch(() => {});
  }
};

const formatPdfDate = (iso: string) => {
  const date = new Date(iso);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

export const exportTraveloguePdf = async ({
  records,
  range,
  petName,
}: {
  records: FootprintRecord[];
  range: TravelogueExportRange;
  petName: string;
}) => {
  const selectedRecords = records
    .filter((record): record is FootprintRecord & { imageUri: string } => Boolean(record.imageUri) && isInRange(record.date, range))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (selectedRecords.length === 0) throw new TravelogueExportError('NO_PHOTOS');

  const photos: TraveloguePdfPhoto[] = await Promise.all(selectedRecords.map(async (record, index) => ({
    url: await imageUriToDataUrl(record.imageUri, index),
    date: formatPdfDate(record.date),
    location: record.location,
    colorDot: MORANDI_DOT_COLORS[index % MORANDI_DOT_COLORS.length],
  })));

  const ExpoPrint = requireOptionalNativeModule<ExpoPrintModule>('ExpoPrint');
  if (!ExpoPrint?.printToFileAsync) throw new TravelogueExportError('PRINT_UNAVAILABLE');

  const result = await ExpoPrint.printToFileAsync({
    html: generateTraveloguePdfHtml(photos),
    base64: false,
  });

  if (!(await Sharing.isAvailableAsync())) throw new TravelogueExportError('SHARING_UNAVAILABLE');
  await Sharing.shareAsync(result.uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: `${petName}的宠物游记`,
  });

  return { uri: result.uri, numberOfPages: result.numberOfPages, photoCount: photos.length };
};
