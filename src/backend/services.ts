import { supabase } from './supabase';
import {
  ActivityRecordRow,
  BathRecordRow,
  CloudActivityInput,
  CloudFootprintInput,
  CloudHospitalInput,
  CreatePetInput,
  DraftRow,
  ExpenseRecordRow,
  FootprintRow,
  HospitalRecordRow,
  MedicalLogRow,
  MedicationLogRow,
  MedicationPlanRow,
  MedicineStock,
  Pet,
  SyncRecordInput,
  UpsertMedicineStockInput,
  WeightRecordRow,
} from './types';
import { ExpenseRecord, MedicalLogRecord, MedicationLog, MedicationPlan, WeightRecord } from '../types';

const requireUserId = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('请先登录后再同步数据');
  return data.user.id;
};

const throwIfError = <T>(result: { data: T | null; error: unknown }) => {
  if (result.error) throw result.error;
  if (result.data === null) throw new Error('后端没有返回数据');
  return result.data;
};

export const authService = {
  signUp: async (email: string, password: string) => {
    const result = await supabase.auth.signUp({ email, password });
    if (result.error) throw result.error;
    return result.data;
  },

  signIn: async (email: string, password: string) => {
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error) throw result.error;
    return result.data;
  },

  signOut: async () => {
    const result = await supabase.auth.signOut();
    if (result.error) throw result.error;
  },

  getSession: async () => {
    const result = await supabase.auth.getSession();
    if (result.error) throw result.error;
    return result.data.session;
  },
};

export const petService = {
  listPets: async () => {
    const ownerId = await requireUserId();
    const result = await supabase
      .from('pets')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: true });
    return throwIfError<Pet[] | null>(result) ?? [];
  },

  createPet: async (input: CreatePetInput) => {
    const ownerId = await requireUserId();
    const result = await supabase
      .from('pets')
      .insert({ ...input, owner_id: ownerId })
      .select()
      .single();
    return throwIfError<Pet>(result);
  },

  updatePet: async (petId: string, input: Partial<CreatePetInput>) => {
    const ownerId = await requireUserId();
    const result = await supabase
      .from('pets')
      .update(input)
      .eq('id', petId)
      .eq('owner_id', ownerId)
      .select()
      .single();
    return throwIfError<Pet>(result);
  },
};

export const imageService = {
  uploadImage: async (imageUri: string, folder: string) => {
    const ownerId = await requireUserId();
    const extension = imageUri.split('.').pop()?.split('?')[0] || 'jpg';
    const path = `${ownerId}/${folder}/${Date.now()}.${extension}`;
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const result = await supabase.storage.from('pet-images').upload(path, blob, {
      contentType: blob.type || 'image/jpeg',
      upsert: true,
    });
    if (result.error) throw result.error;
    return result.data.path;
  },

  createSignedUrl: async (path: string, expiresInSeconds = 60 * 60) => {
    const result = await supabase.storage
      .from('pet-images')
      .createSignedUrl(path, expiresInSeconds);
    if (result.error) throw result.error;
    return result.data.signedUrl;
  },
};

export const medicineService = {
  listStocks: async (petId: string) => {
    const ownerId = await requireUserId();
    const result = await supabase
      .from('medicine_stocks')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('pet_id', petId)
      .order('created_at', { ascending: true });
    return throwIfError<MedicineStock[] | null>(result) ?? [];
  },

  upsertStock: async (input: UpsertMedicineStockInput) => {
    const ownerId = await requireUserId();
    const result = await supabase
      .from('medicine_stocks')
      .upsert({
        id: input.id,
        owner_id: ownerId,
        pet_id: input.pet_id,
        name: input.name,
        quantity: input.quantity,
        unit: input.unit ?? '粒',
        dose_per_use: input.dose_per_use ?? 1,
        reminder_threshold: input.reminder_threshold ?? 7,
      })
      .select()
      .single();
    return throwIfError<MedicineStock>(result);
  },
};

const toMedicationPlanRow = (ownerId: string, plan: MedicationPlan) => ({
  id: plan.id,
  owner_id: ownerId,
  pet_id: plan.petId,
  med_name: plan.medName,
  dosage: plan.dosage,
  frequency: plan.frequency,
  times: plan.times,
  start_date: plan.startDate.slice(0, 10),
  end_date: plan.endDate.slice(0, 10),
  inventory: plan.inventory ?? null,
  inventory_warning_threshold: plan.inventoryWarningThreshold ?? null,
  is_completed: plan.isCompleted,
  notification_ids: plan.notificationIds ?? [],
});

const toMedicationLogRow = (ownerId: string, log: MedicationLog) => ({
  id: log.id,
  owner_id: ownerId,
  plan_id: log.planId,
  pet_id: log.petId,
  med_name: log.medName,
  dosage: log.dosage,
  scheduled_at: log.scheduledAt,
  taken_at: log.takenAt,
});

export const medicationPlanService = {
  listPlans: async (petId: string) => {
    const ownerId = await requireUserId();
    const result = await supabase
      .from('medication_plans')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('pet_id', petId)
      .order('start_date', { ascending: false });
    return throwIfError<MedicationPlanRow[] | null>(result) ?? [];
  },

  listLogs: async (petId: string) => {
    const ownerId = await requireUserId();
    const result = await supabase
      .from('medication_logs')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('pet_id', petId)
      .order('scheduled_at', { ascending: false });
    return throwIfError<MedicationLogRow[] | null>(result) ?? [];
  },

  upsertPlan: async (plan: MedicationPlan) => {
    const ownerId = await requireUserId();
    const result = await supabase
      .from('medication_plans')
      .upsert(toMedicationPlanRow(ownerId, plan))
      .select()
      .single();
    return throwIfError<MedicationPlanRow>(result);
  },

  completePlan: async (planId: string) => {
    const ownerId = await requireUserId();
    const result = await supabase
      .from('medication_plans')
      .update({ is_completed: true })
      .eq('id', planId)
      .eq('owner_id', ownerId)
      .select()
      .single();
    return throwIfError<MedicationPlanRow>(result);
  },

  logDose: async (log: MedicationLog) => {
    const ownerId = await requireUserId();
    const result = await supabase
      .from('medication_logs')
      .upsert(toMedicationLogRow(ownerId, log), { onConflict: 'owner_id,plan_id,scheduled_at' })
      .select()
      .single();
    return throwIfError<MedicationLogRow>(result);
  },
};

const toActivityRow = (ownerId: string, petId: string, record: CloudActivityInput) => ({
  id: record.id,
  owner_id: ownerId,
  pet_id: petId,
  type: record.type,
  happened_at: record.time,
  detail: record.detail ?? null,
  image_url: record.imageUrl ?? null,
  mood: record.mood ?? null,
  is_mood_entry: record.isMoodEntry ?? false,
});

const toMedicalLogRow = (ownerId: string, petId: string, record: MedicalLogRecord) => ({
  id: record.id,
  owner_id: ownerId,
  pet_id: petId,
  happened_at: record.time,
  duration_seconds: record.durationSeconds,
  severity: record.severity,
  consciousness: record.consciousness,
  text: record.text,
});

const toWeightRow = (ownerId: string, petId: string, record: WeightRecord) => ({
  id: record.id,
  owner_id: ownerId,
  pet_id: petId,
  happened_at: record.time,
  value_kg: record.valueKg,
});

const toHospitalRow = (ownerId: string, petId: string, record: CloudHospitalInput) => ({
  id: record.id,
  owner_id: ownerId,
  pet_id: petId,
  happened_at: record.time,
  hospital: record.hospital,
  indicators: record.indicators,
  note: record.note ?? null,
  image_url: record.imageUrl ?? null,
});

const toBathRow = (ownerId: string, petId: string, record: { id: string; time: string }) => ({
  id: record.id,
  owner_id: ownerId,
  pet_id: petId,
  happened_at: record.time,
});

const toFootprintRow = (ownerId: string, petId: string, record: CloudFootprintInput) => ({
  id: record.id,
  owner_id: ownerId,
  pet_id: petId,
  location: record.location,
  visited_at: record.date,
  note: record.note,
  image_url: record.imageUrl ?? null,
});

const toDraftRow = (ownerId: string, petId: string, record: NonNullable<SyncRecordInput['drafts']>[number]) => ({
  id: record.id,
  owner_id: ownerId,
  pet_id: petId,
  content: record.content,
  created_at: record.time,
});

const toExpenseRow = (ownerId: string, petId: string, record: ExpenseRecord) => ({
  id: record.id,
  owner_id: ownerId,
  pet_id: petId,
  happened_at: record.time,
  amount: record.amount,
  category: record.category,
  note: record.note ?? null,
});

export const recordService = {
  fetchAllForPet: async (petId: string) => {
    const ownerId = await requireUserId();
    const [
      activities,
      medicalLogs,
      weightRecords,
      hospitalRecords,
      bathRecords,
      footprints,
      drafts,
      expenses,
    ] = await Promise.all([
      supabase.from('activity_records').select('*').eq('owner_id', ownerId).eq('pet_id', petId),
      supabase.from('medical_logs').select('*').eq('owner_id', ownerId).eq('pet_id', petId),
      supabase.from('weight_records').select('*').eq('owner_id', ownerId).eq('pet_id', petId),
      supabase.from('hospital_records').select('*').eq('owner_id', ownerId).eq('pet_id', petId),
      supabase.from('bath_records').select('*').eq('owner_id', ownerId).eq('pet_id', petId),
      supabase.from('footprints').select('*').eq('owner_id', ownerId).eq('pet_id', petId),
      supabase.from('drafts').select('*').eq('owner_id', ownerId).eq('pet_id', petId),
      supabase.from('expense_records').select('*').eq('owner_id', ownerId).eq('pet_id', petId),
    ]);

    return {
      activities: throwIfError<ActivityRecordRow[] | null>(activities) ?? [],
      medicalLogs: throwIfError<MedicalLogRow[] | null>(medicalLogs) ?? [],
      weightRecords: throwIfError<WeightRecordRow[] | null>(weightRecords) ?? [],
      hospitalRecords: throwIfError<HospitalRecordRow[] | null>(hospitalRecords) ?? [],
      bathRecords: throwIfError<BathRecordRow[] | null>(bathRecords) ?? [],
      footprints: throwIfError<FootprintRow[] | null>(footprints) ?? [],
      drafts: throwIfError<DraftRow[] | null>(drafts) ?? [],
      expenses: throwIfError<ExpenseRecordRow[] | null>(expenses) ?? [],
    };
  },

  syncLocalRecords: async (petId: string, records: SyncRecordInput) => {
    const ownerId = await requireUserId();
    const requests: Array<PromiseLike<{ error: unknown }>> = [];

    if (records.activities?.length) {
      requests.push(
        supabase.from('activity_records').upsert(records.activities.map((r) => toActivityRow(ownerId, petId, r))),
      );
    }
    if (records.medicalLogs?.length) {
      requests.push(
        supabase.from('medical_logs').upsert(records.medicalLogs.map((r) => toMedicalLogRow(ownerId, petId, r))),
      );
    }
    if (records.weightRecords?.length) {
      requests.push(
        supabase.from('weight_records').upsert(records.weightRecords.map((r) => toWeightRow(ownerId, petId, r))),
      );
    }
    if (records.hospitalRecords?.length) {
      requests.push(
        supabase.from('hospital_records').upsert(records.hospitalRecords.map((r) => toHospitalRow(ownerId, petId, r))),
      );
    }
    if (records.bathRecords?.length) {
      requests.push(
        supabase.from('bath_records').upsert(records.bathRecords.map((r) => toBathRow(ownerId, petId, r))),
      );
    }
    if (records.footprints?.length) {
      requests.push(
        supabase.from('footprints').upsert(records.footprints.map((r) => toFootprintRow(ownerId, petId, r))),
      );
    }
    if (records.drafts?.length) {
      requests.push(
        supabase.from('drafts').upsert(records.drafts.map((r) => toDraftRow(ownerId, petId, r))),
      );
    }
    if (records.expenses?.length) {
      requests.push(
        supabase.from('expense_records').upsert(records.expenses.map((r) => toExpenseRow(ownerId, petId, r))),
      );
    }

    const results = await Promise.all(requests);
    for (const result of results) {
      const maybeError = result as { error?: unknown };
      if (maybeError.error) throw maybeError.error;
    }
  },
};
