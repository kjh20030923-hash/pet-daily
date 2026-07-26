import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActivityRecord, ActivityType, BathRecord } from '../../types';
import { colors, radius, shadow, spacing } from '../../theme';

type RoutineState = 'normal' | 'due-soon' | 'overdue';
type RoutineDefinition = {
  id: string;
  title: string;
  cycleDays: number;
  activityTypes?: ActivityType[];
  useBathRecord?: boolean;
};

const ROUTINE_DEFINITIONS: RoutineDefinition[] = [
  { id: 'bath', title: '洗澡', cycleDays: 30, useBathRecord: true },
  { id: 'internal', title: '体内驱虫', cycleDays: 90, activityTypes: ['deworm-internal'] },
  { id: 'external', title: '体外驱虫', cycleDays: 30, activityTypes: ['deworm-external'] },
  { id: 'vaccine', title: '疫苗', cycleDays: 365, activityTypes: ['vaccine'] },
];

const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));

const getLastActivityTime = (activities: ActivityRecord[], definition: RoutineDefinition) => {
  const matching = activities.filter((activity) => {
    if (definition.activityTypes?.includes(activity.type)) return true;
    if (activity.type !== 'deworm') return false;
    const detail = activity.detail ?? '';
    if (definition.id === 'internal') return detail.includes('内') || !detail.includes('外');
    if (definition.id === 'external') return detail.includes('外') || !detail.includes('内');
    return false;
  });
  return matching.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())[0]?.time;
};

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

export const RoutineStatusDashboard: React.FC<{ activities: ActivityRecord[]; bathRecords: BathRecord[] }> = ({ activities, bathRecords }) => {
  const cards = useMemo(() => ROUTINE_DEFINITIONS.map((definition) => {
    const lastTime = definition.useBathRecord ? bathRecords[0]?.time : getLastActivityTime(activities, definition);
    if (!lastTime) return { ...definition, lastTime, days: 0, progress: 0, state: 'normal' as RoutineState, hint: '暂无记录' };
    const days = daysSince(lastTime);
    const state = getRoutineState(days, definition.cycleDays);
    const remaining = definition.cycleDays - days;
    const hint = state === 'overdue' ? `已逾期 ${Math.abs(remaining)} 天` : state === 'due-soon' ? `即将到期 · 剩 ${remaining} 天` : `距建议日还有 ${remaining} 天`;
    return { ...definition, lastTime, days, progress: days / definition.cycleDays, state, hint };
  }), [activities, bathRecords]);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {cards.map((card) => {
        const accent = card.state === 'overdue' ? colors.danger : card.state === 'due-soon' ? '#C98245' : colors.accentStrong;
        return (
          <View key={card.id} style={[styles.card, card.state === 'overdue' && styles.cardOverdue]}>
            <CircularProgressRing progress={card.progress} label={card.lastTime ? String(card.days) : '--'} color={accent} />
            <View style={styles.copy}>
              <Text style={styles.title}>{card.title}</Text>
              <Text style={[styles.hint, card.state !== 'normal' && { color: accent }]}>{card.hint}</Text>
              <Text style={styles.cycle}>建议周期 {card.cycleDays} 天</Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: { paddingHorizontal: spacing(2.5), paddingVertical: 3, gap: spacing(1.25) },
  card: { width: 228, minHeight: 104, paddingHorizontal: spacing(1.25), borderRadius: radius.large, borderWidth: 0.5, borderColor: colors.borderSoft, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, ...shadow.soft },
  cardOverdue: { backgroundColor: '#FFF3F2' },
  ring: { width: 62, height: 62, alignItems: 'center', justifyContent: 'center' },
  ringSegment: { position: 'absolute', width: 3, height: 6, borderRadius: 2 },
  ringValue: { marginTop: -4, color: colors.textPrimary, fontSize: 19, fontWeight: '900' },
  ringUnit: { marginTop: -2, color: colors.textSecondary, fontSize: 9, fontWeight: '700' },
  copy: { flex: 1, marginLeft: spacing(1.25) },
  title: { color: colors.textPrimary, fontSize: 15, fontWeight: '900' },
  hint: { marginTop: 6, color: colors.textSecondary, fontSize: 11, lineHeight: 16 },
  cycle: { marginTop: 3, color: colors.textMuted, fontSize: 9 },
});
