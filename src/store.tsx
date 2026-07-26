import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityRecord,
  BathRecord,
  DraftRecord,
  ExpenseRecord,
  FootprintRecord,
  HospitalRecord,
  MedicationLog,
  MedicationPlan,
  MedicalLogRecord,
  PetProfile,
  TimelineItem,
  WeightRecord,
} from './types';

type AppState = {
  pets: PetProfile[];
  currentPetId: string;
  activities: ActivityRecord[];
  footprints: FootprintRecord[];
  drafts: DraftRecord[];
  medicalLogs: MedicalLogRecord[];
  zonisamideStock: number;
  weightRecords: WeightRecord[];
  hospitalRecords: HospitalRecord[];
  bathRecords: BathRecord[];
  expenses: ExpenseRecord[];
  medicationPlans: MedicationPlan[];
  medicationLogs: MedicationLog[];
};

type NewPetInput = Pick<PetProfile, 'name' | 'kind' | 'seizure_enabled'>
  & Partial<Pick<PetProfile, 'customImageURL' | 'birthday'>>;

type ContextValue = Omit<AppState, 'activities' | 'footprints' | 'drafts' | 'medicalLogs' | 'weightRecords' | 'hospitalRecords' | 'bathRecords' | 'expenses' | 'medicationPlans' | 'medicationLogs'> & {
  currentPet: PetProfile;
  activities: ActivityRecord[];
  footprints: FootprintRecord[];
  drafts: DraftRecord[];
  medicalLogs: MedicalLogRecord[];
  weightRecords: WeightRecord[];
  hospitalRecords: HospitalRecord[];
  bathRecords: BathRecord[];
  expenses: ExpenseRecord[];
  medicationPlans: MedicationPlan[];
  medicationLogs: MedicationLog[];
  allExpenses: ExpenseRecord[];
  lastBathAt?: string;
  selectPet: (petId: string) => void;
  addPet: (input: NewPetInput) => void;
  updateCurrentPet: (input: Partial<Pick<PetProfile, 'name' | 'kind' | 'customImageURL' | 'birthday' | 'seizure_enabled' | 'hasEpilepsy' | 'enabledHealthWidgets'>>) => void;
  addActivity: (record: ActivityRecord) => void;
  addFootprint: (record: FootprintRecord) => void;
  addDraft: (record: DraftRecord) => void;
  addMedicalLog: (record: MedicalLogRecord) => void;
  addWeightRecord: (record: WeightRecord) => void;
  addHospitalRecord: (record: HospitalRecord) => void;
  addExpense: (record: ExpenseRecord, petId?: string) => void;
  addBathRecord: (timeIso: string) => void;
  upsertMedicationPlan: (plan: MedicationPlan) => void;
  completeMedicationPlan: (planId: string) => void;
  logMedicationDose: (plan: MedicationPlan, scheduledAt: string) => void;
  markBathNow: () => void;
  exportBackupJson: () => string;
};

const AppContext = createContext<ContextValue | undefined>(undefined);
const STORAGE_KEY = 'kangqiqi-daily-state-v1';
const DEFAULT_PET_ID = 'pet-kangqiqi';
const defaultPet: PetProfile = {
  id: DEFAULT_PET_ID,
  name: '康七七',
  kind: 'dog',
  seizure_enabled: false,
  hasEpilepsy: false,
  enabledHealthWidgets: [],
  createdAt: new Date(2025, 0, 1).toISOString(),
};

const emptyState: AppState = {
  pets: [defaultPet],
  currentPetId: DEFAULT_PET_ID,
  activities: [],
  footprints: [],
  drafts: [],
  medicalLogs: [],
  zonisamideStock: 60,
  weightRecords: [],
  hospitalRecords: [],
  bathRecords: [],
  expenses: [],
  medicationPlans: [],
  medicationLogs: [],
};

const attachPet = <T extends { petId?: string }>(records: T[] | undefined, fallbackId: string) =>
  (records ?? []).map((record) => ({ ...record, petId: record.petId ?? fallbackId }));

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(emptyState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<AppState>;
        const sourcePets = parsed.pets?.length ? parsed.pets : [defaultPet];
        const pets = sourcePets.map((pet) => {
          const seizureEnabled = pet.seizure_enabled
            ?? pet.enabledHealthWidgets?.includes('seizure-tracker')
            ?? pet.hasEpilepsy
            ?? false;
          return {
            ...pet,
            seizure_enabled: seizureEnabled,
            hasEpilepsy: seizureEnabled,
            enabledHealthWidgets: seizureEnabled ? ['seizure-tracker' as const] : [],
          };
        });
        const currentPetId = pets.some((pet) => pet.id === parsed.currentPetId)
          ? parsed.currentPetId as string
          : pets[0].id;
        setState({
          pets,
          currentPetId,
          activities: attachPet(parsed.activities, currentPetId),
          footprints: attachPet(parsed.footprints, currentPetId),
          drafts: attachPet(parsed.drafts, currentPetId),
          medicalLogs: attachPet(parsed.medicalLogs, currentPetId),
          zonisamideStock: parsed.zonisamideStock ?? 60,
          weightRecords: attachPet(parsed.weightRecords, currentPetId),
          hospitalRecords: attachPet(parsed.hospitalRecords, currentPetId),
          bathRecords: attachPet(parsed.bathRecords, currentPetId),
          expenses: attachPet(parsed.expenses, currentPetId),
          medicationPlans: attachPet(parsed.medicationPlans, currentPetId) as MedicationPlan[],
          medicationLogs: attachPet(parsed.medicationLogs, currentPetId) as MedicationLog[],
        });
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [hydrated, state]);

  const currentPet = state.pets.find((pet) => pet.id === state.currentPetId) ?? state.pets[0];
  const byCurrentPet = <T extends { petId?: string }>(records: T[]) =>
    records.filter((record) => record.petId === currentPet.id);

  const value = useMemo<ContextValue>(() => {
    const activities = byCurrentPet(state.activities);
    const footprints = byCurrentPet(state.footprints);
    const drafts = byCurrentPet(state.drafts);
    const medicalLogs = byCurrentPet(state.medicalLogs);
    const weightRecords = byCurrentPet(state.weightRecords);
    const hospitalRecords = byCurrentPet(state.hospitalRecords);
    const bathRecords = byCurrentPet(state.bathRecords).sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
    );
    const expenses = byCurrentPet(state.expenses).sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
    );
    const medicationPlans = byCurrentPet(state.medicationPlans);
    const medicationLogs = byCurrentPet(state.medicationLogs);
    const withPet = <T extends { petId?: string }>(record: T) => ({ ...record, petId: currentPet.id });

    return {
      ...state,
      currentPet,
      activities,
      footprints,
      drafts,
      medicalLogs,
      weightRecords,
      hospitalRecords,
      bathRecords,
      expenses,
      medicationPlans,
      medicationLogs,
      allExpenses: state.expenses,
      lastBathAt: bathRecords[0]?.time,
      selectPet: (petId) => setState((prev) => ({ ...prev, currentPetId: petId })),
      addPet: (input) => setState((prev) => {
        const pet: PetProfile = {
          ...input,
          hasEpilepsy: input.seizure_enabled,
          enabledHealthWidgets: input.seizure_enabled ? ['seizure-tracker'] : [],
          id: `pet-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        return { ...prev, pets: [...prev.pets, pet], currentPetId: pet.id };
      }),
      updateCurrentPet: (input) => setState((prev) => ({
        ...prev,
        pets: prev.pets.map((pet) => pet.id === prev.currentPetId ? { ...pet, ...input } : pet),
      })),
      addActivity: (record) => setState((prev) => {
        const next = withPet(record);
        const detail = (record.detail ?? '').toLowerCase();
        const usesStock = record.type === 'medicine' &&
          (detail.includes('zonisamide') || detail.includes('佐尼沙胺'));
        return {
          ...prev,
          activities: [next, ...prev.activities],
          zonisamideStock: usesStock ? Math.max(0, prev.zonisamideStock - 1) : prev.zonisamideStock,
        };
      }),
      addFootprint: (record) => setState((prev) => ({ ...prev, footprints: [withPet(record), ...prev.footprints] })),
      addDraft: (record) => setState((prev) => ({ ...prev, drafts: [withPet(record), ...prev.drafts] })),
      addMedicalLog: (record) => setState((prev) => ({ ...prev, medicalLogs: [withPet(record), ...prev.medicalLogs] })),
      addWeightRecord: (record) => setState((prev) => ({ ...prev, weightRecords: [withPet(record), ...prev.weightRecords] })),
      addHospitalRecord: (record) => setState((prev) => ({ ...prev, hospitalRecords: [withPet(record), ...prev.hospitalRecords] })),
      addExpense: (record, petId) => setState((prev) => ({
        ...prev,
        expenses: [{ ...record, petId: petId ?? currentPet.id }, ...prev.expenses],
      })),
      addBathRecord: (timeIso) => setState((prev) => ({
        ...prev,
        bathRecords: [{ id: `${Date.now()}`, petId: currentPet.id, time: timeIso }, ...prev.bathRecords],
      })),
      upsertMedicationPlan: (plan) => setState((prev) => ({
        ...prev,
        medicationPlans: prev.medicationPlans.some((item) => item.id === plan.id)
          ? prev.medicationPlans.map((item) => item.id === plan.id ? plan : item)
          : [plan, ...prev.medicationPlans],
      })),
      completeMedicationPlan: (planId) => setState((prev) => ({
        ...prev,
        medicationPlans: prev.medicationPlans.map((plan) => plan.id === planId ? { ...plan, isCompleted: true } : plan),
      })),
      logMedicationDose: (plan, scheduledAt) => setState((prev) => {
        const existing = prev.medicationLogs.some((log) => log.planId === plan.id && log.scheduledAt === scheduledAt);
        if (existing) return prev;
        const log: MedicationLog = {
          id: `med-log-${Date.now()}`,
          planId: plan.id,
          petId: plan.petId,
          medName: plan.medName,
          dosage: plan.dosage,
          scheduledAt,
          takenAt: new Date().toISOString(),
        };
        return {
          ...prev,
          medicationLogs: [log, ...prev.medicationLogs],
          medicationPlans: prev.medicationPlans.map((item) => item.id === plan.id
            ? { ...item, inventory: item.inventory === undefined ? undefined : Math.max(0, item.inventory - 1) }
            : item),
        };
      }),
      markBathNow: () => setState((prev) => ({
        ...prev,
        bathRecords: [{ id: `${Date.now()}`, petId: currentPet.id, time: new Date().toISOString() }, ...prev.bathRecords],
      })),
      exportBackupJson: () => JSON.stringify({
        schemaVersion: 2,
        app: 'kangqiqi-daily',
        exportedAt: new Date().toISOString(),
        ...state,
      }, null, 2),
    };
  }, [currentPet, state]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppState = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be used within AppProvider');
  return ctx;
};

export const useTimeline = (): TimelineItem[] => {
  const { activities, footprints, drafts, medicalLogs, hospitalRecords, bathRecords, expenses, medicationLogs } = useAppState();
  const all: (TimelineItem & { timestamp: string })[] = [
    ...activities.map((record) => ({ kind: 'activity' as const, timestamp: record.time, ...record })),
    ...footprints.map((record) => ({ kind: 'footprint' as const, timestamp: record.date, ...record })),
    ...drafts.map((record) => ({ kind: 'draft' as const, timestamp: record.time, ...record })),
    ...medicalLogs.map((record) => ({ kind: 'medical' as const, timestamp: record.time, ...record })),
    ...hospitalRecords.map((record) => ({ kind: 'hospital' as const, timestamp: record.time, ...record })),
    ...bathRecords.map((record) => ({ kind: 'bath' as const, timestamp: record.time, ...record })),
    ...expenses.map((record) => ({ kind: 'expense' as const, timestamp: record.time, ...record })),
    ...medicationLogs.map((record) => ({ kind: 'medication' as const, timestamp: record.takenAt, ...record })),
  ];
  return all
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .map(({ timestamp, ...rest }) => rest as TimelineItem);
};
