import React, { useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TimelineEntry, toTimelineEntryViewModel } from '../features/timeline/TimelineEntry';
import { useAppState, useTimeline } from '../store';
import { colors, radius, shadow, spacing } from '../theme';
import { TimelineItem } from '../types';
import { formatZhDateTime } from '../utils/date';
import { TravelogueWall } from './TravelogueWall';

type MemoryMode = 'timeline' | 'travelogue';
type EntryDetail = ReturnType<typeof toTimelineEntryViewModel> & { time: string };

const weekdayMap = ['日', '一', '二', '三', '四', '五', '六'];

const itemTimestamp = (item: TimelineItem) => item.kind === 'footprint' ? item.date : item.kind === 'medication' ? item.takenAt : item.time;

const toDayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const formatTime = (iso: string) => {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const buildMonthDays = (baseDate: Date) => {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const count = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ day: number; key: string } | null> = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= count; day += 1) {
    cells.push({ day, key: toDayKey(new Date(year, month, day)) });
  }
  return cells;
};

export const TimelineScreen: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const insets = useSafeAreaInsets();
  const allItems = useTimeline();
  const { currentPet } = useAppState();
  const [mode, setMode] = useState<MemoryMode>('timeline');
  const [monthCursor, setMonthCursor] = useState(new Date());
  const [selectedDayKey, setSelectedDayKey] = useState(toDayKey(new Date()));
  const [detail, setDetail] = useState<EntryDetail | null>(null);

  // Footprints belong to the emotional photo wall; the TimeBook stays focused on daily events.
  const timelineItems = useMemo(() => allItems.filter((item) => item.kind !== 'footprint'), [allItems]);
  const monthCells = useMemo(() => buildMonthDays(monthCursor), [monthCursor]);
  const daysWithData = useMemo(() => new Set(timelineItems.map((item) => toDayKey(new Date(itemTimestamp(item))))), [timelineItems]);
  const selectedItems = useMemo(() => timelineItems.filter((item) => toDayKey(new Date(itemTimestamp(item))) === selectedDayKey), [timelineItems, selectedDayKey]);

  const selectedDateLabel = useMemo(() => {
    const [year, month, day] = selectedDayKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return `${month}月${day}日 · 星期${weekdayMap[date.getDay()]}`;
  }, [selectedDayKey]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={[styles.header, { paddingTop: insets.top + spacing(1.5) }]}>
        <View>
          <Text style={styles.headerEyebrow}>回忆空间</Text>
          <Text style={styles.headerTitle}>{currentPet.name}的故事</Text>
        </View>
        {onClose ? <Pressable style={styles.doneButton} onPress={onClose} hitSlop={10}><Text style={styles.doneText}>完成</Text></Pressable> : null}
      </View>

      <View style={styles.segmented}>
        <Pressable style={[styles.segment, mode === 'timeline' && styles.segmentActive]} onPress={() => setMode('timeline')}>
          <Text style={[styles.segmentText, mode === 'timeline' && styles.segmentTextActive]}>时光本</Text>
        </Pressable>
        <Pressable style={[styles.segment, mode === 'travelogue' && styles.segmentActive]} onPress={() => setMode('travelogue')}>
          <Text style={[styles.segmentText, mode === 'travelogue' && styles.segmentTextActive]}>宠物游记</Text>
        </Pressable>
      </View>

      {mode === 'travelogue' ? (
        <TravelogueWall />
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.intro}>日常打卡、花销和文字日记，按时间慢慢沉淀。</Text>

          <View style={styles.calendarCard}>
            <View style={styles.monthHeader}>
              <Pressable style={styles.monthButton} onPress={() => setMonthCursor((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1))}><Text style={styles.monthArrow}>‹</Text></Pressable>
              <Text style={styles.monthTitle}>{monthCursor.getFullYear()}年 {monthCursor.getMonth() + 1}月</Text>
              <Pressable style={styles.monthButton} onPress={() => setMonthCursor((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1))}><Text style={styles.monthArrow}>›</Text></Pressable>
            </View>
            <View style={styles.weekRow}>{weekdayMap.map((weekday) => <Text key={weekday} style={styles.weekText}>{weekday}</Text>)}</View>
            <View style={styles.calendarGrid}>
              {monthCells.map((cell, index) => cell ? (
                <Pressable key={cell.key} style={[styles.dayCell, selectedDayKey === cell.key && styles.dayCellActive]} onPress={() => setSelectedDayKey(cell.key)}>
                  <Text style={[styles.dayText, selectedDayKey === cell.key && styles.dayTextActive]}>{cell.day}</Text>
                  {daysWithData.has(cell.key) ? <View style={[styles.dayDot, selectedDayKey === cell.key && styles.dayDotActive]} /> : <View style={styles.dotSpace} />}
                </Pressable>
              ) : <View key={`empty-${index}`} style={styles.dayCell} />)}
            </View>
          </View>

          <View style={styles.listHeader}>
            <View><Text style={styles.listEyebrow}>TIMELINE</Text><Text style={styles.listTitle}>{selectedDateLabel}</Text></View>
            <Text style={styles.count}>{selectedItems.length} 条</Text>
          </View>
          {selectedItems.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>这一天还没有留下记录</Text>
              <Text style={styles.emptyText}>打卡一件小事，时光本就会从这里开始。</Text>
            </View>
          ) : selectedItems.map((item, index) => {
            const timestamp = itemTimestamp(item);
            const viewModel = toTimelineEntryViewModel(item);
            return (
              <TimelineEntry
                key={`${item.kind}-${item.id}`}
                item={item}
                timeLabel={formatTime(timestamp)}
                isLast={index === selectedItems.length - 1}
                onPress={viewModel.imageUri ? () => setDetail({ ...viewModel, time: formatZhDateTime(timestamp) }) : undefined}
              />
            );
          })}
        </ScrollView>
      )}

      <Modal visible={Boolean(detail)} transparent animationType="fade" onRequestClose={() => setDetail(null)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDetail(null)} />
          {detail ? <View style={styles.detailCard}>
            <Text style={styles.detailCategory}>{detail.category}</Text>
            <Text style={styles.detailTitle}>{detail.title}</Text>
            <Text style={styles.detailTime}>{detail.time}</Text>
            {detail.detail ? <Text style={styles.detailText}>{detail.detail}</Text> : null}
            {detail.imageUri ? <Image source={{ uri: detail.imageUri }} style={styles.detailImage} /> : null}
            <Pressable style={styles.closeButton} onPress={() => setDetail(null)}><Text style={styles.closeText}>关闭</Text></Pressable>
          </View> : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing(2.5), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerEyebrow: { color: colors.accentStrong, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  headerTitle: { marginTop: 4, color: colors.textPrimary, fontSize: 24, fontWeight: '900' },
  doneButton: { minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  doneText: { color: colors.accentStrong, fontSize: 14, fontWeight: '800' },
  segmented: { marginHorizontal: spacing(2.5), marginTop: spacing(2), marginBottom: spacing(0.5), padding: 4, borderRadius: radius.pill, flexDirection: 'row', backgroundColor: colors.surface },
  segment: { flex: 1, minHeight: 38, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { borderWidth: 0.5, borderColor: colors.borderSoft, backgroundColor: colors.card, ...shadow.soft },
  segmentText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  segmentTextActive: { color: colors.textPrimary, fontWeight: '900' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing(2.5), paddingTop: spacing(1.5), paddingBottom: spacing(5) },
  intro: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  calendarCard: { marginTop: spacing(1.5), padding: spacing(1.5), borderRadius: radius.large, borderWidth: 0.5, borderColor: colors.borderSoft, backgroundColor: colors.card, ...shadow.soft },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  monthArrow: { marginTop: -2, color: colors.textPrimary, fontSize: 22 },
  monthTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '900' },
  weekRow: { marginTop: spacing(1.25), flexDirection: 'row' },
  weekText: { width: `${100 / 7}%`, color: colors.textMuted, textAlign: 'center', fontSize: 11, fontWeight: '700' },
  calendarGrid: { marginTop: 4, flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, minHeight: 39, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  dayCellActive: { backgroundColor: colors.accentStrong },
  dayText: { color: colors.textPrimary, fontSize: 12 },
  dayTextActive: { color: '#FFFFFF', fontWeight: '900' },
  dayDot: { width: 4, height: 4, marginTop: 3, borderRadius: 2, backgroundColor: colors.accentStrong },
  dayDotActive: { backgroundColor: '#FFFFFF' },
  dotSpace: { height: 7 },
  listHeader: { marginTop: spacing(3), marginBottom: spacing(1.5), flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  listEyebrow: { color: colors.accentStrong, fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  listTitle: { marginTop: 4, color: colors.textPrimary, fontSize: 18, fontWeight: '900' },
  count: { color: colors.textSecondary, fontSize: 12 },
  empty: { minHeight: 180, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '800' },
  emptyText: { marginTop: 7, color: colors.textSecondary, fontSize: 12, textAlign: 'center' },
  backdrop: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing(2.5), backgroundColor: 'rgba(51,45,43,0.32)' },
  detailCard: { padding: spacing(2), borderRadius: radius.large, borderWidth: 0.5, borderColor: colors.borderSoft, backgroundColor: colors.card, ...shadow.jelly },
  detailCategory: { color: colors.accentStrong, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  detailTitle: { marginTop: 7, color: colors.textPrimary, fontSize: 21, fontWeight: '900' },
  detailTime: { marginTop: 5, color: colors.textSecondary, fontSize: 12 },
  detailText: { marginTop: spacing(1), color: colors.textPrimary, fontSize: 14, lineHeight: 21 },
  detailImage: { width: '100%', height: 240, marginTop: spacing(1.5), borderRadius: radius.large },
  closeButton: { minHeight: 48, marginTop: spacing(2), borderRadius: radius.medium, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentStrong },
  closeText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});

export default TimelineScreen;
