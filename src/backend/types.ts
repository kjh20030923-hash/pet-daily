import {
  ActivityRecord,
  ActivityType,
  DraftRecord,
  ExpenseRecord,
  FootprintRecord,
  HospitalRecord,
  MedicalLogRecord,
  MedicationFrequency,
  PetMood,
  WeightRecord,
} from '../types';

export type BackendId = string;

export type Profile = {
  id: BackendId;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Pet = {
  id: BackendId;
  owner_id: BackendId;
  name: string;
  avatar_url: string | null;
  birthday: string | null;
  sex: string | null;
  breed: string | null;
  condition_notes: string | null;
  medication_notes: string | null;
  kind: 'dog' | 'cat' | 'other';
  has_epilepsy: boolean;
  seizure_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type MedicineStock = {
  id: BackendId;
  owner_id: BackendId;
  pet_id: BackendId;
  name: string;
  quantity: number;
  unit: string;
  dose_per_use: number;
  reminder_threshold: number;
  created_at: string;
  updated_at: string;
};

export type MedicationPlanRow = {
  id: BackendId;
  owner_id: BackendId;
  pet_id: BackendId;
  med_name: string;
  dosage: string;
  frequency: MedicationFrequency;
  times: string[];
  start_date: string;
  end_date: string;
  inventory: number | null;
  inventory_warning_threshold: number | null;
  is_completed: boolean;
  notification_ids: string[];
  created_at: string;
  updated_at: string;
};

export type MedicationLogRow = {
  id: BackendId;
  owner_id: BackendId;
  plan_id: BackendId;
  pet_id: BackendId;
  med_name: string;
  dosage: string;
  scheduled_at: string;
  taken_at: string;
  created_at: string;
};

export type ActivityRecordRow = {
  id: BackendId;
  owner_id: BackendId;
  pet_id: BackendId;
  type: ActivityType;
  happened_at: string;
  detail: string | null;
  image_url: string | null;
  mood: PetMood | null;
  is_mood_entry: boolean;
  created_at: string;
  updated_at: string;
};

export type MedicalLogRow = {
  id: BackendId;
  owner_id: BackendId;
  pet_id: BackendId;
  happened_at: string;
  duration_seconds: number;
  severity: MedicalLogRecord['severity'];
  consciousness: MedicalLogRecord['consciousness'];
  text: string;
  created_at: string;
  updated_at: string;
};

export type WeightRecordRow = {
  id: BackendId;
  owner_id: BackendId;
  pet_id: BackendId;
  happened_at: string;
  value_kg: number;
  created_at: string;
  updated_at: string;
};

export type HospitalRecordRow = {
  id: BackendId;
  owner_id: BackendId;
  pet_id: BackendId;
  happened_at: string;
  hospital: string;
  indicators: string;
  note: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type BathRecordRow = {
  id: BackendId;
  owner_id: BackendId;
  pet_id: BackendId;
  happened_at: string;
  created_at: string;
};

export type FootprintRow = {
  id: BackendId;
  owner_id: BackendId;
  pet_id: BackendId;
  location: string;
  visited_at: string;
  note: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type DraftRow = {
  id: BackendId;
  owner_id: BackendId;
  pet_id: BackendId | null;
  content: string;
  created_at: string;
  updated_at: string;
};

export type ExpenseRecordRow = {
  id: BackendId;
  owner_id: BackendId;
  pet_id: BackendId;
  happened_at: string;
  amount: number;
  category: ExpenseRecord['category'];
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type CreatePetInput = {
  name: string;
  avatar_url?: string | null;
  birthday?: string | null;
  sex?: string | null;
  breed?: string | null;
  condition_notes?: string | null;
  medication_notes?: string | null;
  kind?: 'dog' | 'cat' | 'other';
  has_epilepsy?: boolean;
  seizure_enabled?: boolean;
};

export type UpsertMedicineStockInput = {
  id?: BackendId;
  pet_id: BackendId;
  name: string;
  quantity: number;
  unit?: string;
  dose_per_use?: number;
  reminder_threshold?: number;
};

export type CloudActivityInput = Omit<ActivityRecord, 'imageUri'> & {
  imageUrl?: string | null;
};

export type CloudHospitalInput = Omit<HospitalRecord, 'imageUri'> & {
  imageUrl?: string | null;
};

export type CloudFootprintInput = Omit<FootprintRecord, 'imageUri'> & {
  imageUrl?: string | null;
};

export type SyncRecordInput = {
  activities?: CloudActivityInput[];
  medicalLogs?: MedicalLogRecord[];
  weightRecords?: WeightRecord[];
  hospitalRecords?: CloudHospitalInput[];
  bathRecords?: Array<{ id: string; time: string }>;
  footprints?: CloudFootprintInput[];
  drafts?: DraftRecord[];
  expenses?: ExpenseRecord[];
};
