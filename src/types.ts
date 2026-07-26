export type ActivityType =
  | 'feed'
  | 'walk'
  | 'medicine'
  | 'alert'
  | 'litter'
  | 'deworm'
  | 'deworm-internal'
  | 'deworm-external'
  | 'vaccine';

export type ActivityRecord = {
  id: string;
  petId?: string;
  type: ActivityType;
  time: string; // ISO
  detail?: string;
  imageUri?: string;
  mood?: PetMood;
  isMoodEntry?: boolean;
};

export type PetMood = 'happy' | 'calm' | 'tired' | 'playful';

export type MedicalLogRecord = {
  id: string;
  petId?: string;
  time: string; // ISO
  durationSeconds: number;
  severity: '轻微' | '剧烈';
  consciousness: '清醒' | '模糊';
  text: string;
};

export type WeightRecord = {
  id: string;
  petId?: string;
  time: string; // ISO
  valueKg: number;
};

export type HospitalRecord = {
  id: string;
  petId?: string;
  time: string; // ISO
  hospital: string;
  indicators: string;
  note?: string;
  imageUri?: string;
};

export type BathRecord = {
  id: string;
  petId?: string;
  time: string; // ISO
};

export type FootprintRecord = {
  id: string;
  petId?: string;
  imageUri?: string;
  location: string;
  date: string; // ISO
  note: string;
};

export type DraftRecord = {
  id: string;
  petId?: string;
  content: string;
  time: string; // ISO
};

export type PetProfile = {
  id: string;
  name: string;
  kind: 'dog' | 'cat' | 'other';
  customImageURL?: string;
  birthday?: string;
  seizure_enabled: boolean;
  /** @deprecated Use seizure_enabled. */
  hasEpilepsy: boolean;
  enabledHealthWidgets?: HealthWidgetId[];
  createdAt: string;
};

export type HealthWidgetId = 'seizure-tracker';

export type ExpenseCategory = '主粮' | '零食' | '医疗' | '洗护' | '用品' | '其他' | '饮食' | '美容';

export type ExpenseRecord = {
  id: string;
  petId?: string;
  amount: number;
  category: ExpenseCategory;
  note?: string;
  time: string;
};

export type MedicationFrequency =
  | 'once_daily'
  | 'twice_daily'
  | 'three_times_daily'
  | 'custom'
  | `cron:${string}`;

export type MedicationPlan = {
  id: string;
  petId: string;
  medName: string;
  dosage: string;
  frequency: MedicationFrequency;
  times: string[];
  startDate: string;
  endDate: string;
  inventory?: number;
  inventoryWarningThreshold?: number;
  isCompleted: boolean;
  notificationIds?: string[];
};

export type MedicationLog = {
  id: string;
  planId: string;
  petId: string;
  medName: string;
  dosage: string;
  scheduledAt: string;
  takenAt: string;
};

export type TimelineItem =
  | ({ kind: 'activity' } & ActivityRecord)
  | ({ kind: 'footprint' } & FootprintRecord)
  | ({ kind: 'draft' } & DraftRecord)
  | ({ kind: 'medical' } & MedicalLogRecord)
  | ({ kind: 'hospital' } & HospitalRecord)
  | ({ kind: 'bath' } & BathRecord)
  | ({ kind: 'expense' } & ExpenseRecord)
  | ({ kind: 'medication' } & MedicationLog);
