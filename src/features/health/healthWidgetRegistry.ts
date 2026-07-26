import { HealthWidgetId, PetProfile } from '../../types';

export type HealthModuleId = 'weight' | 'hospital-records' | HealthWidgetId;

export type HealthWidgetDefinition = {
  id: HealthModuleId;
  title: string;
  description: string;
  optional: boolean;
};

export const healthWidgetRegistry: HealthWidgetDefinition[] = [
  { id: 'seizure-tracker', title: '癫痫发作管理', description: '发作计时、状态与历史记录', optional: true },
  { id: 'weight', title: '体重记录', description: '查看体重变化趋势', optional: false },
  { id: 'hospital-records', title: '就诊档案', description: '保存医院、检查结果和化验单', optional: false },
];

export const getEnabledOptionalWidgets = (pet: PetProfile): HealthWidgetId[] => {
  return pet.seizure_enabled ? ['seizure-tracker'] : [];
};
