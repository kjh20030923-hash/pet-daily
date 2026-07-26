import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ACTIVITY_TITLE_MAP } from '../checkin/actionConfig';
import { colors, spacing } from '../../theme';
import { TimelineItem } from '../../types';

const itemTime = (item: TimelineItem) => item.kind === 'footprint' ? item.date : item.kind === 'medication' ? item.takenAt : item.time;

const formatTime = (iso: string) => {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const getFeedCopy = (item: TimelineItem) => {
  if (item.kind === 'activity') return `${item.isMoodEntry ? '状态' : ACTIVITY_TITLE_MAP[item.type]}${item.detail ? ` · ${item.detail}` : ''}`;
  if (item.kind === 'bath') return '洗澡 · 完成护理';
  if (item.kind === 'draft') return `日记 · ${item.content}`;
  if (item.kind === 'expense') return `${item.category}花销 · ¥${item.amount.toFixed(2)}`;
  if (item.kind === 'hospital') return `就诊 · ${item.hospital}`;
  if (item.kind === 'medical') return `发作记录 · ${item.durationSeconds}秒`;
  if (item.kind === 'medication') return `用药 · ${item.medName} ${item.dosage}`;
  return `游记 · ${item.location}`;
};

export const TodayFeed: React.FC<{ items: TimelineItem[] }> = ({ items }) => {
  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyDot} />
        <Text style={styles.emptyTitle}>今天还没有记录</Text>
        <Text style={styles.emptyText}>点击底部 + 号开始</Text>
      </View>
    );
  }

  return (
    <View>
      {items.map((item, index) => (
        <View key={`${item.kind}-${item.id}`} style={styles.row}>
          <Text style={styles.time}>{formatTime(itemTime(item))}</Text>
          <View style={styles.rail}>
            <View style={styles.dot} />
            {index < items.length - 1 ? <View style={styles.line} /> : null}
          </View>
          <Text style={styles.content}>{getFeedCopy(item)}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { minHeight: 62, flexDirection: 'row', alignItems: 'flex-start' },
  time: { width: 45, paddingTop: 1, color: colors.textMuted, fontSize: 12, fontVariant: ['tabular-nums'] },
  rail: { width: 24, minHeight: 62, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textPrimary },
  line: { width: StyleSheet.hairlineWidth, flex: 1, marginTop: 5, backgroundColor: '#D8D2CD' },
  content: { flex: 1, marginTop: -5, paddingBottom: spacing(2), color: colors.textPrimary, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  empty: { minHeight: 190, alignItems: 'center', justifyContent: 'center' },
  emptyDot: { width: 9, height: 9, marginBottom: spacing(1.5), borderRadius: 5, backgroundColor: colors.accent },
  emptyTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '800' },
  emptyText: { marginTop: 7, color: colors.textSecondary, fontSize: 12 },
});
