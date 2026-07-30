import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
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
import * as ImagePicker from 'expo-image-picker';
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
import { RoutineCardData, RoutineStatusDashboard } from '../features/home/RoutineStatusDashboard';
import { TodayFeed } from '../features/home/TodayFeed';
import { DailyMedsDashboard } from '../features/medication/DailyMedsDashboard';
import { getDailyMedicationTasks } from '../features/medication/medicationTasks';
import { useAppState, useTimeline } from '../store';
import { colors, radius, spacing } from '../theme';
import { ActivityRecord, ActivityType, TimelineItem } from '../types';
import { formatZhDate, formatZhDateTime } from '../utils/date';
import { TimelineScreen } from './TimelineScreen';
import type { RootTabParamList } from '../navigation/BottomTabs';

const itemTime = (item: TimelineItem) => item.kind === 'footprint' ? item.date : item.kind === 'medication' ? item.takenAt : item.time;

const toDateInputValue = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;

const toTimeInputValue = (value: Date) =>
  `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;

const applyDatePart = (current: Date, value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return current;
  const next = new Date(current);
  next.setFullYear(year, month - 1, day);
  return next;
};

const applyTimePart = (current: Date, value: string) => {
  const [hour, minute] = value.split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return current;
  const next = new Date(current);
  next.setHours(Math.min(23, Math.max(0, hour)), Math.min(59, Math.max(0, minute)), 0, 0);
  return next;
};

const getNextRoutineTime = (routine: RoutineCardData) => {
  if (!routine.lastTime) return undefined;
  const next = new Date(routine.lastTime);
  next.setDate(next.getDate() + routine.cycleDays);
  return next.toISOString();
};

type DailyRecordGroup = {
  id: 'feed' | 'movement';
  title: string;
  subtitle: string;
  emptyText: string;
  records: ActivityRecord[];
};

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
  const [selectedRoutine, setSelectedRoutine] = useState<RoutineCardData | null>(null);
  const [selectedDailyGroup, setSelectedDailyGroup] = useState<DailyRecordGroup | null>(null);
  const [activeAction, setActiveAction] = useState<QuickActionConfig | null>(null);
  const [date, setDate] = useState(new Date());
  const [detail, setDetail] = useState('');
  const [diary, setDiary] = useState('');
  const [recordImageUri, setRecordImageUri] = useState<string | undefined>();
  const quickActions = ACTION_CONFIG_MAP[currentPet.kind];

  const todayItems = useMemo(() => timeline.filter((item) => {
    const itemDate = new Date(itemTime(item));
    return itemDate.toDateString() === new Date().toDateString();
  }), [timeline]);
  const todayMedicationTasks = useMemo(
    () => getDailyMedicationTasks(medicationPlans, medicationLogs),
    [medicationLogs, medicationPlans],
  );
  const dailyRecordGroups = useMemo<DailyRecordGroup[]>(() => {
    const byType = (types: ActivityType[]) => activities
      .filter((record) => types.includes(record.type))
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    const movementTypes: ActivityType[] = currentPet.kind === 'cat' ? ['litter'] : ['walk'];
    return [
      {
        id: 'feed',
        title: '饮食记录',
        subtitle: '喂食、份量和照片',
        emptyText: '还没有饮食记录',
        records: byType(['feed']),
      },
      {
        id: 'movement',
        title: currentPet.kind === 'cat' ? '猫砂观察' : '遛狗记录',
        subtitle: currentPet.kind === 'cat' ? '铲屎和状态观察' : '外出地点和时长',
        emptyText: currentPet.kind === 'cat' ? '还没有猫砂记录' : '还没有遛狗记录',
        records: byType(movementTypes),
      },
    ];
  }, [activities, currentPet.kind]);

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
    setRecordImageUri(undefined);
    setRecordVisible(true);
  };

  const pickRecordImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要相册权限', '允许访问相册后，才能给这条记录添加照片。');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled) setRecordImageUri(result.assets[0]?.uri);
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
      imageUri: recordImageUri,
    });
    setRecordVisible(false);
  };

  const saveDiary = () => {
    if (!diary.trim()) {
      Alert.alert('先写下一点内容吧');
      return;
    }
    addDraft({ id: `${Date.now()}`, content: diary.trim(), time: date.toISOString() });
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
          <Text style={styles.sectionMeta}>点击查看详情</Text>
        </View>
        <View style={styles.routineScroller}>
          <RoutineStatusDashboard activities={activities} bathRecords={bathRecords} onSelectRoutine={setSelectedRoutine} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>日常记录</Text>
          <Text style={styles.sectionMeta}>饮食与活动</Text>
        </View>
        <View style={styles.dailyGrid}>
          {dailyRecordGroups.map((group) => (
            <DailyRecordCard key={group.id} group={group} onPress={() => setSelectedDailyGroup(group)} />
          ))}
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
          <DateTimeControl date={date} onChange={setDate} />
          <PrimaryButton label="保存洗澡记录" onPress={() => { addBathRecord(date.toISOString()); setBathVisible(false); }} />
        </Sheet>
      </Modal>

      <Modal visible={recordVisible} transparent animationType="slide" onRequestClose={() => setRecordVisible(false)}>
        <Sheet title={`记录${activeAction?.title ?? ''}`} onClose={() => setRecordVisible(false)}>
          <DateTimeControl date={date} onChange={setDate} />
          <TextInput value={detail} onChangeText={setDetail} style={styles.input} placeholder={activeAction?.placeholder ?? '写下这次记录的详情（可选）'} placeholderTextColor={colors.textSecondary} />
          <Pressable style={styles.photoPicker} onPress={pickRecordImage}>
            {recordImageUri ? (
              <Image source={{ uri: recordImageUri }} style={styles.recordPreview} />
            ) : (
              <View style={styles.photoPickerEmpty}>
                <Text style={styles.photoPickerTitle}>添加照片</Text>
                <Text style={styles.photoPickerHint}>比如食物照片、外出照片或护理照片</Text>
              </View>
            )}
          </Pressable>
          <PrimaryButton label="保存记录" onPress={saveActivity} />
        </Sheet>
      </Modal>

      <Modal visible={diaryVisible} transparent animationType="slide" onRequestClose={() => setDiaryVisible(false)}>
        <Sheet title="写一篇小日记" onClose={() => setDiaryVisible(false)}>
          <DateTimeControl date={date} onChange={setDate} />
          <TextInput value={diary} onChangeText={setDiary} style={[styles.input, styles.diaryInput]} placeholder={`写下今天和${currentPet.name}的片刻...`} placeholderTextColor={colors.textSecondary} multiline autoFocus />
          <PrimaryButton label="保存日记" onPress={saveDiary} />
        </Sheet>
      </Modal>

      <Modal visible={Boolean(selectedRoutine)} transparent animationType="slide" onRequestClose={() => setSelectedRoutine(null)}>
        {selectedRoutine ? (
          <Sheet title={`${selectedRoutine.title}记录`} onClose={() => setSelectedRoutine(null)}>
            <View style={styles.routineDetailSummary}>
              <View style={styles.routineDetailItem}>
                <Text style={styles.routineDetailLabel}>上次记录</Text>
                <Text style={styles.routineDetailValue}>{selectedRoutine.lastTime ? formatZhDate(selectedRoutine.lastTime) : '暂无'}</Text>
              </View>
              <View style={styles.routineDetailItem}>
                <Text style={styles.routineDetailLabel}>下次建议</Text>
                <Text style={styles.routineDetailValue}>{getNextRoutineTime(selectedRoutine) ? formatZhDate(getNextRoutineTime(selectedRoutine) as string) : '记录后生成'}</Text>
              </View>
            </View>
            <View style={styles.routineCycleBox}>
              <Text style={styles.routineCycleTitle}>{selectedRoutine.hint}</Text>
              <Text style={styles.routineCycleText}>建议周期 {selectedRoutine.cycleDays} 天。首页展示摘要，这里保留完整历史，方便回看和判断下次护理时间。</Text>
            </View>
            <Text style={styles.historyTitle}>历史记录</Text>
            {selectedRoutine.history.length === 0 ? (
              <View style={styles.historyEmpty}>
                <Text style={styles.historyEmptyText}>还没有记录。点击底部 + 号可以新增一次{selectedRoutine.title}。</Text>
              </View>
            ) : selectedRoutine.history.map((record, index) => (
              <View key={record.id} style={[styles.historyRow, index > 0 && styles.historyBorder]}>
                <View style={styles.historyDot} />
                <View style={styles.historyBody}>
                  <Text style={styles.historyTime}>{formatZhDateTime(record.time)}</Text>
                  <Text style={styles.historyMeta}>{record.detail || `${selectedRoutine.title}完成`}</Text>
                </View>
              </View>
            ))}
          </Sheet>
        ) : null}
      </Modal>

      <Modal visible={Boolean(selectedDailyGroup)} transparent animationType="slide" onRequestClose={() => setSelectedDailyGroup(null)}>
        {selectedDailyGroup ? (
          <Sheet title={selectedDailyGroup.title} onClose={() => setSelectedDailyGroup(null)}>
            <Text style={styles.dailyDetailHint}>{selectedDailyGroup.subtitle}</Text>
            {selectedDailyGroup.records.length === 0 ? (
              <View style={styles.historyEmpty}>
                <Text style={styles.historyEmptyText}>{selectedDailyGroup.emptyText}。点击底部 + 号添加后，会集中出现在这里。</Text>
              </View>
            ) : selectedDailyGroup.records.map((record, index) => (
              <View key={record.id} style={[styles.dailyRecordRow, index > 0 && styles.historyBorder]}>
                {record.imageUri ? (
                  <Image source={{ uri: record.imageUri }} style={styles.dailyRecordImage} />
                ) : (
                  <View style={styles.dailyRecordPlaceholder}>
                    <AppIcon name={record.type === 'feed' ? 'feed' : record.type === 'litter' ? 'litter' : 'walk'} size="small" tint={colors.accentStrong} />
                  </View>
                )}
                <View style={styles.dailyRecordBody}>
                  <Text style={styles.dailyRecordTime}>{formatZhDateTime(record.time)}</Text>
                  <Text style={styles.dailyRecordText}>{record.detail || '未填写详情'}</Text>
                </View>
              </View>
            ))}
          </Sheet>
        ) : null}
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

const DateTimeControl: React.FC<{ date: Date; onChange: (date: Date) => void }> = ({ date, onChange }) => (
  <View style={styles.dateTimeCard}>
    <View style={styles.dateTimeHeader}>
      <View>
        <Text style={styles.dateTimeTitle}>记录时间</Text>
        <Text style={styles.dateTimeHint}>{formatZhDateTime(date.toISOString())}</Text>
      </View>
      <Pressable style={styles.nowButton} onPress={() => onChange(new Date())}>
        <Text style={styles.nowButtonText}>现在</Text>
      </Pressable>
    </View>
    <View style={styles.dateTimeInputs}>
      <View style={styles.dateTimeField}>
        <Text style={styles.dateTimeLabel}>日期</Text>
        <TextInput
          value={toDateInputValue(date)}
          onChangeText={(value) => onChange(applyDatePart(date, value))}
          style={styles.dateTimeInput}
          placeholder="2026-07-30"
          placeholderTextColor={colors.textMuted}
        />
      </View>
      <View style={styles.dateTimeField}>
        <Text style={styles.dateTimeLabel}>时间</Text>
        <TextInput
          value={toTimeInputValue(date)}
          onChangeText={(value) => onChange(applyTimePart(date, value))}
          style={styles.dateTimeInput}
          placeholder="20:30"
          placeholderTextColor={colors.textMuted}
        />
      </View>
    </View>
    <DateTimePicker
      value={date}
      mode="datetime"
      display={Platform.OS === 'ios' ? 'compact' : 'default'}
      onChange={(_, value) => value && onChange(value)}
    />
  </View>
);

const DailyRecordCard: React.FC<{ group: DailyRecordGroup; onPress: () => void }> = ({ group, onPress }) => {
  const latest = group.records[0];
  const photos = group.records.filter((record) => record.imageUri).slice(0, 3);
  return (
    <Pressable style={({ pressed }) => [styles.dailyCard, pressed && styles.dailyCardPressed]} onPress={onPress}>
      <View style={styles.dailyCardHeader}>
        <View>
          <Text style={styles.dailyCardTitle}>{group.title}</Text>
          <Text style={styles.dailyCardMeta}>{group.records.length} 条记录</Text>
        </View>
        <Text style={styles.dailyCardChevron}>›</Text>
      </View>
      {photos.length > 0 ? (
        <View style={styles.dailyPhotoStrip}>
          {photos.map((record) => (
            <Image key={record.id} source={{ uri: record.imageUri }} style={styles.dailyPhotoThumb} />
          ))}
        </View>
      ) : (
        <View style={styles.dailyEmptyThumb}>
          <Text style={styles.dailyEmptyThumbText}>暂无照片</Text>
        </View>
      )}
      <Text style={styles.dailyLatest} numberOfLines={2}>{latest?.detail || group.emptyText}</Text>
    </Pressable>
  );
};

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
  dailyGrid: { flexDirection: 'row', gap: spacing(1) },
  dailyCard: { flex: 1, minHeight: 172, padding: spacing(1.25), borderRadius: radius.large, borderWidth: 0.5, borderColor: colors.borderSoft, backgroundColor: colors.card },
  dailyCardPressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  dailyCardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  dailyCardTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '900' },
  dailyCardMeta: { marginTop: 4, color: colors.textSecondary, fontSize: 11 },
  dailyCardChevron: { marginTop: -6, color: colors.textMuted, fontSize: 25 },
  dailyPhotoStrip: { marginTop: spacing(1.25), height: 56, flexDirection: 'row' },
  dailyPhotoThumb: { width: 56, height: 56, marginRight: -12, borderRadius: 16, borderWidth: 2, borderColor: colors.card, backgroundColor: colors.surface },
  dailyEmptyThumb: { marginTop: spacing(1.25), height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  dailyEmptyThumbText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  dailyLatest: { marginTop: spacing(1), color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(45,52,47,0.28)' },
  keyboard: { width: '100%', maxHeight: '92%' },
  sheet: { maxHeight: '100%', backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetContent: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2.5), paddingBottom: spacing(5) },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing(1.5) },
  sheetTitle: { color: colors.textPrimary, fontSize: 21, fontWeight: '900' },
  cancel: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },
  input: { marginTop: spacing(1), minHeight: 52, borderRadius: radius.medium, paddingHorizontal: spacing(1.5), backgroundColor: colors.surface, color: colors.textPrimary, fontSize: 15 },
  diaryInput: { minHeight: 150, paddingTop: spacing(1.5), textAlignVertical: 'top' },
  photoPicker: { marginTop: spacing(1), minHeight: 92, borderRadius: radius.medium, overflow: 'hidden', borderWidth: 0.5, borderColor: colors.borderSoft, backgroundColor: colors.surface },
  photoPickerEmpty: { flex: 1, minHeight: 92, alignItems: 'center', justifyContent: 'center' },
  photoPickerTitle: { color: colors.accentStrong, fontSize: 14, fontWeight: '900' },
  photoPickerHint: { marginTop: 5, color: colors.textSecondary, fontSize: 11 },
  recordPreview: { width: '100%', height: 160 },
  dateTimeCard: { marginTop: spacing(0.5), marginBottom: spacing(1), padding: spacing(1.25), borderRadius: radius.medium, borderWidth: 0.5, borderColor: colors.borderSoft, backgroundColor: colors.background },
  dateTimeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateTimeTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '900' },
  dateTimeHint: { marginTop: 4, color: colors.textSecondary, fontSize: 11 },
  nowButton: { minHeight: 32, paddingHorizontal: spacing(1), borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  nowButtonText: { color: colors.accentStrong, fontSize: 12, fontWeight: '800' },
  dateTimeInputs: { marginTop: spacing(1.25), flexDirection: 'row', gap: spacing(1) },
  dateTimeField: { flex: 1 },
  dateTimeLabel: { marginBottom: 5, color: colors.textSecondary, fontSize: 11, fontWeight: '800' },
  dateTimeInput: { minHeight: 42, paddingHorizontal: spacing(1), borderRadius: 12, borderWidth: 0.5, borderColor: colors.borderSoft, backgroundColor: colors.card, color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  routineDetailSummary: { flexDirection: 'row', gap: spacing(1) },
  routineDetailItem: { flex: 1, minHeight: 82, padding: spacing(1.25), borderRadius: radius.medium, backgroundColor: colors.surface },
  routineDetailLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '800' },
  routineDetailValue: { marginTop: 8, color: colors.textPrimary, fontSize: 16, fontWeight: '900' },
  routineCycleBox: { marginTop: spacing(1.25), padding: spacing(1.25), borderRadius: radius.medium, borderWidth: 0.5, borderColor: colors.borderSoft, backgroundColor: colors.card },
  routineCycleTitle: { color: colors.accentStrong, fontSize: 14, fontWeight: '900' },
  routineCycleText: { marginTop: 6, color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  historyTitle: { marginTop: spacing(2), marginBottom: spacing(0.5), color: colors.textPrimary, fontSize: 15, fontWeight: '900' },
  historyRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center' },
  historyBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderSoft },
  historyDot: { width: 8, height: 8, marginRight: spacing(1.25), borderRadius: 4, backgroundColor: colors.accentStrong },
  historyBody: { flex: 1 },
  historyTime: { color: colors.textPrimary, fontSize: 13, fontWeight: '800' },
  historyMeta: { marginTop: 4, color: colors.textSecondary, fontSize: 11 },
  historyEmpty: { minHeight: 90, borderRadius: radius.medium, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  historyEmptyText: { maxWidth: 260, color: colors.textSecondary, textAlign: 'center', fontSize: 12, lineHeight: 18 },
  dailyDetailHint: { marginBottom: spacing(1), color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  dailyRecordRow: { minHeight: 82, flexDirection: 'row', alignItems: 'center', paddingVertical: spacing(1) },
  dailyRecordImage: { width: 62, height: 62, borderRadius: 18, backgroundColor: colors.surface },
  dailyRecordPlaceholder: { width: 62, height: 62, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  dailyRecordBody: { flex: 1, marginLeft: spacing(1.25) },
  dailyRecordTime: { color: colors.textPrimary, fontSize: 13, fontWeight: '800' },
  dailyRecordText: { marginTop: 5, color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
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
