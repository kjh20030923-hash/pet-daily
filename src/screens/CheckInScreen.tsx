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
import { CommonActions, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { TimelineItem } from '../types';
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

export const CheckInScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootTabParamList, 'Home'>>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
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
  const todayActivities = useMemo(() => activities.filter((record) => {
    const value = new Date(record.time);
    return value.toDateString() === new Date().toDateString();
  }), [activities]);
  const todayDraftCount = useMemo(() => todayItems.filter((item) => item.kind === 'draft').length, [todayItems]);
  const feedTodayCount = todayActivities.filter((record) => record.type === 'feed').length;
  const walkTodayCount = todayActivities.filter((record) => currentPet.kind === 'cat' ? record.type === 'litter' : record.type === 'walk').length;
  const bathCareText = useMemo(() => {
    const lastBath = bathRecords[0]?.time;
    if (!lastBath) return '洗澡待记录';
    const days = Math.max(0, Math.floor((Date.now() - new Date(lastBath).getTime()) / 86_400_000));
    const remaining = 30 - days;
    return remaining >= 0 ? `洗澡还有 ${remaining} 天` : `洗澡已逾期 ${Math.abs(remaining)} 天`;
  }, [bathRecords]);
  const quickShortcuts = useMemo(() => {
    const findAction = (matcher: (action: QuickActionConfig) => boolean) => quickActions.find(matcher);
    return [
      { id: 'feed', label: '饮食', icon: 'feed' as const, action: findAction((action) => action.actionType === 'feed') },
      { id: 'walk', label: currentPet.kind === 'cat' ? '猫砂' : '遛狗', icon: currentPet.kind === 'cat' ? 'litter' as const : 'walk' as const, action: findAction((action) => currentPet.kind === 'cat' ? action.actionType === 'litter' : action.actionType === 'walk') },
      { id: 'poop', label: '便便', icon: 'litter' as const, action: findAction((action) => action.actionType === 'litter') },
      { id: 'weight', label: '体重', icon: 'weight' as const, action: undefined },
      { id: 'diary', label: '日记', icon: 'diary' as const, action: findAction((action) => action.actionType === 'diary') },
    ];
  }, [currentPet.kind, quickActions]);

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
          <PetSwitcher hideEditButton />
          <Pressable style={styles.calendarButton} onPress={() => setTimelineVisible(true)} hitSlop={12} accessibilityLabel="打开时光本">
            <CalendarLineIcon size={28} color={colors.textPrimary} />
            <Text style={styles.calendarText}>回忆</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.title}>{currentPet.name}今天怎么样？</Text>
          <Text style={styles.subtitle}>记录饮食、遛狗、护理和今天的小事。</Text>
        </View>

        <View style={styles.quickStrip}>
          {quickShortcuts.map((shortcut) => (
            <Pressable
              key={shortcut.id}
              style={({ pressed }) => [styles.quickPill, pressed && styles.quickPillPressed]}
              onPress={() => {
                if (shortcut.id === 'weight') {
                  navigation.dispatch(CommonActions.navigate({ name: 'Health' }));
                  return;
                }
                if (shortcut.action) handleAction(shortcut.action);
              }}
            >
              <View style={styles.quickPillIcon}>
                <AppIcon name={shortcut.icon} size="small" tint={colors.accentStrong} />
              </View>
              <Text style={styles.quickPillText}>{shortcut.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <View>
              <Text style={styles.overviewTitle}>今日概览</Text>
              <Text style={styles.overviewSubtitle}>{todayItems.length ? '今天已经留下记录啦' : '今天还没有完整记录哦，快来记录吧'}</Text>
            </View>
            <Pressable style={styles.overviewAction} onPress={() => setQuickAddVisible(true)}>
              <Text style={styles.overviewActionText}>去记录 ›</Text>
            </Pressable>
          </View>
          <View style={styles.overviewStats}>
            <OverviewStat icon="feed" label="饮食" value={feedTodayCount ? `${feedTodayCount} 条` : '未记录'} />
            <OverviewStat icon={currentPet.kind === 'cat' ? 'litter' : 'walk'} label={currentPet.kind === 'cat' ? '猫砂' : '遛狗'} value={walkTodayCount ? `${walkTodayCount} 条` : '未记录'} />
            <OverviewStat icon="diary" label="日记" value={todayDraftCount ? `${todayDraftCount} 条记录` : '未记录'} highlight={todayDraftCount > 0} />
            <OverviewStat icon="bath" label="护理" value={bathCareText} highlight={bathCareText.includes('还有')} danger={bathCareText.includes('逾期')} />
          </View>
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

        <View style={styles.routineScroller}>
          <RoutineStatusDashboard activities={activities} bathRecords={bathRecords} onSelectRoutine={setSelectedRoutine} />
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
        <QuickAddSheet
          petName={currentPet.name}
          petKind={currentPet.kind}
          actions={quickActions}
          bottomInset={insets.bottom}
          onAction={handleAction}
          onClose={() => setQuickAddVisible(false)}
        />
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

type SoftIconName = 'food' | 'walk' | 'poop' | 'diary' | 'bath' | 'pill' | 'bug' | 'vaccine';

const SoftLineIcon: React.FC<{ name: SoftIconName; color: string }> = ({ name, color }) => {
  if (name === 'food') {
    return (
      <View style={styles.iconCanvas}>
        <View style={[styles.foodBowl, { borderColor: color }]} />
        <View style={[styles.foodBase, { backgroundColor: color }]} />
        <View style={[styles.foodDot, { backgroundColor: color, left: 14 }]} />
        <View style={[styles.foodDot, { backgroundColor: color, left: 22, top: 10 }]} />
        <View style={[styles.foodDot, { backgroundColor: color, left: 30 }]} />
      </View>
    );
  }
  if (name === 'walk') {
    return (
      <View style={styles.iconCanvas}>
        <View style={[styles.leashLoop, { borderColor: color }]} />
        <View style={[styles.leashLine, { backgroundColor: color }]} />
        <View style={[styles.leashHandle, { borderColor: color }]} />
      </View>
    );
  }
  if (name === 'poop') {
    return (
      <View style={styles.iconCanvas}>
        <View style={[styles.poopLayerTop, { borderColor: color }]} />
        <View style={[styles.poopLayerMid, { borderColor: color }]} />
        <View style={[styles.poopLayerBottom, { borderColor: color }]} />
        <View style={[styles.sparkDot, { backgroundColor: color, left: 7, top: 8 }]} />
        <View style={[styles.sparkDot, { backgroundColor: color, right: 7, top: 15 }]} />
      </View>
    );
  }
  if (name === 'diary') {
    return (
      <View style={styles.iconCanvas}>
        <View style={[styles.bookCover, { borderColor: color }]} />
        <View style={[styles.bookLine, { backgroundColor: color, top: 16 }]} />
        <View style={[styles.bookLine, { backgroundColor: color, top: 23 }]} />
        <View style={[styles.bookHeart, { borderColor: color }]} />
      </View>
    );
  }
  if (name === 'bath') {
    return (
      <View style={styles.iconCanvas}>
        <View style={[styles.bathTub, { borderColor: color }]} />
        <View style={[styles.bathFoam, { borderColor: color, left: 13 }]} />
        <View style={[styles.bathFoam, { borderColor: color, left: 23, top: 9 }]} />
      </View>
    );
  }
  if (name === 'pill') {
    return (
      <View style={styles.iconCanvas}>
        <View style={[styles.pill, { borderColor: color }]} />
        <View style={[styles.pillDivider, { backgroundColor: color }]} />
      </View>
    );
  }
  if (name === 'bug') {
    return (
      <View style={styles.iconCanvas}>
        <View style={[styles.bugBody, { borderColor: color }]} />
        <View style={[styles.bugHead, { borderColor: color }]} />
        <View style={[styles.bugLeg, { backgroundColor: color, left: 8, transform: [{ rotate: '-28deg' }] }]} />
        <View style={[styles.bugLeg, { backgroundColor: color, right: 8, transform: [{ rotate: '28deg' }] }]} />
      </View>
    );
  }
  return (
    <View style={styles.iconCanvas}>
      <View style={[styles.syringeBody, { borderColor: color }]} />
      <View style={[styles.syringeNeedle, { backgroundColor: color }]} />
      <View style={[styles.syringePlunger, { backgroundColor: color }]} />
    </View>
  );
};

const SectionLabel: React.FC<{ dotColor: string; title: string; subtitle: string }> = ({ dotColor, title, subtitle }) => (
  <View style={styles.quickSectionHeader}>
    <View style={[styles.quickSectionDot, { backgroundColor: dotColor }]} />
    <View>
      <Text style={styles.quickSectionTitle}>{title}</Text>
      <Text style={styles.quickSectionSubtitle}>{subtitle}</Text>
    </View>
  </View>
);

const QuickAddSheet: React.FC<{
  petName: string;
  petKind: 'dog' | 'cat' | 'other';
  actions: readonly QuickActionConfig[];
  bottomInset: number;
  onAction: (action: QuickActionConfig) => void;
  onClose: () => void;
}> = ({ petName, petKind, actions, bottomInset, onAction, onClose }) => {
  const findAction = (matcher: (action: QuickActionConfig) => boolean) => actions.find(matcher);
  const commonItems = [
    {
      key: 'feed',
      title: '饮食记录',
      description: '记录食物、分量和照片',
      icon: 'food' as const,
      iconColor: '#D28A1E',
      iconBg: '#FFF0D9',
      action: findAction((action) => action.actionType === 'feed'),
    },
    {
      key: 'walk',
      title: petKind === 'cat' ? '猫砂记录' : '遛狗记录',
      description: petKind === 'cat' ? '记录状态、次数和健康' : '记录外出、时长和活动',
      icon: petKind === 'cat' ? 'poop' as const : 'walk' as const,
      iconColor: petKind === 'cat' ? '#4A90D9' : '#39A56A',
      iconBg: petKind === 'cat' ? '#E7F1FF' : '#E5F6EC',
      action: findAction((action) => petKind === 'cat' ? action.actionType === 'litter' : action.actionType === 'walk'),
    },
    {
      key: 'poop',
      title: '便便记录',
      description: '记录状态、次数和健康',
      icon: 'poop' as const,
      iconColor: '#4A90D9',
      iconBg: '#E7F1FF',
      action: findAction((action) => action.id === 'poop') ?? findAction((action) => action.actionType === 'litter'),
    },
    {
      key: 'diary',
      title: '写日记',
      description: '记录今天的小事和心情',
      icon: 'diary' as const,
      iconColor: '#D96F8C',
      iconBg: '#FFE8EE',
      action: findAction((action) => action.actionType === 'diary'),
    },
  ].filter((item) => Boolean(item.action));
  const careItems = [
    { key: 'bath', title: '洗澡', icon: 'bath' as const, iconColor: '#4C8FBF', iconBg: '#E8F3FA', action: findAction((action) => action.actionType === 'bath') },
    { key: 'internal', title: '体内驱虫', icon: 'pill' as const, iconColor: '#D6903D', iconBg: '#FFF1DE', action: findAction((action) => action.actionType === 'deworm-internal') },
    { key: 'external', title: '体外驱虫', icon: 'bug' as const, iconColor: '#49A978', iconBg: '#E7F6EE', action: findAction((action) => action.actionType === 'deworm-external') },
    { key: 'vaccine', title: '疫苗', icon: 'vaccine' as const, iconColor: '#9B6CD9', iconBg: '#F0E8FF', action: findAction((action) => action.actionType === 'vaccine') },
  ].filter((item) => Boolean(item.action));

  return (
    <View style={styles.quickBackdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <KeyboardAvoidingView style={styles.quickKeyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.quickSheet, { paddingBottom: Math.max(bottomInset, 18) }]}>
          <View style={styles.sheetHandle} />
          <ScrollView contentContainerStyle={styles.quickSheetContent} showsVerticalScrollIndicator={false}>
            <View style={styles.quickHeader}>
              <View>
                <Text style={styles.quickTitle}>添加记录</Text>
                <Text style={styles.quickSubtitle}>今天想记录{petName}的什么？</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={12}>
                <Text style={styles.quickCancel}>取消</Text>
              </Pressable>
            </View>

            <SectionLabel dotColor="#F3A43B" title="常用记录" subtitle={`日常记录${petName}的生活点滴`} />
            <View style={styles.commonList}>
              {commonItems.map((item) => (
                <Pressable key={item.key} style={({ pressed }) => [styles.commonCard, pressed && styles.commonCardPressed]} onPress={() => item.action && onAction(item.action)}>
                  <View style={[styles.commonIconBox, { backgroundColor: item.iconBg }]}>
                    <SoftLineIcon name={item.icon} color={item.iconColor} />
                  </View>
                  <View style={styles.commonCopy}>
                    <Text style={styles.commonTitle}>{item.title}</Text>
                    <Text style={styles.commonDescription}>{item.description}</Text>
                  </View>
                  <Text style={styles.commonArrow}>›</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.quickDivider} />
            <SectionLabel dotColor="#D99A5F" title="护理提醒" subtitle="护理记录，系统会帮你记住下次时间" />
            <View style={styles.careGrid}>
              {careItems.map((item) => (
                <Pressable key={item.key} style={({ pressed }) => [styles.careCard, pressed && styles.commonCardPressed]} onPress={() => item.action && onAction(item.action)}>
                  <View style={[styles.careIconBox, { backgroundColor: item.iconBg }]}>
                    <SoftLineIcon name={item.icon} color={item.iconColor} />
                  </View>
                  <Text style={styles.careTitle}>{item.title}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.pawDecoration}>
              <View style={styles.pawDotLarge} />
              <View style={[styles.pawDotSmall, { left: 18, top: 6 }]} />
              <View style={[styles.pawDotSmall, { left: 31, top: 9 }]} />
              <View style={[styles.pawDotSmall, { left: 25, top: -3 }]} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

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

const OverviewStat: React.FC<{
  icon: React.ComponentProps<typeof AppIcon>['name'];
  label: string;
  value: string;
  highlight?: boolean;
  danger?: boolean;
}> = ({ icon, label, value, highlight, danger }) => (
  <View style={styles.overviewStat}>
    <View style={styles.overviewIcon}><AppIcon name={icon} size="small" tint={danger ? colors.danger : colors.accentStrong} /></View>
    <Text style={styles.overviewStatLabel}>{label}</Text>
    <Text style={[styles.overviewStatValue, highlight && styles.overviewStatHighlight, danger && styles.overviewStatDanger]} numberOfLines={1}>{value}</Text>
  </View>
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
  quickStrip: { marginTop: spacing(2), flexDirection: 'row', flexWrap: 'wrap', gap: spacing(0.75) },
  quickPill: { minHeight: 42, paddingLeft: 6, paddingRight: spacing(1.1), borderRadius: radius.pill, borderWidth: 0.5, borderColor: colors.borderSoft, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card },
  quickPillPressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
  quickPillIcon: { width: 32, height: 32, marginRight: 3, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  quickPillText: { color: colors.textPrimary, fontSize: 13, fontWeight: '900' },
  overviewCard: { marginTop: spacing(2), padding: spacing(1.5), borderRadius: 24, borderWidth: 0.5, borderColor: '#F1E1CA', backgroundColor: '#FFF6E8' },
  overviewHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  overviewTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '900' },
  overviewSubtitle: { marginTop: 6, maxWidth: 220, color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
  overviewAction: { minHeight: 34, paddingHorizontal: spacing(1), borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.72)' },
  overviewActionText: { color: colors.accentStrong, fontSize: 12, fontWeight: '900' },
  overviewStats: { marginTop: spacing(1.5), paddingVertical: spacing(1), borderRadius: 18, flexDirection: 'row', backgroundColor: colors.card },
  overviewStat: { flex: 1, minWidth: 0, alignItems: 'center', paddingHorizontal: 3, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.borderSoft },
  overviewIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  overviewStatLabel: { marginTop: 6, color: colors.textPrimary, fontSize: 12, fontWeight: '900' },
  overviewStatValue: { marginTop: 4, color: colors.textSecondary, fontSize: 10, fontWeight: '800' },
  overviewStatHighlight: { color: colors.accentStrong },
  overviewStatDanger: { color: colors.danger },
  sectionHeader: { marginTop: spacing(3), marginBottom: spacing(1.25), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  firstSectionHeader: { marginTop: spacing(2.25) },
  sectionTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '900' },
  sectionMeta: { color: colors.textSecondary, fontSize: 11 },
  routineScroller: { marginTop: spacing(2.5), marginHorizontal: -spacing(2.5) },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(45,52,47,0.28)' },
  quickBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.38)' },
  keyboard: { width: '100%', maxHeight: '92%' },
  quickKeyboard: { width: '100%', maxHeight: '78%' },
  sheet: { maxHeight: '100%', backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  quickSheet: { maxHeight: '100%', borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: '#FFFDF9', overflow: 'hidden' },
  sheetHandle: { width: 42, height: 5, marginTop: 12, marginBottom: 4, borderRadius: 3, alignSelf: 'center', backgroundColor: '#D5D0CB' },
  sheetContent: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2.5), paddingBottom: spacing(5) },
  quickSheetContent: { paddingHorizontal: spacing(2.5), paddingTop: spacing(1.25), paddingBottom: spacing(2.5) },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing(1.5) },
  sheetTitle: { color: colors.textPrimary, fontSize: 21, fontWeight: '900' },
  cancel: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },
  quickHeader: { marginBottom: spacing(2.5), flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  quickTitle: { color: '#2D211C', fontSize: 28, lineHeight: 34, fontWeight: '900' },
  quickSubtitle: { marginTop: 8, color: '#7C6F68', fontSize: 15, lineHeight: 21, fontWeight: '500' },
  quickCancel: { marginTop: 10, color: '#7A6A61', fontSize: 16, fontWeight: '700' },
  quickSectionHeader: { marginBottom: spacing(1.25), flexDirection: 'row', alignItems: 'flex-start' },
  quickSectionDot: { width: 9, height: 9, marginTop: 7, marginRight: spacing(1), borderRadius: 5 },
  quickSectionTitle: { color: '#33241F', fontSize: 18, lineHeight: 23, fontWeight: '900' },
  quickSectionSubtitle: { marginTop: 4, color: '#7C6F68', fontSize: 14, lineHeight: 19 },
  commonList: { gap: spacing(1.1) },
  commonCard: {
    minHeight: 78,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1.25),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EFE7DE',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF9',
    shadowColor: '#5A3C28',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 1,
  },
  commonCardPressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  commonIconBox: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  commonCopy: { flex: 1, marginLeft: spacing(1.4), minWidth: 0 },
  commonTitle: { color: '#33241F', fontSize: 17, lineHeight: 22, fontWeight: '900' },
  commonDescription: { marginTop: 4, color: '#7C6F68', fontSize: 13, lineHeight: 18 },
  commonArrow: { marginLeft: spacing(1), color: 'rgba(122,106,97,0.78)', fontSize: 34, lineHeight: 38, fontWeight: '500' },
  quickDivider: { height: StyleSheet.hairlineWidth, marginTop: spacing(2), marginBottom: spacing(2), backgroundColor: '#EFE7DE' },
  careGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) },
  careCard: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 74,
    minHeight: 96,
    paddingVertical: spacing(1.1),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EFE7DE',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFDF9',
  },
  careIconBox: { width: 48, height: 48, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  careTitle: { marginTop: 8, color: '#33241F', fontSize: 14, fontWeight: '800' },
  pawDecoration: { height: 28, marginTop: spacing(1.5), opacity: 0.45 },
  pawDotLarge: { position: 'absolute', left: 7, top: 11, width: 13, height: 11, borderRadius: 7, backgroundColor: '#D7B592', transform: [{ rotate: '-18deg' }] },
  pawDotSmall: { position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: '#D7B592' },
  iconCanvas: { width: 42, height: 42, position: 'relative' },
  foodBowl: { position: 'absolute', left: 9, top: 18, width: 25, height: 14, borderWidth: 2, borderTopWidth: 0, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  foodBase: { position: 'absolute', left: 13, top: 32, width: 17, height: 2, borderRadius: 1 },
  foodDot: { position: 'absolute', top: 12, width: 5, height: 5, borderRadius: 3 },
  leashLoop: { position: 'absolute', left: 7, top: 10, width: 19, height: 12, borderWidth: 2, borderRadius: 10, transform: [{ rotate: '18deg' }] },
  leashLine: { position: 'absolute', left: 20, top: 21, width: 18, height: 2, borderRadius: 1, transform: [{ rotate: '-28deg' }] },
  leashHandle: { position: 'absolute', left: 27, top: 8, width: 8, height: 8, borderWidth: 2, borderRadius: 5 },
  poopLayerTop: { position: 'absolute', left: 17, top: 9, width: 10, height: 8, borderWidth: 2, borderRadius: 8 },
  poopLayerMid: { position: 'absolute', left: 13, top: 17, width: 18, height: 9, borderWidth: 2, borderRadius: 10 },
  poopLayerBottom: { position: 'absolute', left: 9, top: 26, width: 26, height: 8, borderWidth: 2, borderRadius: 12 },
  sparkDot: { position: 'absolute', width: 4, height: 4, borderRadius: 2 },
  bookCover: { position: 'absolute', left: 10, top: 8, width: 23, height: 28, borderWidth: 2, borderRadius: 5 },
  bookLine: { position: 'absolute', left: 16, width: 11, height: 2, borderRadius: 1 },
  bookHeart: { position: 'absolute', left: 18, top: 26, width: 7, height: 7, borderLeftWidth: 2, borderBottomWidth: 2, transform: [{ rotate: '-45deg' }] },
  bathTub: { position: 'absolute', left: 8, top: 20, width: 27, height: 13, borderWidth: 2, borderTopWidth: 0, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  bathFoam: { position: 'absolute', top: 11, width: 9, height: 9, borderWidth: 2, borderRadius: 5 },
  pill: { position: 'absolute', left: 10, top: 12, width: 24, height: 16, borderWidth: 2, borderRadius: 9, transform: [{ rotate: '-42deg' }] },
  pillDivider: { position: 'absolute', left: 20, top: 18, width: 2, height: 13, borderRadius: 1, transform: [{ rotate: '48deg' }] },
  bugBody: { position: 'absolute', left: 14, top: 15, width: 15, height: 19, borderWidth: 2, borderRadius: 9 },
  bugHead: { position: 'absolute', left: 16, top: 8, width: 11, height: 10, borderWidth: 2, borderRadius: 7 },
  bugLeg: { position: 'absolute', top: 24, width: 11, height: 2, borderRadius: 1 },
  syringeBody: { position: 'absolute', left: 13, top: 12, width: 18, height: 10, borderWidth: 2, borderRadius: 4, transform: [{ rotate: '-38deg' }] },
  syringeNeedle: { position: 'absolute', left: 27, top: 26, width: 12, height: 2, borderRadius: 1, transform: [{ rotate: '-38deg' }] },
  syringePlunger: { position: 'absolute', left: 7, top: 9, width: 9, height: 2, borderRadius: 1, transform: [{ rotate: '-38deg' }] },
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
