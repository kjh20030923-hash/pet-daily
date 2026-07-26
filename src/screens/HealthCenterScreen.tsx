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
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from '../components/AppIcon';
import { PetSwitcher } from '../components/PetSwitcher';
import { SurfaceCard } from '../components/SurfaceCard';
import { healthWidgetRegistry } from '../features/health/healthWidgetRegistry';
import { MedicationConfigModule } from '../features/medication/MedicationConfigModule';
import { useAppState } from '../store';
import { colors, radius, spacing } from '../theme';
import { HospitalRecord, MedicalLogRecord, WeightRecord } from '../types';
import { formatZhDateTime } from '../utils/date';

export const HealthCenterScreen: React.FC = () => {
  const {
    currentPet,
    updateCurrentPet,
    weightRecords,
    hospitalRecords,
    medicalLogs,
    medicationPlans,
    addWeightRecord,
    addHospitalRecord,
    addMedicalLog,
    upsertMedicationPlan,
    completeMedicationPlan,
  } = useAppState();
  const seizureEnabled = currentPet.seizure_enabled;
  const [managerVisible, setManagerVisible] = useState(false);
  const [weightVisible, setWeightVisible] = useState(false);
  const [hospitalVisible, setHospitalVisible] = useState(false);
  const [seizureVisible, setSeizureVisible] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [hospital, setHospital] = useState('');
  const [indicators, setIndicators] = useState('');
  const [hospitalNote, setHospitalNote] = useState('');
  const [hospitalImage, setHospitalImage] = useState<string | undefined>();
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [durationInput, setDurationInput] = useState('');
  const [manualSeizure, setManualSeizure] = useState(false);
  const [severity, setSeverity] = useState<'轻微' | '剧烈'>('轻微');
  const [consciousness, setConsciousness] = useState<'清醒' | '模糊'>('清醒');
  const [symptoms, setSymptoms] = useState('');

  React.useEffect(() => {
    if (!startedAt) return;
    const timer = setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  const toggleOptionalWidget = (id: 'seizure-tracker') => {
    const nextEnabled = id === 'seizure-tracker' ? !seizureEnabled : seizureEnabled;
    updateCurrentPet({
      seizure_enabled: nextEnabled,
      hasEpilepsy: nextEnabled,
      enabledHealthWidgets: nextEnabled ? ['seizure-tracker'] : [],
    });
  };

  const saveWeight = () => {
    const value = Number(weightInput);
    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert('请输入正确的体重');
      return;
    }
    const record: WeightRecord = { id: `${Date.now()}`, time: new Date().toISOString(), valueKg: value };
    addWeightRecord(record);
    setWeightInput('');
    setWeightVisible(false);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('请先允许照片访问权限');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.85 });
    if (!result.canceled) setHospitalImage(result.assets[0]?.uri);
  };

  const saveHospital = () => {
    if (!hospital.trim() && !indicators.trim()) {
      Alert.alert('请至少填写医院或检查结果');
      return;
    }
    const record: HospitalRecord = {
      id: `${Date.now()}`,
      time: new Date().toISOString(),
      hospital: hospital.trim() || '未填写医院',
      indicators: indicators.trim() || '未填写检查结果',
      note: hospitalNote.trim() || undefined,
      imageUri: hospitalImage,
    };
    addHospitalRecord(record);
    setHospital('');
    setIndicators('');
    setHospitalNote('');
    setHospitalImage(undefined);
    setHospitalVisible(false);
  };

  const toggleTimer = () => {
    if (!startedAt) {
      setElapsedSeconds(0);
      setStartedAt(Date.now());
      return;
    }
    setStartedAt(null);
    setManualSeizure(false);
    setDurationInput('');
    setSeizureVisible(true);
  };

  const openManualSeizure = () => {
    setManualSeizure(true);
    setDurationInput('');
    setSymptoms('');
    setSeizureVisible(true);
  };

  const saveSeizure = () => {
    const duration = manualSeizure ? Number(durationInput) : elapsedSeconds;
    if (!Number.isFinite(duration) || duration <= 0) {
      Alert.alert('请输入正确的持续时间');
      return;
    }
    const time = new Date().toISOString();
    const record: MedicalLogRecord = {
      id: `${Date.now()}`,
      time,
      durationSeconds: Math.floor(duration),
      severity,
      consciousness,
      text: `${formatZhDateTime(time)} · ${Math.floor(duration)}秒 · ${severity} · ${consciousness}${symptoms.trim() ? ` · ${symptoms.trim()}` : ''}`,
    };
    addMedicalLog(record);
    setElapsedSeconds(0);
    setSeizureVisible(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}><PetSwitcher /><Pressable style={styles.manageButton} onPress={() => setManagerVisible(true)}><Text style={styles.manageText}>管理组件</Text></Pressable></View>
        <View style={styles.hero}><Text style={styles.eyebrow}>健康中心</Text><Text style={styles.title}>{currentPet.name}的健康档案</Text><Text style={styles.subtitle}>只保留真正需要关注的数据。</Text></View>

        {seizureEnabled ? (
          <SeizureTrackerWidget records={medicalLogs} elapsedSeconds={elapsedSeconds} running={Boolean(startedAt)} onTimer={toggleTimer} onManual={openManualSeizure} />
        ) : null}
        <MedicationConfigModule
          pet={currentPet}
          plans={medicationPlans}
          onUpsert={upsertMedicationPlan}
          onComplete={completeMedicationPlan}
        />
        <WeightChartWidget records={weightRecords} onAdd={() => setWeightVisible(true)} />
        <MedicalRecordsList records={hospitalRecords} onAdd={() => setHospitalVisible(true)} />
      </ScrollView>

      <Modal visible={managerVisible} transparent animationType="slide" onRequestClose={() => setManagerVisible(false)}>
        <Sheet title="管理健康组件" onClose={() => setManagerVisible(false)}>
          <Text style={styles.managerHint}>通用组件始终保留，可选组件按每只宠物独立设置。</Text>
          {healthWidgetRegistry.map((widget) => (
            <View key={widget.id} style={styles.widgetSettingRow}>
              <View style={styles.widgetSettingText}><Text style={styles.widgetSettingTitle}>{widget.title}</Text><Text style={styles.widgetSettingHint}>{widget.description}</Text></View>
              {widget.optional ? (
                <Switch value={seizureEnabled} onValueChange={() => toggleOptionalWidget('seizure-tracker')} trackColor={{ false: colors.borderSoft, true: colors.accent }} thumbColor={colors.card} />
              ) : <Text style={styles.requiredText}>默认</Text>}
            </View>
          ))}
        </Sheet>
      </Modal>

      <Modal visible={weightVisible} transparent animationType="slide" onRequestClose={() => setWeightVisible(false)}>
        <Sheet title="记录体重" onClose={() => setWeightVisible(false)}>
          <TextInput value={weightInput} onChangeText={setWeightInput} style={styles.largeNumberInput} placeholder="0.0 kg" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" autoFocus />
          <PrimaryButton label="保存体重" onPress={saveWeight} />
        </Sheet>
      </Modal>

      <Modal visible={hospitalVisible} transparent animationType="slide" onRequestClose={() => setHospitalVisible(false)}>
        <Sheet title="新增就诊档案" onClose={() => setHospitalVisible(false)}>
          <TextInput value={hospital} onChangeText={setHospital} style={styles.input} placeholder="医院名称" placeholderTextColor={colors.textSecondary} />
          <TextInput value={indicators} onChangeText={setIndicators} style={[styles.input, styles.multiInput]} placeholder="检查结果或指标" placeholderTextColor={colors.textSecondary} multiline />
          <TextInput value={hospitalNote} onChangeText={setHospitalNote} style={styles.input} placeholder="补充说明（可选）" placeholderTextColor={colors.textSecondary} />
          <Pressable style={styles.photoButton} onPress={pickImage}><Text style={styles.photoText}>{hospitalImage ? '化验单已选择，点击更换' : '添加化验单照片（可选）'}</Text></Pressable>
          <PrimaryButton label="保存就诊档案" onPress={saveHospital} />
        </Sheet>
      </Modal>

      <Modal visible={seizureVisible} transparent animationType="slide" onRequestClose={() => setSeizureVisible(false)}>
        <Sheet title="保存发作记录" onClose={() => setSeizureVisible(false)}>
          <TextInput value={manualSeizure ? durationInput : String(elapsedSeconds)} onChangeText={setDurationInput} editable={manualSeizure} style={styles.largeNumberInput} placeholder="持续秒数" placeholderTextColor={colors.textMuted} keyboardType="number-pad" />
          <View style={styles.optionRow}>{(['轻微', '剧烈'] as const).map((item) => <Option key={item} label={item} active={severity === item} onPress={() => setSeverity(item)} />)}</View>
          <View style={styles.optionRow}>{(['清醒', '模糊'] as const).map((item) => <Option key={item} label={item} active={consciousness === item} onPress={() => setConsciousness(item)} />)}</View>
          <TextInput value={symptoms} onChangeText={setSymptoms} style={[styles.input, styles.multiInput]} placeholder="症状说明（可选）" placeholderTextColor={colors.textSecondary} multiline />
          <PrimaryButton label="保存发作记录" onPress={saveSeizure} />
        </Sheet>
      </Modal>
    </SafeAreaView>
  );
};

const WeightChartWidget: React.FC<{ records: WeightRecord[]; onAdd: () => void }> = ({ records, onAdd }) => (
  <SurfaceCard style={styles.widgetCard}>
    <WidgetHeader icon="weight" title="体重趋势" subtitle={records[0] ? `最新 ${records[0].valueKg} kg` : '还没有体重记录'} action="+ 记录" onPress={onAdd} />
    <WeightTrendChart records={records} />
  </SurfaceCard>
);

const WeightTrendChart: React.FC<{ records: WeightRecord[] }> = ({ records }) => {
  const { width } = useWindowDimensions();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const chartWidth = Math.max(240, width - 88);
  const chartHeight = 152;
  const plotTop = 42;
  const plotBottom = 126;
  const axisY = 136;
  const values = useMemo(() => [...records].slice(0, 7).reverse(), [records]);
  const points = useMemo(() => {
    if (!values.length) return [];
    const min = Math.min(...values.map((item) => item.valueKg));
    const max = Math.max(...values.map((item) => item.valueKg));
    const range = Math.max(0.5, max - min);
    const horizontalInset = 10;
    return values.map((item, index) => ({
      x: values.length === 1 ? chartWidth / 2 : horizontalInset + index * (chartWidth - horizontalInset * 2) / (values.length - 1),
      y: values.length === 1 ? (plotTop + plotBottom) / 2 : plotTop + (max - item.valueKg) / range * (plotBottom - plotTop),
      value: item.valueKg,
      time: item.time,
    }));
  }, [chartWidth, plotBottom, plotTop, values]);
  const bezierPoints = useMemo(() => {
    if (points.length < 2) return points;
    const result: typeof points = [];
    points.slice(0, -1).forEach((start, index) => {
      const end = points[index + 1];
      const controlX = (start.x + end.x) / 2;
      for (let step = 0; step < 14; step += 1) {
        const t = step / 14;
        const inverse = 1 - t;
        result.push({
          x: inverse ** 3 * start.x + 3 * inverse ** 2 * t * controlX + 3 * inverse * t ** 2 * controlX + t ** 3 * end.x,
          y: inverse ** 3 * start.y + 3 * inverse ** 2 * t * start.y + 3 * inverse * t ** 2 * end.y + t ** 3 * end.y,
          value: start.value,
          time: start.time,
        });
      }
    });
    result.push(points[points.length - 1]);
    return result;
  }, [points]);

  const selectNearestPoint = (locationX: number) => {
    if (!points.length) return;
    const nearest = points.reduce((best, point, index) => (
      Math.abs(point.x - locationX) < Math.abs(points[best].x - locationX) ? index : best
    ), 0);
    setSelectedIndex(nearest);
  };

  if (!points.length) return <View style={styles.chartEmpty}><Text style={styles.chartEmptyText}>记录后会在这里形成趋势</Text></View>;
  const selectedPoint = selectedIndex === null ? null : points[selectedIndex];
  const formatPointDate = (time: string) => {
    const date = new Date(time);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  return (
    <View
      style={[styles.chart, { width: chartWidth, height: chartHeight }]}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(event) => selectNearestPoint(event.nativeEvent.locationX)}
      onResponderMove={(event) => selectNearestPoint(event.nativeEvent.locationX)}
      onResponderRelease={() => setSelectedIndex(null)}
      onResponderTerminate={() => setSelectedIndex(null)}
      accessibilityLabel="体重趋势图，可左右滑动查看记录"
    >
      <View style={[styles.chartAxis, { top: axisY }]} />

      {points.length >= 2 && bezierPoints.map((point, index) => (
        <View
          key={`fill-${index}`}
          style={[
            styles.areaColumn,
            {
              left: point.x,
              top: point.y + 2,
              width: Math.max(2, chartWidth / Math.max(1, bezierPoints.length - 1) + 1),
              height: Math.max(0, axisY - point.y - 2),
            },
          ]}
        >
          <View style={[styles.areaBand, styles.areaTop]} />
          <View style={[styles.areaBand, styles.areaUpper]} />
          <View style={[styles.areaBand, styles.areaMiddle]} />
          <View style={[styles.areaBand, styles.areaLower]} />
          <View style={[styles.areaBand, styles.areaBottom]} />
        </View>
      ))}

      {points.length >= 2 && bezierPoints.slice(0, -1).map((point, index) => {
        const next = bezierPoints[index + 1];
        const dx = next.x - point.x;
        const dy = next.y - point.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        return <View key={index} style={[styles.chartSegment, { width: length, left: (point.x + next.x - length) / 2, top: (point.y + next.y) / 2, transform: [{ rotate: `${angle}deg` }] }]} />;
      })}

      {points.length === 1 ? (
        <>
          <Text style={[styles.singlePointLabel, { left: points[0].x - 48, top: points[0].y - 31 }]}>{points[0].value} kg</Text>
          <View style={[styles.singlePoint, { left: points[0].x - 6, top: points[0].y - 6 }]} />
        </>
      ) : points.map((point, index) => {
        const isLatest = index === points.length - 1;
        return isLatest ? (
          <View key={index} style={[styles.latestPointRing, { left: point.x - 7, top: point.y - 7 }]}>
            <View style={styles.latestPoint} />
          </View>
        ) : <View key={index} style={[styles.chartPoint, { left: point.x - 4, top: point.y - 4 }]} />;
      })}

      {selectedPoint ? (
        <View pointerEvents="none" style={[styles.chartTooltip, { left: Math.min(chartWidth - 116, Math.max(0, selectedPoint.x - 58)), top: Math.max(2, selectedPoint.y - 43) }]}>
          <Text style={styles.tooltipText}>{formatPointDate(selectedPoint.time)} · {selectedPoint.value} kg</Text>
        </View>
      ) : null}
    </View>
  );
};

const MedicalRecordsList: React.FC<{ records: HospitalRecord[]; onAdd: () => void }> = ({ records, onAdd }) => (
  <SurfaceCard style={styles.widgetCard}>
    <WidgetHeader icon="hospital" title="就诊档案" subtitle={`${records.length} 条记录`} action="+ 新增" onPress={onAdd} />
    {records.length === 0 ? <View style={styles.widgetEmpty}><Text style={styles.widgetEmptyText}>检查结果和化验单会集中保存在这里</Text></View> : records.slice(0, 4).map((record, index) => (
      <View key={record.id} style={[styles.recordRow, index > 0 && styles.recordBorder]}>
        <View style={styles.recordBody}><Text style={styles.recordTitle}>{record.hospital}</Text><Text style={styles.recordMeta}>{formatZhDateTime(record.time)} · {record.indicators}</Text></View>
        {record.imageUri ? <Image source={{ uri: record.imageUri }} style={styles.recordImage} /> : null}
      </View>
    ))}
  </SurfaceCard>
);

const SeizureTrackerWidget: React.FC<{ records: MedicalLogRecord[]; elapsedSeconds: number; running: boolean; onTimer: () => void; onManual: () => void }> = ({ records, elapsedSeconds, running, onTimer, onManual }) => (
  <SurfaceCard style={styles.widgetCard}>
    <View style={styles.seizureHeader}>
      <Text style={styles.widgetTitle}>癫痫发作管理</Text>
      <Text style={styles.seizureCount}>累计 {records.length} 次记录</Text>
    </View>
    <Text style={styles.timerValue}>{elapsedSeconds} 秒</Text>
    <Pressable style={styles.timerButton} onPress={onTimer}>
      <Text style={styles.timerAction}>{running ? '停止并填写记录' : '开始发作计时'}</Text>
    </Pressable>
    <Pressable style={styles.manualButton} onPress={onManual}><Text style={styles.manualText}>补录发作记录</Text></Pressable>
  </SurfaceCard>
);

const WidgetHeader: React.FC<{ icon: 'weight' | 'hospital' | 'health'; title: string; subtitle: string; action?: string; onPress?: () => void }> = ({ icon, title, subtitle, action, onPress }) => (
  <View style={styles.widgetHeader}><View style={styles.widgetIcon}><AppIcon name={icon} size="small" /></View><View style={styles.widgetHeading}><Text style={styles.widgetTitle}>{title}</Text><Text style={styles.widgetSubtitle}>{subtitle}</Text></View>{action && onPress ? <Pressable style={styles.widgetAction} onPress={onPress}><Text style={styles.widgetActionText}>{action}</Text></Pressable> : null}</View>
);

const Sheet: React.FC<React.PropsWithChildren<{ title: string; onClose: () => void }>> = ({ title, onClose, children }) => (
  <View style={styles.backdrop}><Pressable style={StyleSheet.absoluteFill} onPress={onClose} /><KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled"><View style={styles.sheetHeader}><Text style={styles.sheetTitle}>{title}</Text><Pressable onPress={onClose}><Text style={styles.cancel}>取消</Text></Pressable></View>{children}</ScrollView></KeyboardAvoidingView></View>
);

const PrimaryButton: React.FC<{ label: string; onPress: () => void }> = ({ label, onPress }) => <Pressable style={styles.primaryButton} onPress={onPress}><Text style={styles.primaryText}>{label}</Text></Pressable>;
const Option: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({ label, active, onPress }) => <Pressable style={[styles.option, active && styles.optionActive]} onPress={onPress}><Text style={[styles.optionText, active && styles.optionTextActive]}>{label}</Text></Pressable>;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  page: { paddingHorizontal: spacing(2.5), paddingTop: spacing(1.5), paddingBottom: spacing(5) },
  topBar: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  manageButton: { minHeight: 38, paddingHorizontal: spacing(1.25), borderRadius: radius.pill, borderWidth: 0.5, borderColor: colors.borderSoft, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  manageText: { color: colors.accentStrong, fontSize: 12, fontWeight: '800' },
  hero: { marginTop: spacing(3), marginBottom: spacing(1) },
  eyebrow: { color: colors.accentStrong, fontSize: 12, fontWeight: '800', letterSpacing: 1.4 },
  title: { marginTop: 6, color: colors.textPrimary, fontSize: 26, lineHeight: 34, fontWeight: '800' },
  subtitle: { marginTop: 7, color: colors.textSecondary, fontSize: 13 },
  widgetCard: { marginTop: spacing(2), overflow: 'hidden' },
  widgetHeader: { flexDirection: 'row', alignItems: 'center' },
  widgetIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  widgetHeading: { flex: 1, marginLeft: spacing(1.25) },
  widgetTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
  widgetSubtitle: { marginTop: 4, color: colors.textSecondary, fontSize: 13 },
  widgetAction: { minHeight: 36, paddingHorizontal: spacing(1), justifyContent: 'center' },
  widgetActionText: { color: colors.accentStrong, fontSize: 12, fontWeight: '800' },
  chart: { marginTop: spacing(1), alignSelf: 'center', overflow: 'hidden' },
  chartAxis: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: '#EEE8DF' },
  areaColumn: { position: 'absolute', overflow: 'hidden' },
  areaBand: { flex: 1 },
  areaTop: { backgroundColor: 'rgba(166,138,120,0.20)' },
  areaUpper: { backgroundColor: 'rgba(166,138,120,0.14)' },
  areaMiddle: { backgroundColor: 'rgba(166,138,120,0.09)' },
  areaLower: { backgroundColor: 'rgba(166,138,120,0.04)' },
  areaBottom: { backgroundColor: 'rgba(166,138,120,0)' },
  chartSegment: { position: 'absolute', height: 3, borderRadius: 2, backgroundColor: '#A68A78' },
  chartPoint: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: '#A68A78' },
  latestPointRing: { position: 'absolute', width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.82)' },
  latestPoint: { width: 9.6, height: 9.6, borderRadius: 4.8, backgroundColor: '#A68A78' },
  singlePoint: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#A68A78' },
  singlePointLabel: { position: 'absolute', width: 96, color: colors.textPrimary, textAlign: 'center', fontSize: 13, fontWeight: '800' },
  chartTooltip: { position: 'absolute', width: 116, minHeight: 31, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.textPrimary },
  tooltipText: { color: colors.card, fontSize: 11, fontWeight: '700' },
  chartEmpty: { marginTop: spacing(2), minHeight: 100, borderRadius: radius.medium, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  chartEmptyText: { color: colors.textSecondary, fontSize: 12 },
  widgetEmpty: { marginTop: spacing(1.5), minHeight: 90, alignItems: 'center', justifyContent: 'center', borderRadius: radius.medium, backgroundColor: colors.surface },
  widgetEmptyText: { color: colors.textSecondary, fontSize: 12 },
  recordRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', paddingVertical: spacing(1) },
  recordBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.surface },
  recordBody: { flex: 1 },
  recordTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  recordMeta: { marginTop: 4, color: colors.textSecondary, fontSize: 11 },
  recordImage: { width: 44, height: 44, borderRadius: 12, marginLeft: spacing(1) },
  seizureHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seizureCount: { color: colors.textSecondary, fontSize: 13 },
  timerValue: { marginTop: spacing(2.5), marginBottom: spacing(1.25), color: colors.textPrimary, textAlign: 'center', fontSize: 36, fontWeight: '800' },
  timerButton: { minHeight: 62, borderRadius: radius.medium, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E63946' },
  timerAction: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  manualButton: { marginTop: spacing(1), alignSelf: 'center', padding: spacing(1) },
  manualText: { color: colors.accentStrong, fontSize: 12, fontWeight: '800' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(45,52,47,0.28)' },
  keyboard: { width: '100%', maxHeight: '92%' },
  sheet: { maxHeight: '100%', borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.card },
  sheetContent: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2.5), paddingBottom: spacing(5) },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing(1.5) },
  sheetTitle: { color: colors.textPrimary, fontSize: 21, fontWeight: '900' },
  cancel: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },
  managerHint: { marginBottom: spacing(1), color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  widgetSettingRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.surface },
  widgetSettingText: { flex: 1, paddingRight: spacing(1) },
  widgetSettingTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  widgetSettingHint: { marginTop: 4, color: colors.textSecondary, fontSize: 11 },
  requiredText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  largeNumberInput: { minHeight: 80, color: colors.textPrimary, fontSize: 32, fontWeight: '900' },
  input: { marginTop: spacing(1), minHeight: 52, borderRadius: radius.medium, paddingHorizontal: spacing(1.5), paddingVertical: spacing(1), backgroundColor: colors.surface, color: colors.textPrimary },
  multiInput: { minHeight: 96, textAlignVertical: 'top' },
  photoButton: { marginTop: spacing(1), minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  photoText: { color: colors.accentStrong, fontSize: 12, fontWeight: '800' },
  optionRow: { marginTop: spacing(1), flexDirection: 'row', gap: spacing(0.75) },
  option: { flex: 1, minHeight: 44, borderRadius: radius.medium, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  optionActive: { backgroundColor: colors.accentSoft },
  optionText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  optionTextActive: { color: colors.accentStrong },
  primaryButton: { marginTop: spacing(2), minHeight: 52, borderRadius: radius.medium, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentStrong },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});

export default HealthCenterScreen;
