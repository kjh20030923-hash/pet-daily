import { MedicationLog, MedicationPlan } from '../../types';

export type DailyMedicationTask = {
  id: string;
  plan: MedicationPlan;
  time: string;
  scheduledAt: string;
  isTaken: boolean;
  isOverdue: boolean;
};

const toDayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const toComparableDay = (value: string) => toDayKey(new Date(value));

export const getDailyMedicationTasks = (
  plans: MedicationPlan[],
  logs: MedicationLog[],
  now = new Date(),
): DailyMedicationTask[] => {
  const todayKey = toDayKey(now);
  return plans
    .filter((plan) => !plan.isCompleted
      && toComparableDay(plan.startDate) <= todayKey
      && toComparableDay(plan.endDate) >= todayKey)
    .flatMap((plan) => plan.times.map((time) => {
      const [hours, minutes] = time.split(':').map(Number);
      const scheduled = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
      const scheduledAt = scheduled.toISOString();
      const isTaken = logs.some((log) => log.planId === plan.id && log.scheduledAt === scheduledAt);
      return {
        id: `${plan.id}-${todayKey}-${time}`,
        plan,
        time,
        scheduledAt,
        isTaken,
        isOverdue: !isTaken && scheduled.getTime() < now.getTime(),
      };
    }))
    .sort((a, b) => a.time.localeCompare(b.time));
};
