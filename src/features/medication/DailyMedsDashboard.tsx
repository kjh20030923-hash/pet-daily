import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../theme';
import { MedicationLog, MedicationPlan } from '../../types';
import { getDailyMedicationTasks } from './medicationTasks';

export const DailyMedsDashboard: React.FC<{
  plans: MedicationPlan[];
  logs: MedicationLog[];
  onTake: (plan: MedicationPlan, scheduledAt: string) => void;
}> = ({ plans, logs, onTake }) => {
  const tasks = useMemo(() => getDailyMedicationTasks(plans, logs), [plans, logs]);

  if (tasks.length === 0) {
    return <View style={styles.empty}><Text style={styles.emptyTitle}>今天没有用药待办</Text><Text style={styles.emptyText}>可以在健康中心添加用药计划</Text></View>;
  }

  return (
    <View style={styles.card}>
      {tasks.map((task, index) => {
        const verb = task.plan.medName.includes('益生菌') ? '喂食' : '喂药';
        return (
          <Pressable
            key={task.id}
            disabled={task.isTaken}
            onPress={() => onTake(task.plan, task.scheduledAt)}
            style={[styles.row, index < tasks.length - 1 && styles.divider]}
          >
            <View style={[styles.checkbox, task.isOverdue && styles.checkboxOverdue, task.isTaken && styles.checkboxDone]}>
              {task.isTaken ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <View style={styles.copy}>
              <Text style={[styles.title, task.isTaken && styles.textDone]}>{verb} {task.plan.medName}</Text>
              <Text style={[styles.meta, task.isOverdue && styles.overdueText]}>{task.plan.dosage}{task.isOverdue ? ' · 已逾时' : task.isTaken ? ' · 已完成' : ' · 待完成'}</Text>
            </View>
            <Text style={[styles.time, task.isOverdue && styles.overdueText]}>{task.time}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { borderWidth: 0.5, borderColor: colors.borderSoft, borderRadius: radius.medium, paddingHorizontal: spacing(1.5), backgroundColor: colors.card },
  row: { minHeight: 68, flexDirection: 'row', alignItems: 'center' },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSoft },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: colors.accentStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  checkboxOverdue: { borderColor: colors.danger, backgroundColor: '#FFF3F2' },
  checkboxDone: { borderColor: colors.accentStrong, backgroundColor: colors.accentStrong },
  checkmark: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  copy: { flex: 1, marginLeft: spacing(1.25) },
  title: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  meta: { marginTop: 4, color: colors.textSecondary, fontSize: 12 },
  time: { color: colors.textPrimary, fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },
  overdueText: { color: colors.danger },
  textDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  empty: { minHeight: 92, borderWidth: 0.5, borderColor: colors.borderSoft, borderRadius: radius.medium, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  emptyTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  emptyText: { marginTop: 5, color: colors.textSecondary, fontSize: 11 },
});
