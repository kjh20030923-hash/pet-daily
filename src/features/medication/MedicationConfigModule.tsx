import React, { useMemo, useState } from 'react';
import {
  Alert,
  GestureResponderEvent,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, radius, spacing } from '../../theme';
import { MedicationFrequency, MedicationPlan, PetProfile } from '../../types';
import { cancelMedicationNotifications, scheduleMedicationNotifications } from './medicationNotifications';

const DEFAULT_TIMES = ['08:00'];

const frequencyFromTimes = (times: string[]): MedicationFrequency => {
  if (times.length === 1) return 'once_daily';
  if (times.length === 2) return 'twice_daily';
  if (times.length === 3) return 'three_times_daily';
  return 'custom';
};

const atEndOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
const formatDate = (date: Date) => `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;

const DosageSlider: React.FC<{ value: number; onChange: (value: number) => void }> = ({ value, onChange }) => {
  const [width, setWidth] = useState(1);
  const min = 0.25;
  const max = 10;
  const progress = (value - min) / (max - min);
  const update = (event: GestureResponderEvent) => {
    const ratio = Math.min(1, Math.max(0, event.nativeEvent.locationX / width));
    onChange(Math.round((min + ratio * (max - min)) * 4) / 4);
  };
  return (
    <View
      style={styles.sliderTouch}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={update}
      onResponderMove={update}
    >
      <View style={styles.sliderTrack}><View style={[styles.sliderFill, { width: `${progress * 100}%` }]} /></View>
      <View style={[styles.sliderThumb, { left: Math.max(0, progress * width - 10) }]} />
    </View>
  );
};

export const MedicationConfigModule: React.FC<{
  pet: PetProfile;
  plans: MedicationPlan[];
  onUpsert: (plan: MedicationPlan) => void;
  onComplete: (planId: string) => void;
}> = ({ pet, plans, onUpsert, onComplete }) => {
  const activePlans = useMemo(() => plans.filter((plan) => !plan.isCompleted), [plans]);
  const [visible, setVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MedicationPlan>();
  const [medName, setMedName] = useState('');
  const [dosageValue, setDosageValue] = useState(0.5);
  const [dosageUnit, setDosageUnit] = useState<'片' | 'ml'>('片');
  const [times, setTimes] = useState<string[]>(DEFAULT_TIMES);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [timeDraft, setTimeDraft] = useState(new Date(2026, 0, 1, 8, 0));
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(atEndOfDay(new Date(Date.now() + 30 * 86_400_000)));
  const [inventory, setInventory] = useState('');
  const [warningThreshold, setWarningThreshold] = useState('5');
  const [saving, setSaving] = useState(false);

  const openEditor = (plan?: MedicationPlan) => {
    setEditingPlan(plan);
    setMedName(plan?.medName ?? '');
    const dosageMatch = plan?.dosage.match(/^([\d.]+)(.*)$/);
    setDosageValue(dosageMatch ? Number(dosageMatch[1]) : 0.5);
    setDosageUnit(dosageMatch?.[2] === 'ml' ? 'ml' : '片');
    setTimes(plan?.times ?? DEFAULT_TIMES);
    setStartDate(plan ? new Date(plan.startDate) : new Date());
    setEndDate(plan ? new Date(plan.endDate) : atEndOfDay(new Date(Date.now() + 30 * 86_400_000)));
    setInventory(plan?.inventory === undefined ? '' : String(plan.inventory));
    setWarningThreshold(String(plan?.inventoryWarningThreshold ?? 5));
    setVisible(true);
  };

  const addTime = () => {
    const nextTime = `${String(timeDraft.getHours()).padStart(2, '0')}:${String(timeDraft.getMinutes()).padStart(2, '0')}`;
    setTimes((current) => [...new Set([...current, nextTime])].sort());
    setTimePickerVisible(false);
  };

  const save = async () => {
    if (!medName.trim()) {
      Alert.alert('请填写药物名称');
      return;
    }
    if (times.length === 0) {
      Alert.alert('请至少添加一个提醒时间');
      return;
    }
    if (endDate < startDate) {
      Alert.alert('疗程结束日期不能早于开始日期');
      return;
    }

    setSaving(true);
    const plan: MedicationPlan = {
      id: editingPlan?.id ?? `med-plan-${Date.now()}`,
      petId: pet.id,
      medName: medName.trim(),
      dosage: `${dosageValue}${dosageUnit}`,
      frequency: frequencyFromTimes(times),
      times,
      startDate: startDate.toISOString(),
      endDate: atEndOfDay(endDate).toISOString(),
      inventory: inventory.trim() && Number.isFinite(Number(inventory)) ? Math.max(0, Number(inventory)) : undefined,
      inventoryWarningThreshold: inventory.trim() ? Math.max(0, Number(warningThreshold) || 0) : undefined,
      isCompleted: false,
    };

    try {
      if (editingPlan?.notificationIds) await cancelMedicationNotifications(editingPlan.notificationIds);
      const notification = await scheduleMedicationNotifications(plan, pet);
      onUpsert({ ...plan, notificationIds: notification.notificationIds });
      setVisible(false);
      if (notification.status === 'denied') Alert.alert('计划已保存', '通知权限未开启，可稍后在系统设置中允许提醒。');
      if (notification.status === 'unavailable') Alert.alert('计划已保存', '当前运行环境暂无法调度本地通知。');
    } catch {
      onUpsert(plan);
      setVisible(false);
      Alert.alert('计划已保存', '提醒调度失败，可编辑计划后重试。');
    } finally {
      setSaving(false);
    }
  };

  const complete = (plan: MedicationPlan) => {
    Alert.alert('结束疗程', `确认将 ${plan.medName} 标记为已完成？`, [
      { text: '取消', style: 'cancel' },
      { text: '确认结束', onPress: () => {
        cancelMedicationNotifications(plan.notificationIds).catch(() => {});
        onComplete(plan.id);
      } },
    ]);
  };

  return (
    <>
      <View style={styles.module}>
        <View style={styles.moduleHeader}><View><Text style={styles.moduleTitle}>用药计划</Text><Text style={styles.moduleSubtitle}>{activePlans.length} 个正在进行的疗程</Text></View><Pressable style={styles.addButton} onPress={() => openEditor()}><Text style={styles.addText}>+ 添加</Text></Pressable></View>
        {activePlans.length === 0 ? <View style={styles.empty}><Text style={styles.emptyText}>还没有用药计划</Text></View> : activePlans.map((plan) => {
          const remaining = Math.max(0, Math.ceil((new Date(plan.endDate).getTime() - Date.now()) / 86_400_000));
          const inventoryLow = plan.inventory !== undefined && plan.inventoryWarningThreshold !== undefined && plan.inventory <= plan.inventoryWarningThreshold;
          return <Pressable key={plan.id} style={styles.planCard} onPress={() => openEditor(plan)}>
            <View style={styles.planTop}><Text style={styles.planName}>{plan.medName}</Text><Text style={styles.remaining}>剩 {remaining} 天</Text></View>
            <Text style={styles.planMeta}>{plan.dosage} · {plan.times.join(' / ')}</Text>
            <View style={styles.planBottom}><Text style={[styles.inventory, inventoryLow && styles.warning]}>{plan.inventory === undefined ? '未设置库存' : `库存 ${plan.inventory}${inventoryLow ? ' · 即将用完' : ''}`}</Text><Pressable hitSlop={8} onPress={(event) => { event.stopPropagation(); complete(plan); }}><Text style={styles.completeText}>结束疗程</Text></Pressable></View>
          </Pressable>;
        })}
      </View>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setVisible(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
              <View style={styles.sheetHeader}><View><Text style={styles.sheetTitle}>{editingPlan ? '编辑用药计划' : '新增用药计划'}</Text><Text style={styles.sheetHint}>为 {pet.name} 安排疗程与提醒</Text></View><Pressable onPress={() => setVisible(false)}><Text style={styles.cancel}>取消</Text></Pressable></View>
              <Text style={styles.label}>药物名称</Text><TextInput style={styles.input} value={medName} onChangeText={setMedName} placeholder="例如：阿莫西林" placeholderTextColor={colors.textMuted} />
              <View style={styles.labelRow}><Text style={styles.label}>每次剂量</Text><Text style={styles.dosageValue}>{dosageValue}{dosageUnit}</Text></View>
              <DosageSlider value={dosageValue} onChange={setDosageValue} />
              <View style={styles.unitRow}>{(['片', 'ml'] as const).map((unit) => <Pressable key={unit} style={[styles.unit, dosageUnit === unit && styles.unitActive]} onPress={() => setDosageUnit(unit)}><Text style={styles.unitText}>{unit}</Text></Pressable>)}</View>
              <Text style={styles.label}>提醒时间</Text><View style={styles.timeChips}>{times.map((time) => <Pressable key={time} style={styles.timeChip} onPress={() => setTimes((current) => current.filter((item) => item !== time))}><Text style={styles.timeText}>{time} ×</Text></Pressable>)}<Pressable style={styles.timeAdd} onPress={() => setTimePickerVisible(true)}><Text style={styles.timeAddText}>+ 时间</Text></Pressable></View>
              {timePickerVisible ? <View style={styles.timePicker}><DateTimePicker value={timeDraft} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(_, value) => value && setTimeDraft(value)} /><Pressable style={styles.timeConfirm} onPress={addTime}><Text style={styles.timeConfirmText}>添加此时间</Text></Pressable></View> : null}
              <View style={styles.dateRow}><View style={styles.dateBlock}><Text style={styles.label}>开始日期</Text><DateTimePicker value={startDate} mode="date" display="compact" onChange={(_, value) => value && setStartDate(value)} /><Text style={styles.dateText}>{formatDate(startDate)}</Text></View><View style={styles.dateBlock}><Text style={styles.label}>结束日期</Text><DateTimePicker value={endDate} mode="date" display="compact" onChange={(_, value) => value && setEndDate(value)} /><Text style={styles.dateText}>{formatDate(endDate)}</Text></View></View>
              <Text style={styles.label}>库存与预警（可选）</Text><View style={styles.inventoryRow}><TextInput style={[styles.input, styles.inventoryInput]} value={inventory} onChangeText={setInventory} keyboardType="decimal-pad" placeholder="当前库存" placeholderTextColor={colors.textMuted} /><TextInput style={[styles.input, styles.inventoryInput]} value={warningThreshold} onChangeText={setWarningThreshold} keyboardType="decimal-pad" placeholder="低于此数预警" placeholderTextColor={colors.textMuted} /></View>
              <Pressable style={[styles.saveButton, saving && styles.disabled]} disabled={saving} onPress={save}><Text style={styles.saveText}>{saving ? '正在调度提醒...' : '保存用药计划'}</Text></Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  module: { marginTop: spacing(2), padding: spacing(2), borderRadius: radius.large, borderWidth: 0.5, borderColor: colors.borderSoft, backgroundColor: colors.card },
  moduleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  moduleTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
  moduleSubtitle: { marginTop: 4, color: colors.textSecondary, fontSize: 12 },
  addButton: { minHeight: 36, paddingHorizontal: spacing(1), borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  addText: { color: colors.accentStrong, fontSize: 12, fontWeight: '800' },
  empty: { minHeight: 82, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textSecondary, fontSize: 12 },
  planCard: { marginTop: spacing(1.5), padding: spacing(1.25), borderRadius: radius.medium, borderWidth: 0.5, borderColor: colors.borderSoft, backgroundColor: colors.background },
  planTop: { flexDirection: 'row', justifyContent: 'space-between' },
  planName: { color: colors.textPrimary, fontSize: 15, fontWeight: '800' },
  remaining: { color: colors.accentStrong, fontSize: 12, fontWeight: '800' },
  planMeta: { marginTop: 6, color: colors.textSecondary, fontSize: 12 },
  planBottom: { marginTop: spacing(1), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inventory: { color: colors.textMuted, fontSize: 11 },
  warning: { color: colors.danger, fontWeight: '800' },
  completeText: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(53,37,31,0.25)' },
  sheet: { maxHeight: '94%', borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: colors.card },
  sheetContent: { padding: spacing(2.5), paddingBottom: spacing(5) },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  sheetTitle: { color: colors.textPrimary, fontSize: 21, fontWeight: '900' },
  sheetHint: { marginTop: 5, color: colors.textSecondary, fontSize: 12 },
  cancel: { color: colors.accentStrong, fontSize: 14, fontWeight: '800' },
  label: { marginTop: spacing(2), color: colors.textPrimary, fontSize: 12, fontWeight: '800' },
  labelRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  dosageValue: { color: colors.accentStrong, fontSize: 18, fontWeight: '900' },
  input: { minHeight: 50, marginTop: spacing(0.75), paddingHorizontal: spacing(1.25), borderRadius: radius.medium, borderWidth: 0.5, borderColor: colors.borderSoft, backgroundColor: colors.background, color: colors.textPrimary, fontSize: 14 },
  sliderTouch: { height: 38, marginTop: spacing(1), justifyContent: 'center' },
  sliderTrack: { height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: colors.borderSoft },
  sliderFill: { height: '100%', backgroundColor: colors.accentStrong },
  sliderThumb: { position: 'absolute', width: 20, height: 20, borderRadius: 10, borderWidth: 4, borderColor: colors.card, backgroundColor: colors.accentStrong },
  unitRow: { flexDirection: 'row', gap: spacing(0.75) },
  unit: { minWidth: 54, minHeight: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  unitActive: { backgroundColor: colors.accentSoft },
  unitText: { color: colors.textPrimary, fontSize: 12, fontWeight: '800' },
  timeChips: { marginTop: spacing(1), flexDirection: 'row', flexWrap: 'wrap', gap: spacing(0.75) },
  timeChip: { minHeight: 36, paddingHorizontal: spacing(1.25), borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  timeText: { color: colors.accentStrong, fontSize: 12, fontWeight: '800' },
  timeAdd: { minHeight: 36, paddingHorizontal: spacing(1.25), borderRadius: radius.pill, borderWidth: 0.5, borderColor: colors.borderSoft, alignItems: 'center', justifyContent: 'center' },
  timeAddText: { color: colors.textSecondary, fontSize: 12, fontWeight: '800' },
  timePicker: { marginTop: spacing(1), padding: spacing(1), borderRadius: radius.medium, backgroundColor: colors.background },
  timeConfirm: { minHeight: 40, borderRadius: radius.medium, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentStrong },
  timeConfirmText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  dateRow: { flexDirection: 'row', gap: spacing(1) },
  dateBlock: { flex: 1 },
  dateText: { marginTop: 5, color: colors.textSecondary, fontSize: 11 },
  inventoryRow: { flexDirection: 'row', gap: spacing(1) },
  inventoryInput: { flex: 1 },
  saveButton: { minHeight: 52, marginTop: spacing(2.5), borderRadius: radius.medium, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentStrong },
  saveText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.55 },
});
