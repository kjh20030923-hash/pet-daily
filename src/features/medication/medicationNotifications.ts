import { requireOptionalNativeModule } from 'expo-modules-core';
import { MedicationPlan, PetProfile } from '../../types';

type PermissionResponse = { granted?: boolean; status?: string };
type PermissionsModule = {
  getPermissionsAsync?: () => Promise<PermissionResponse>;
  requestPermissionsAsync?: (permissions?: object) => Promise<PermissionResponse>;
};
type SchedulerModule = {
  scheduleNotificationAsync?: (identifier: string, content: object, trigger: object) => Promise<string>;
  cancelScheduledNotificationAsync?: (identifier: string) => Promise<void>;
};

export type NotificationScheduleStatus = 'scheduled' | 'denied' | 'unavailable';

const getNativeModules = () => ({
  permissions: requireOptionalNativeModule<PermissionsModule>('ExpoNotificationPermissionsModule'),
  scheduler: requireOptionalNativeModule<SchedulerModule>('ExpoNotificationScheduler'),
});

const hasPermission = (permission?: PermissionResponse) =>
  permission?.granted === true || permission?.status === 'granted';

const getOccurrences = (plan: MedicationPlan, now = new Date()) => {
  const start = new Date(plan.startDate);
  const end = new Date(plan.endDate);
  const cursor = new Date(Math.max(start.getTime(), new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()));
  const occurrences: Date[] = [];

  // iOS keeps at most 64 pending notifications, so reserve room below that limit.
  while (cursor <= end && occurrences.length < 60) {
    for (const time of plan.times) {
      const [hours, minutes] = time.split(':').map(Number);
      const occurrence = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), hours, minutes, 0, 0);
      if (occurrence > now && occurrence <= end) occurrences.push(occurrence);
      if (occurrences.length >= 60) break;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return occurrences;
};

export const cancelMedicationNotifications = async (notificationIds: string[] = []) => {
  const { scheduler } = getNativeModules();
  if (!scheduler?.cancelScheduledNotificationAsync) return;
  await Promise.all(notificationIds.map((id) => scheduler.cancelScheduledNotificationAsync?.(id).catch(() => {})));
};

export const scheduleMedicationNotifications = async (
  plan: MedicationPlan,
  pet: PetProfile,
): Promise<{ status: NotificationScheduleStatus; notificationIds: string[] }> => {
  const { permissions, scheduler } = getNativeModules();
  if (!permissions?.requestPermissionsAsync || !scheduler?.scheduleNotificationAsync) {
    return { status: 'unavailable', notificationIds: [] };
  }

  let permission = await permissions.getPermissionsAsync?.();
  if (!hasPermission(permission)) permission = await permissions.requestPermissionsAsync();
  if (!hasPermission(permission)) return { status: 'denied', notificationIds: [] };

  const identifiers: string[] = [];
  for (const [index, occurrence] of getOccurrences(plan).entries()) {
    const identifier = `med-${plan.id}-${occurrence.getTime()}-${index}`;
    await scheduler.scheduleNotificationAsync(identifier, {
      title: '用药提醒',
      body: `该给 ${pet.name} 喂 ${plan.medName} 啦`,
      sound: 'default',
      data: {
        type: 'medication-reminder',
        petId: pet.id,
        petName: pet.name,
        petAvatar: pet.customImageURL ?? null,
        planId: plan.id,
        medName: plan.medName,
        dosage: plan.dosage,
      },
      attachments: pet.customImageURL ? [{ identifier: 'pet-avatar', url: pet.customImageURL }] : [],
    }, {
      type: 'date',
      timestamp: occurrence.getTime(),
      repeats: false,
    });
    identifiers.push(identifier);
  }
  return { status: 'scheduled', notificationIds: identifiers };
};
