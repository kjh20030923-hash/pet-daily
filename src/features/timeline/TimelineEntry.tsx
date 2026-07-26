import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ACTIVITY_TITLE_MAP } from '../checkin/actionConfig';
import { colors, radius, spacing } from '../../theme';
import { TimelineItem } from '../../types';

export type TimelineEntryViewModel = {
  category: string;
  title: string;
  detail?: string;
  amount?: string;
  imageUri?: string;
  accent: string;
};

// The discriminated union keeps every record type explicit and exhaustively rendered.
export const toTimelineEntryViewModel = (item: TimelineItem): TimelineEntryViewModel => {
  switch (item.kind) {
    case 'activity':
      return {
        category: item.isMoodEntry ? '状态' : '日常打卡',
        title: item.isMoodEntry ? '今日状态' : ACTIVITY_TITLE_MAP[item.type],
        detail: item.detail,
        imageUri: item.imageUri,
        accent: colors.sand,
      };
    case 'expense':
      return {
        category: '花销',
        title: item.category,
        detail: item.note,
        amount: `-¥${item.amount.toFixed(2)}`,
        accent: colors.rose,
      };
    case 'draft':
      return { category: '宠物日记', title: item.content, accent: colors.accent };
    case 'bath':
      return { category: '护理', title: '完成洗澡', accent: colors.blue };
    case 'medical':
      return { category: '健康', title: '发作记录', detail: `${item.durationSeconds} 秒 · ${item.text}`, accent: colors.rose };
    case 'hospital':
      return { category: '健康', title: item.hospital, detail: item.note || item.indicators, imageUri: item.imageUri, accent: colors.blue };
    case 'medication':
      return { category: '用药', title: `已服用 ${item.medName}`, detail: item.dosage, accent: colors.accentStrong };
    case 'footprint':
      return { category: '游记', title: item.location, detail: item.note, imageUri: item.imageUri, accent: colors.accent };
  }
};

export const TimelineEntry: React.FC<{
  item: TimelineItem;
  timeLabel: string;
  isLast: boolean;
  onPress?: () => void;
}> = ({ item, timeLabel, isLast, onPress }) => {
  const viewModel = toTimelineEntryViewModel(item);
  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <View style={[styles.node, { borderColor: viewModel.accent }]}><View style={[styles.nodeCore, { backgroundColor: viewModel.accent }]} /></View>
        {!isLast ? <View style={styles.line} /> : null}
      </View>
      <Pressable disabled={!onPress} onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <View style={styles.metaRow}>
          <Text style={[styles.category, { color: viewModel.accent }]}>{viewModel.category}</Text>
          <Text style={styles.time}>{timeLabel}</Text>
        </View>
        <View style={styles.contentRow}>
          <View style={styles.copy}>
            <Text style={styles.title} numberOfLines={item.kind === 'draft' ? 3 : 1}>{viewModel.title}</Text>
            {viewModel.detail ? <Text style={styles.detail} numberOfLines={2}>{viewModel.detail}</Text> : null}
          </View>
          {viewModel.amount ? <Text style={styles.amount}>{viewModel.amount}</Text> : null}
          {viewModel.imageUri ? <Image source={{ uri: viewModel.imageUri }} style={styles.thumb} /> : null}
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', minHeight: 94 },
  rail: { width: 28, alignItems: 'center' },
  node: { width: 13, height: 13, borderRadius: 7, borderWidth: 1.5, padding: 3, backgroundColor: colors.background },
  nodeCore: { flex: 1, borderRadius: 4 },
  line: { width: 1, flex: 1, marginVertical: 5, backgroundColor: '#DED9D4' },
  card: { flex: 1, minHeight: 78, marginLeft: spacing(0.75), marginBottom: spacing(1.5), padding: spacing(1.25), borderRadius: radius.large, borderWidth: 0.5, borderColor: colors.borderSoft, backgroundColor: colors.card },
  pressed: { opacity: 0.72 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  category: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  time: { color: colors.textMuted, fontSize: 11 },
  contentRow: { marginTop: 7, flexDirection: 'row', alignItems: 'center' },
  copy: { flex: 1 },
  title: { color: colors.textPrimary, fontSize: 15, lineHeight: 21, fontWeight: '800' },
  detail: { marginTop: 3, color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
  amount: { marginLeft: spacing(1), color: colors.textPrimary, fontSize: 16, fontWeight: '900' },
  thumb: { width: 48, height: 48, marginLeft: spacing(1), borderRadius: 13 },
});
