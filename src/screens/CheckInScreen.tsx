import React, { useMemo, useState } from 'react';
import {
  Alert,
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
import { RouteProp, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from '../components/AppIcon';
import { CalendarLineIcon } from '../components/CalendarLineIcon';
import { PetSwitcher } from '../components/PetSwitcher';
import {
  ACTION_CONFIG_MAP,
  isActivityAction,
  QuickActionConfig,
} from '../features/checkin/actionConfig';
import { RoutineStatusDashboard } from '../features/home/RoutineStatusDashboard';
import { TodayFeed } from '../features/home/TodayFeed';
import { DailyMedsDashboard } from '../features/medication/DailyMedsDashboard';
import { getDailyMedicationTasks } from '../features/medication/medicationTasks';
import { useAppState, useTimeline } from '../store';
import { colors, radius, spacing } from '../theme';
import { TimelineItem } from '../types';
import { TimelineScreen } from './TimelineScreen';
import type { RootTabParamList } from '../navigation/BottomTabs';

const itemTime = (item: TimelineItem) => item.kind === 'footprint' ? item.date : item.kind === 'medication' ? item.takenAt : item.time;

export const CheckInScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootTabParamList, 'Home'>>();
  const {
    currentPet,
    activities,
    bathRecords,
    medicationPlans,
    medicationLogs,
    addActivity,
    addBathRecord,
    addDraft,
    logMedicationDose,
  } = useAppState();
  const timeline = useTimeline();
  const [timelineVisible, setTimelineVisible] = useState(false);
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const [bathVisible, setBathVisible] = useState(false);
  const [recordVisible, setRecordVisible] = useState(false);
  const [diaryVisible, setDiaryVisible] = useState(false);
  const [activeAction, setActiveAction] = useState<QuickActionConfig | null>(null);
  const [date, setDate] = useState(new Date());
  const [detail, setDetail] = useState('');
  const [diary, setDiary] = useState('');
  const quickActions = ACTION_CONFIG_MAP[currentPet.kind];

  const todayItems = useMemo(() => timeline.filter((item) => {
    const itemDate = new Date(itemTime(item));
    return itemDate.toDateString() === new Date().toDateString();
  }), [timeline]);
  const todayMedicationTasks = useMemo(
    () => getDailyMedicationTasks(medicationPlans, medicationLogs),
    [medicationLogs, medicationPlans],
  );

  React.useEffect(() => {
    if (route.params?.quickAddToken) setQuickAddVisible(true);
  }, [route.params?.quickAddToken]);

  const handleAction = (action: QuickActionConfig) => {
    setQuickAddVisible(false);
    setDate(new Date());
    if (action.actionType === 'bath') {
      setBathVisible(true);
      return;
    }
    if (action.actionType === 'diary') {
      setDiary('');
      setDiaryVisible(true);
      return;
    }
    setActiveAction(action);
    setDetail('');
    setRecordVisible(true);
  };

  const saveActivity = () => {
    if (!activeAction || !isActivityAction(activeAction.actionType)) return;
    if (activeAction.requiresDetail && !detail.trim()) {
      Alert.alert(`请填写${activeAction.title}详情`);
      return;
    }
    addActivity({
      id: `${Date.now()}`,
      type: activeAction.actionType,
      time: date.toISOString(),
      detail: detail.trim() || undefined,
    });
    setRecordVisible(false);
  };

  const saveDiary = () => {
    if (!diary.trim()) {
      Alert.alert('先写下一点内容吧');
      return;
    }
    addDraft({ id: `${Date.now()}`, content: diary.trim(), time: new Date().toISOString() });
    setDiaryVisible(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <PetSwitcher />
          <Pressable style={styles.calendarButton} onPress={() => setTimelineVisible(true)} hitSlop={12} accessibilityLabel="打开时光本">
            <CalendarLineIcon size={28} color={colors.textPrimary} />
            <Text style={styles.calendarText}>回忆</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.title}>{currentPet.name}今天怎么样？</Text>
          <Text style={styles.subtitle}>待办、护理和今日动态都在这里。</Text>
        </View>

        {todayMedicationTasks.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>今日待办</Text>
              <Text style={styles.sectionMeta}>{todayMedicationTasks.length} 项用药</Text>
            </View>
            <DailyMedsDashboard plans={medicationPlans} logs={medicationLogs} onTake={logMedicationDose} />
          </>
        ) : null}

        <View style={[styles.sectionHeader, todayMedicationTasks.length === 0 && styles.firstSectionHeader]}>
          <Text style={styles.sectionTitle}>护理状态</Text>
          <Text style={styles.sectionMeta}>左右滑动查看</Text>
        </View>
        <View style={styles.routineScroller}>
          <RoutineStatusDashboard activities={activities} bathRecords={bathRecords} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>今日动态</Text>
          <Text style={styles.sectionMeta}>{todayItems.length} 条记录</Text>
        </View>
        <TodayFeed items={todayItems} />
      </ScrollView>

      <Modal visible={timelineVisible} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setTimelineVisible(false)}>
        <TimelineScreen onClose={() => setTimelineVisible(false)} />
      </Modal>

      <Modal visible={quickAddVisible} transparent animationType="slide" onRequestClose={() => setQuickAddVisible(false)}>
        <Sheet title="添加记录" onClose={() => setQuickAddVisible(false)}>
          <Text style={styles.quickAddHint}>选择一种记录方式</Text>
          <View style={styles.quickAddList}>
            {quickActions.map((action) => (
              <Pressable key={action.id} style={styles.quickAddRow} onPress={() => handleAction(action)}>
                <View style={[styles.quickAddIcon, { backgroundColor: action.color }]}><AppIcon name={action.iconName} size="small" /></View>
                <View style={styles.quickAddCopy}><Text style={styles.quickAddTitle}>{action.title}</Text><Text style={styles.quickAddMeta}>{action.hint}</Text></View>
              </Pressable>
            ))}
          </View>
        </Sheet>
      </Modal>

      <Modal visible={bathVisible} transparent animationType="slide" onRequestClose={() => setBathVisible(false)}>
        <Sheet title="记录洗澡" onClose={() => setBathVisible(false)}>
          <DateTimePicker value={date} mode="datetime" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(_, value) => value && setDate(value)} />
          <PrimaryButton label="保存洗澡记录" onPress={() => { addBathRecord(date.toISOString()); setBathVisible(false); }} />
        </Sheet>
      </Modal>

      <Modal visible={recordVisible} transparent animationType="slide" onRequestClose={() => setRecordVisible(false)}>
        <Sheet title={`记录${activeAction?.title ?? ''}`} onClose={() => setRecordVisible(false)}>
          <DateTimePicker value={date} mode="datetime" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(_, value) => value && setDate(value)} />
          <TextInput value={detail} onChangeText={setDetail} style={styles.input} placeholder={activeAction?.placeholder ?? '写下这次记录的详情（可选）'} placeholderTextColor={colors.textSecondary} />
          <PrimaryButton label="保存记录" onPress={saveActivity} />
        </Sheet>
      </Modal>

      <Modal visible={diaryVisible} transparent animationType="slide" onRequestClose={() => setDiaryVisible(false)}>
        <Sheet title="写一篇小日记" onClose={() => setDiaryVisible(false)}>
          <TextInput value={diary} onChangeText={setDiary} style={[styles.input, styles.diaryInput]} placeholder={`写下今天和${currentPet.name}的片刻...`} placeholderTextColor={colors.textSecondary} multiline autoFocus />
          <PrimaryButton label="保存日记" onPress={saveDiary} />
        </Sheet>
      </Modal>
    </SafeAreaView>
  );
};

const Sheet: React.FC<React.PropsWithChildren<{ title: string; onClose: () => void }>> = ({ title, onClose, children }) => (
  <View style={styles.backdrop}>
    <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
    <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
        <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>{title}</Text><Pressable onPress={onClose}><Text style={styles.cancel}>取消</Text></Pressable></View>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  </View>
);

const PrimaryButton: React.FC<{ label: string; onPress: () => void }> = ({ label, onPress }) => (
  <Pressable style={styles.primaryButton} onPress={onPress}><Text style={styles.primaryText}>{label}</Text></Pressable>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  page: { paddingHorizontal: spacing(2.5), paddingTop: spacing(1.5), paddingBottom: spacing(5) },
  topBar: { minHeight: 56, flexDirection: 'row', alignItems: 'center' },
  calendarButton: { minWidth: 74, height: 44, marginLeft: spacing(1.25), paddingHorizontal: spacing(1), borderRadius: 15, borderWidth: 0.5, borderColor: colors.borderSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  calendarText: { marginLeft: 4, color: colors.textPrimary, fontSize: 12, fontWeight: '800' },
  hero: { marginTop: spacing(1.75), marginBottom: spacing(0.25) },
  eyebrow: { color: colors.accentStrong, fontSize: 12, fontWeight: '800', letterSpacing: 1.4 },
  title: { maxWidth: 320, color: colors.textPrimary, fontSize: 24, lineHeight: 31, fontWeight: '900' },
  subtitle: { marginTop: 5, color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  sectionHeader: { marginTop: spacing(3), marginBottom: spacing(1.25), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  firstSectionHeader: { marginTop: spacing(2.25) },
  sectionTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '900' },
  sectionMeta: { color: colors.textSecondary, fontSize: 11 },
  routineScroller: { marginHorizontal: -spacing(2.5) },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(45,52,47,0.28)' },
  keyboard: { width: '100%', maxHeight: '92%' },
  sheet: { maxHeight: '100%', backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetContent: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2.5), paddingBottom: spacing(5) },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing(1.5) },
  sheetTitle: { color: colors.textPrimary, fontSize: 21, fontWeight: '900' },
  cancel: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },
  input: { marginTop: spacing(1), minHeight: 52, borderRadius: radius.medium, paddingHorizontal: spacing(1.5), backgroundColor: colors.surface, color: colors.textPrimary, fontSize: 15 },
  diaryInput: { minHeight: 150, paddingTop: spacing(1.5), textAlignVertical: 'top' },
  primaryButton: { marginTop: spacing(2), minHeight: 52, borderRadius: radius.medium, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentStrong },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  quickAddHint: { color: colors.textSecondary, fontSize: 13 },
  quickAddList: { marginTop: spacing(1.25), flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) },
  quickAddRow: { width: '48.5%', minHeight: 76, padding: spacing(1), borderRadius: radius.medium, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center' },
  quickAddIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  quickAddCopy: { flex: 1, marginLeft: spacing(0.75) },
  quickAddTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  quickAddMeta: { marginTop: 3, color: colors.textSecondary, fontSize: 10 },
});

export default CheckInScreen;
