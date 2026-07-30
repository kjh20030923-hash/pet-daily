import { AppIconName } from '../../components/AppIcon';
import { colors } from '../../theme';
import { ActivityType, PetProfile } from '../../types';

export type QuickActionType = ActivityType | 'bath' | 'diary';

export type QuickActionConfig = {
  id: string;
  title: string;
  hint: string;
  iconName: AppIconName;
  color: string;
  actionType: QuickActionType;
  placeholder?: string;
  requiresDetail?: boolean;
};

const feedAction: QuickActionConfig = {
  id: 'feed',
  title: '喂食',
  hint: '食物与份量',
  iconName: 'feed',
  color: colors.sandSoft,
  actionType: 'feed',
  placeholder: '吃了什么、多少份量',
  requiresDetail: true,
};

const bathAction: QuickActionConfig = {
  id: 'bath',
  title: '洗澡',
  hint: '护理记录',
  iconName: 'bath',
  color: colors.blueSoft,
  actionType: 'bath',
};

const internalDewormAction: QuickActionConfig = {
  id: 'deworm-internal',
  title: '内驱',
  hint: '体内驱虫',
  iconName: 'deworm',
  color: colors.roseSoft,
  actionType: 'deworm-internal',
  placeholder: '药品名称、剂量（可选）',
};

const externalDewormAction: QuickActionConfig = {
  id: 'deworm-external',
  title: '外驱',
  hint: '体外驱虫',
  iconName: 'deworm',
  color: colors.accentSoft,
  actionType: 'deworm-external',
  placeholder: '药品名称、用量（可选）',
};

const vaccineAction: QuickActionConfig = {
  id: 'vaccine',
  title: '疫苗',
  hint: '接种记录',
  iconName: 'hospital',
  color: colors.blueSoft,
  actionType: 'vaccine',
  placeholder: '疫苗名称或批次（可选）',
};

const diaryAction: QuickActionConfig = {
  id: 'diary',
  title: '写日记',
  hint: '记录片刻',
  iconName: 'diary',
  color: colors.accentSoft,
  actionType: 'diary',
};

const poopAction: QuickActionConfig = {
  id: 'poop',
  title: '便便',
  hint: '便便状态',
  iconName: 'litter',
  color: colors.blueSoft,
  actionType: 'litter',
  placeholder: '便便状态、颜色或次数（可选）',
};

export const ACTION_CONFIG_MAP = {
  dog: [
    feedAction,
    {
      id: 'walk',
      title: '遛狗',
      hint: '外出活动',
      iconName: 'walk',
      color: colors.accentSoft,
      actionType: 'walk',
      placeholder: '去了哪里、走了多久（可选）',
    },
    poopAction,
    bathAction,
    internalDewormAction,
    externalDewormAction,
    vaccineAction,
    diaryAction,
  ],
  cat: [
    feedAction,
    {
      id: 'litter',
      title: '铲屎',
      hint: '猫砂观察',
      iconName: 'litter',
      color: colors.blueSoft,
      actionType: 'litter',
      placeholder: '便便、尿团或猫砂情况（可选）',
    },
    bathAction,
    internalDewormAction,
    externalDewormAction,
    vaccineAction,
    diaryAction,
  ],
  other: [feedAction, bathAction, internalDewormAction, externalDewormAction, vaccineAction, diaryAction],
} satisfies Record<PetProfile['kind'], readonly QuickActionConfig[]>;

export const ACTIVITY_TITLE_MAP: Record<ActivityType, string> = {
  feed: '喂食',
  walk: '遛狗',
  medicine: '用药',
  alert: '异常',
  litter: '铲屎',
  deworm: '驱虫',
  'deworm-internal': '体内驱虫',
  'deworm-external': '体外驱虫',
  vaccine: '疫苗',
};

export const isActivityAction = (actionType: QuickActionType): actionType is ActivityType =>
  actionType !== 'bath' && actionType !== 'diary';
