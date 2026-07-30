import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon, AppIconName } from '../../components/AppIcon';
import { ActivityRecord, ActivityType, BathRecord } from '../../types';
import { colors, radius, shadow, spacing } from '../../theme';

type RoutineState = 'normal' | 'due-soon' | 'overdue';
type RoutineDefinition = {
  id: string;
  title: string;
  cycleDays: number;
  activityTypes?: ActivityType[];
  useBathRecord?: boolean;
  iconName: AppIconName;
};

export type RoutineHistoryItem = {
  id: string;
  time: string;
  detail?: string;
};

export type RoutineCardData = RoutineDefinition & {
  lastTime?: string;
  days: number;
  progress: number;
  state: RoutineState;
  hint: string;
  history: RoutineHistoryItem[];
};

const ROUTINE_DEFINITIONS: RoutineDefinition[] = [
  { id: 'bath', title: '洗澡', cycleDays: 30, useBathRecord: true, iconName: 'bath' },
  { id: 'external', title: '体外驱虫', cycleDays: 30, activityTypes: ['deworm-external'], iconName: 'deworm' },
  { id: 'internal', title: '体内驱虫', cycleDays: 90, activityTypes: ['deworm-internal'], iconName: 'deworm' },
  { id: 'vaccine', title: '疫苗', cycleDays: 365, activityTypes: ['vaccine'], iconName: 'hospital' },
];

const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));

const getLastActivityTime = (activities: ActivityRecord[], definition: RoutineDefinition) => {
  const matching = getActivityHistory(activities, definition);
  return matching[0]?.time;
};

const getActivityHistory = (activities: ActivityRecord[], definition: RoutineDefinition) =>
  activities.filter((activity) => {
    if (definition.activityTypes?.includes(activity.type)) return true;
    if (activity.type !== 'deworm') return false;
    const detail = activity.detail ?? '';
    if (definition.id === 'internal') return detail.includes('内') || !detail.includes('外');
    if (definition.id === 'external') return detail.includes('外') || !detail.includes('内');
    return false;
  }).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

const getRoutineState = (days: number, cycleDays: number): RoutineState => {
  if (days > cycleDays) return 'overdue';
  if (days / cycleDays >= 0.9) return 'due-soon';
  return 'normal';
};

const CircularProgressRing: React.FC<{ progress: number; label: string; color: string }> = ({ progress, label, color }) => {
  const segmentCount = 24;
  const activeCount = Math.round(Math.min(1, Math.max(0, progress)) * segmentCount);
  const center = 31;
  const ringRadius = 25;
  return (
    <View style={styles.ring}>
      {Array.from({ length: segmentCount }, (_, index) => {
        const angle = (index / segmentCount) * Math.PI * 2;
        return <View key={index} style={[styles.ringSegment, {
          left: center + Math.sin(angle) * ringRadius - 1.5,
          top: center - Math.cos(angle) * ringRadius - 3,
          backgroundColor: index < activeCount ? color : '#EAE5DF',
          transform: [{ rotate: `${index * (360 / segmentCount)}deg` }],
        }]} />;
      })}
      <Text style={styles.ringValue}>{label}</Text>
      {label !== '--' ? <Text style={styles.ringUnit}>天</Text> : null}
    </View>
  );
};

export const RoutineStatusDashboard: React.FC<{
  activities: ActivityRecord[];
  bathRecords: BathRecord[];
  onSelectRoutine?: (routine: RoutineCardData) => void;
}> = ({ activities, bathRecords, onSelectRoutine }) => {
  const cards = useMemo<RoutineCardData[]>(() => ROUTINE_DEFINITIONS.map((definition) => {
    const history = definition.useBathRecord
      ? [...bathRecords]
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .map((record) => ({ id: record.id, time: record.time, detail: '洗澡护理' }))
      : getActivityHistory(activities, definition).map((record) => ({
        id: record.id,
        time: record.time,
        detail: record.detail,
      }));
    const lastTime = definition.useBathRecord ? history[0]?.time : getLastActivityTime(activities, definition);
    if (!lastTime) return { ...definition, lastTime, days: 0, progress: 0, state: 'normal', hint: '暂无记录', history };
    const days = daysSince(lastTime);
    const state = getRoutineState(days, definition.cycleDays);
    const remaining = definition.cycleDays - days;
    const hint = state === 'overdue' ? `已逾期 ${Math.abs(remaining)} 天` : state === 'due-soon' ? `即将到期 · 剩 ${remaining} 天` : `距建议日还有 ${remaining} 天`;
    return { ...definition, lastTime, days, progress: days / definition.cycleDays, state, hint, history };
  }), [activities, bathRecords]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>护理提醒</Text>
        <Text style={styles.headerAction}>查看全部 ›</Text>
      </View>
      <View style={styles.grid}>
      {cards.map((card) => {
        const accent = card.state === 'overdue' ? colors.danger : card.state === 'due-soon' ? '#C98245' : colors.accentStrong;
        return (
          <Pressable
            key={card.id}
            style={({ pressed }) => [styles.routineItem, pressed && styles.itemPressed]}
            onPress={() => onSelectRoutine?.(card)}
          >
            <View style={styles.itemIcon}>
              <AppIcon name={card.iconName} size="small" tint={colors.textSecondary} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>{card.title}</Text>
              <Text style={[styles.hint, card.state !== 'normal' && { color: accent }]}>{card.hint}</Text>
            </View>
          </Pressable>
        );
      })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { marginHorizontal: spacing(2.5), padding: spacing(1.5), borderRadius: radius.large, borderWidth: 0.5, borderColor: colors.borderSoft, backgroundColor: colors.card, ...shadow.soft },
  header: { marginBottom: spacing(0.5), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '900' },
  headerAction: { color: colors.textSecondary, fontSize: 12, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  routineItem: { width: '50%', minHeight: 68, flexDirection: 'row', alignItems: 'center', paddingVertical: spacing(0.75), paddingRight: spacing(0.75) },
  itemPressed: { opacity: 0.68 },
  itemIcon: { width: 38, height: 38, marginRight: spacing(1), borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  ring: { width: 62, height: 62, alignItems: 'center', justifyContent: 'center' },
  ringSegment: { position: 'absolute', width: 3, height: 6, borderRadius: 2 },
  ringValue: { marginTop: -4, color: colors.textPrimary, fontSize: 19, fontWeight: '900' },
  ringUnit: { marginTop: -2, color: colors.textSecondary, fontSize: 9, fontWeight: '700' },
  copy: { flex: 1, minWidth: 0 },
  title: { color: colors.textPrimary, fontSize: 15, fontWeight: '900' },
  hint: { marginTop: 4, color: colors.textSecondary, fontSize: 11, lineHeight: 15 },
});
