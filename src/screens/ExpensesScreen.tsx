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
import { SafeAreaView } from 'react-native-safe-area-context';
import { SurfaceCard } from '../components/SurfaceCard';
import { useAppState } from '../store';
import { colors, radius, spacing } from '../theme';
import { ExpenseCategory, ExpenseRecord } from '../types';

type PeriodMode = 'month' | 'year';
type PetFilter = 'all' | string;

const categories: ExpenseCategory[] = ['主粮', '零食', '医疗', '洗护', '用品', '其他'];
const categoryColors: Record<string, string> = {
  主粮: '#91A394',
  饮食: '#91A394',
  零食: '#C4AE98',
  医疗: '#C7A7A1',
  洗护: '#9DAAB5',
  美容: '#9DAAB5',
  用品: '#ADA3B4',
  其他: '#B8B8B2',
};

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
};

export const ExpensesScreen: React.FC = () => {
  const { pets, currentPet, allExpenses, addExpense } = useAppState();
  const [petFilter, setPetFilter] = useState<PetFilter>('all');
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
  const [cursor, setCursor] = useState(new Date());
  const [modalVisible, setModalVisible] = useState(false);
  const [formPetId, setFormPetId] = useState(currentPet.id);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('主粮');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date());

  const visibleExpenses = useMemo(() => allExpenses
    .filter((record) => petFilter === 'all' || record.petId === petFilter)
    .filter((record) => {
      const value = new Date(record.time);
      const sameYear = value.getFullYear() === cursor.getFullYear();
      return periodMode === 'year' ? sameYear : sameYear && value.getMonth() === cursor.getMonth();
    })
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()),
  [allExpenses, cursor, periodMode, petFilter]);

  const total = visibleExpenses.reduce((sum, record) => sum + record.amount, 0);
  const categoryData = useMemo(() => {
    const grouped = new Map<string, number>();
    visibleExpenses.forEach((record) => grouped.set(record.category, (grouped.get(record.category) ?? 0) + record.amount));
    return Array.from(grouped.entries())
      .map(([name, value]) => ({ name, value, color: categoryColors[name] ?? categoryColors.其他 }))
      .sort((a, b) => b.value - a.value);
  }, [visibleExpenses]);

  const movePeriod = (direction: -1 | 1) => {
    setCursor((previous) => periodMode === 'month'
      ? new Date(previous.getFullYear(), previous.getMonth() + direction, 1)
      : new Date(previous.getFullYear() + direction, previous.getMonth(), 1));
  };

  const periodLabel = periodMode === 'month'
    ? `${cursor.getFullYear()}年 ${cursor.getMonth() + 1}月`
    : `${cursor.getFullYear()}年`;

  const openAdd = () => {
    setFormPetId(petFilter === 'all' ? currentPet.id : petFilter);
    setAmount('');
    setTitle('');
    setCategory('主粮');
    setDate(new Date());
    setModalVisible(true);
  };

  const save = () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert('请输入正确的金额');
      return;
    }
    addExpense({ id: `${Date.now()}`, amount: value, category, note: title.trim() || undefined, time: date.toISOString() }, formPetId);
    setModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View><Text style={styles.eyebrow}>宠物账本</Text><Text style={styles.title}>花费记录</Text></View>
          <Pressable style={styles.addButton} onPress={openAdd}><Text style={styles.addButtonText}>记一笔</Text></Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.petFilters}>
          <FilterChip label="全部宠物" active={petFilter === 'all'} onPress={() => setPetFilter('all')} />
          {pets.map((pet) => <FilterChip key={pet.id} label={pet.name} active={petFilter === pet.id} onPress={() => setPetFilter(pet.id)} />)}
        </ScrollView>

        <View style={styles.periodCard}>
          <View style={styles.modeSwitch}>
            <Pressable style={[styles.modeItem, periodMode === 'month' && styles.modeItemActive]} onPress={() => setPeriodMode('month')}><Text style={styles.modeText}>月度</Text></Pressable>
            <Pressable style={[styles.modeItem, periodMode === 'year' && styles.modeItemActive]} onPress={() => setPeriodMode('year')}><Text style={styles.modeText}>年度</Text></Pressable>
          </View>
          <View style={styles.periodSelector}>
            <Pressable style={styles.periodArrow} onPress={() => movePeriod(-1)}><Text style={styles.periodArrowText}>‹</Text></Pressable>
            <Text style={styles.periodLabel}>{periodLabel}</Text>
            <Pressable style={styles.periodArrow} onPress={() => movePeriod(1)}><Text style={styles.periodArrowText}>›</Text></Pressable>
          </View>
        </View>

        <SurfaceCard style={styles.summaryCard}>
          <Text style={styles.totalLabel}>{periodMode === 'month' ? '本月总支出' : '本年总支出'}</Text>
          <Text style={styles.totalAmount}>¥ {total.toFixed(2)}</Text>
          <View style={styles.chartRow}>
            <DonutChart data={categoryData} total={total} />
            <View style={styles.legend}>
              {categoryData.slice(0, 5).map((item) => (
                <View key={item.name} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={styles.legendName}>{item.name}</Text>
                  <Text style={styles.legendValue}>{total ? `${Math.round(item.value / total * 100)}%` : '0%'}</Text>
                </View>
              ))}
              {categoryData.length === 0 ? <Text style={styles.noChart}>暂无分类数据</Text> : null}
            </View>
          </View>
        </SurfaceCard>

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>支出明细</Text><Text style={styles.sectionMeta}>{visibleExpenses.length} 笔</Text></View>
        {visibleExpenses.length === 0 ? (
          <SurfaceCard style={styles.emptyCard}><Text style={styles.emptyTitle}>这个周期还没有花费</Text><Text style={styles.emptyHint}>点击右上角，记录第一笔支出。</Text></SurfaceCard>
        ) : visibleExpenses.map((record) => {
          const pet = pets.find((item) => item.id === record.petId);
          return (
            <SurfaceCard key={record.id} style={styles.expenseCard}>
              <View style={[styles.categoryIcon, { backgroundColor: `${categoryColors[record.category] ?? categoryColors.其他}30` }]}><Text style={styles.categoryInitial}>{record.category.slice(0, 1)}</Text></View>
              <View style={styles.expenseBody}><Text style={styles.expenseTitle}>{record.note || record.category}</Text><Text style={styles.expenseMeta}>{formatDate(record.time)} · {pet?.name ?? '宠物'}</Text></View>
              <Text style={styles.expenseAmount}>- ¥{record.amount.toFixed(2)}</Text>
            </SurfaceCard>
          );
        })}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />
          <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
              <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>记一笔花费</Text><Pressable onPress={() => setModalVisible(false)}><Text style={styles.cancel}>取消</Text></Pressable></View>
              <TextInput value={amount} onChangeText={setAmount} style={styles.amountInput} placeholder="¥ 0.00" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" autoFocus />
              <Text style={styles.fieldLabel}>属于哪只宠物</Text>
              <View style={styles.wrapRow}>{pets.map((pet) => <FilterChip key={pet.id} label={pet.name} active={formPetId === pet.id} onPress={() => setFormPetId(pet.id)} />)}</View>
              <Text style={styles.fieldLabel}>支出分类</Text>
              <View style={styles.wrapRow}>{categories.map((item) => <FilterChip key={item} label={item} active={category === item} onPress={() => setCategory(item)} />)}</View>
              <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="买了什么（可选）" placeholderTextColor={colors.textSecondary} />
              <DateTimePicker value={date} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(_, value) => value && setDate(value)} />
              <Pressable style={styles.saveButton} onPress={save}><Text style={styles.saveText}>保存这笔花费</Text></Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const FilterChip: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({ label, active, onPress }) => (
  <Pressable style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress}><Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text></Pressable>
);

const DonutChart: React.FC<{ data: Array<{ name: string; value: number; color: string }>; total: number }> = ({ data, total }) => {
  const ticks = 48;
  const cumulative = data.reduce<Array<{ end: number; color: string }>>((result, item) => {
    const previous = result[result.length - 1]?.end ?? 0;
    result.push({ end: previous + (total ? item.value / total : 0), color: item.color });
    return result;
  }, []);
  return (
    <View style={styles.donut}>
      {Array.from({ length: ticks }, (_, index) => {
        const ratio = index / ticks;
        const color = cumulative.find((item) => ratio <= item.end)?.color ?? colors.borderSoft;
        return <View key={index} style={[styles.donutTick, { backgroundColor: color, transform: [{ rotate: `${index * 360 / ticks}deg` }, { translateY: -66 }] }]} />;
      })}
      <View style={styles.donutCenter}><Text style={styles.donutCaption}>分类</Text><Text style={styles.donutCount}>{data.length}</Text></View>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  page: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2), paddingBottom: spacing(5) },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: colors.accentStrong, fontSize: 12, fontWeight: '800', letterSpacing: 1.4 },
  title: { marginTop: 5, color: colors.textPrimary, fontSize: 29, fontWeight: '900' },
  addButton: { minWidth: 72, height: 42, paddingHorizontal: spacing(1.25), borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentStrong },
  addButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  petFilters: { marginTop: spacing(2), gap: spacing(0.75), paddingRight: spacing(2) },
  filterChip: { minHeight: 38, paddingHorizontal: spacing(1.25), borderRadius: radius.pill, borderWidth: 0.5, borderColor: colors.borderSoft, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  filterChipActive: { backgroundColor: colors.accentSoft },
  filterText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  filterTextActive: { color: colors.accentStrong },
  periodCard: { marginTop: spacing(2), padding: 5, borderRadius: radius.large, borderWidth: 0.5, borderColor: colors.borderSoft, backgroundColor: colors.card },
  modeSwitch: { flexDirection: 'row', padding: 3, borderRadius: radius.medium, backgroundColor: colors.surface },
  modeItem: { flex: 1, minHeight: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modeItemActive: { backgroundColor: colors.card },
  modeText: { color: colors.textPrimary, fontSize: 12, fontWeight: '800' },
  periodSelector: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  periodArrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  periodArrowText: { color: colors.textSecondary, fontSize: 26 },
  periodLabel: { color: colors.textPrimary, fontSize: 16, fontWeight: '900' },
  summaryCard: { marginTop: spacing(1.5) },
  totalLabel: { color: colors.textSecondary, fontSize: 12 },
  totalAmount: { marginTop: 6, color: colors.textPrimary, fontSize: 34, fontWeight: '900' },
  chartRow: { marginTop: spacing(2), flexDirection: 'row', alignItems: 'center' },
  donut: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center' },
  donutTick: { position: 'absolute', left: 77, top: 74, width: 6, height: 13, borderRadius: 3 },
  donutCenter: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  donutCaption: { color: colors.textSecondary, fontSize: 11 },
  donutCount: { marginTop: 2, color: colors.textPrimary, fontSize: 20, fontWeight: '900' },
  legend: { flex: 1, marginLeft: spacing(1) },
  legendRow: { minHeight: 25, flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendName: { flex: 1, marginLeft: 7, color: colors.textSecondary, fontSize: 11 },
  legendValue: { color: colors.textPrimary, fontSize: 11, fontWeight: '800' },
  noChart: { color: colors.textSecondary, fontSize: 12 },
  sectionHeader: { marginTop: spacing(3), marginBottom: spacing(1.25), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '900' },
  sectionMeta: { color: colors.textSecondary, fontSize: 11 },
  expenseCard: { marginBottom: spacing(1), padding: spacing(1.25), flexDirection: 'row', alignItems: 'center' },
  categoryIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  categoryInitial: { color: colors.textPrimary, fontSize: 14, fontWeight: '900' },
  expenseBody: { flex: 1, marginLeft: spacing(1.25) },
  expenseTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  expenseMeta: { marginTop: 4, color: colors.textSecondary, fontSize: 11 },
  expenseAmount: { color: colors.textPrimary, fontSize: 14, fontWeight: '900' },
  emptyCard: { minHeight: 140, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '800' },
  emptyHint: { marginTop: 6, color: colors.textSecondary, fontSize: 12 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(45,52,47,0.28)' },
  keyboard: { width: '100%', maxHeight: '92%' },
  sheet: { maxHeight: '100%', borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.card },
  sheetContent: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2.5), paddingBottom: spacing(5) },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { color: colors.textPrimary, fontSize: 21, fontWeight: '900' },
  cancel: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },
  amountInput: { marginTop: spacing(1.5), minHeight: 72, color: colors.textPrimary, fontSize: 34, fontWeight: '900' },
  fieldLabel: { marginTop: spacing(1.5), marginBottom: spacing(0.75), color: colors.textPrimary, fontSize: 13, fontWeight: '800' },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(0.75) },
  input: { marginTop: spacing(1.5), minHeight: 52, borderRadius: radius.medium, paddingHorizontal: spacing(1.5), backgroundColor: colors.surface, color: colors.textPrimary },
  saveButton: { marginTop: spacing(2), minHeight: 52, borderRadius: radius.medium, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentStrong },
  saveText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});

export default ExpensesScreen;
