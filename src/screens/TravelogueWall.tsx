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
import {
  exportTraveloguePdf,
  TravelogueExportError,
  TravelogueExportRange,
} from '../features/travelogue/exportTraveloguePdf';
import { useAppState } from '../store';
import { colors, radius, shadow, spacing } from '../theme';

const rotations = ['-2deg', '1.5deg', '-1deg', '2.5deg', '0.8deg', '-1.8deg'] as const;
const imageHeights = [176, 218, 198, 164, 224, 188] as const;
const MORANDI_DOT_COLORS = ['#D9BDB5', '#A8B1A2', '#A9B5C2', '#E3D5B8', '#C49A80'] as const;

const formatTravelDate = (iso: string) => {
  const date = new Date(iso);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
};

const StickerDot: React.FC<{ index: number }> = ({ index }) => (
  <View style={[styles.stickerDot, { backgroundColor: MORANDI_DOT_COLORS[index % MORANDI_DOT_COLORS.length] }]} />
);

const DownloadIcon = () => (
  <View style={styles.downloadIcon}>
    <View style={styles.downloadStem} />
    <View style={styles.downloadArrowLeft} />
    <View style={styles.downloadArrowRight} />
    <View style={styles.downloadTray} />
  </View>
);

export const TravelogueWall: React.FC = () => {
  const { currentPet, footprints, addFootprint } = useAppState();
  const [editorVisible, setEditorVisible] = useState(false);
  const [exportVisible, setExportVisible] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [imageUri, setImageUri] = useState<string>();
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());

  const photoMemories = useMemo(() => footprints.filter((item) => Boolean(item.imageUri)), [footprints]);
  const columns = useMemo(() => [photoMemories.filter((_, index) => index % 2 === 0), photoMemories.filter((_, index) => index % 2 === 1)], [photoMemories]);

  const openEditor = () => {
    setImageUri(undefined);
    setLocation('');
    setNote('');
    setDate(new Date());
    setEditorVisible(true);
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('需要相册权限', '允许访问相册后，才能把回忆放进游记。');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled) setImageUri(result.assets[0]?.uri);
  };

  const save = () => {
    if (!imageUri) {
      Alert.alert('请先选择一张照片');
      return;
    }
    if (!location.trim()) {
      Alert.alert('请填写拍摄地点');
      return;
    }
    addFootprint({
      id: `${Date.now()}`,
      imageUri,
      location: location.trim(),
      note: note.trim(),
      date: date.toISOString(),
    });
    setEditorVisible(false);
  };

  const chooseExportRange = async (range: TravelogueExportRange) => {
    setExportVisible(false);
    setExporting(true);
    try {
      await exportTraveloguePdf({ records: photoMemories, range, petName: currentPet.name });
    } catch (error) {
      if (error instanceof TravelogueExportError) {
        const messages: Record<TravelogueExportError['code'], [string, string]> = {
          NO_PHOTOS: ['没有可导出的照片', '请确认所选时间范围内已经添加宠物游记。'],
          PRINT_UNAVAILABLE: ['PDF 组件不可用', '请使用最新版 Expo Go，或在联网后安装 expo-print。'],
          SHARING_UNAVAILABLE: ['无法打开分享', '当前设备不支持文件分享。'],
          IMAGE_READ_FAILED: ['照片读取失败', '部分照片可能已被移动或删除，请重新选择后再试。'],
        };
        Alert.alert(...messages[error.code]);
      } else {
        Alert.alert('导出失败', '生成 PDF 时遇到问题，请稍后重试。');
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.introRow}>
          <View style={styles.introCopy}>
            <Text style={styles.eyebrow}>TRAVELOGUE</Text>
            <Text style={styles.title}>{currentPet.name}的宠物游记</Text>
            <Text style={styles.subtitle}>把路过的风景，留成可以反复翻阅的回忆。</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={[styles.exportButton, exporting && styles.buttonDisabled]} disabled={exporting} onPress={() => setExportVisible(true)} hitSlop={8} accessibilityLabel="导出游记 PDF">
              {exporting ? <Text style={styles.exportingText}>…</Text> : <DownloadIcon />}
            </Pressable>
            <Pressable style={styles.addButton} onPress={openEditor} hitSlop={8} accessibilityLabel="新增宠物游记">
              <Text style={styles.addButtonText}>添加照片</Text>
            </Pressable>
          </View>
        </View>

        {photoMemories.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyPhoto}><StickerDot index={0} /><Text style={styles.emptyMark}>照片</Text></View>
            <Text style={styles.emptyTitle}>第一张游记，会从哪里开始？</Text>
            <Text style={styles.emptyText}>选一张照片，写下地点和日期。</Text>
          </View>
        ) : (
          <View style={styles.wall}>
            {columns.map((column, columnIndex) => (
              <View key={columnIndex} style={styles.column}>
                {column.map((memory, localIndex) => {
                  const sourceIndex = localIndex * 2 + columnIndex;
                  return (
                    <View key={memory.id} style={[styles.polaroid, { transform: [{ rotate: rotations[sourceIndex % rotations.length] }] }]}>
                      <StickerDot index={sourceIndex} />
                      <Image source={{ uri: memory.imageUri }} style={[styles.photo, { height: imageHeights[sourceIndex % imageHeights.length] }]} />
                      <View style={styles.caption}>
                        <Text style={styles.handwriting} numberOfLines={1}>{memory.location} · {formatTravelDate(memory.date)}</Text>
                        {memory.note ? <Text style={styles.note} numberOfLines={2}>{memory.note}</Text> : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={editorVisible} transparent animationType="slide" onRequestClose={() => setEditorVisible(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditorVisible(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
              <View style={styles.sheetHeader}>
                <View><Text style={styles.sheetTitle}>新建宠物游记</Text><Text style={styles.sheetHint}>一张照片，一处地点，一段回忆。</Text></View>
                <Pressable onPress={() => setEditorVisible(false)}><Text style={styles.cancel}>取消</Text></Pressable>
              </View>
              <Pressable style={styles.photoPicker} onPress={pickImage}>
                {imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} /> : <><Text style={styles.pickerPlus}>+</Text><Text style={styles.pickerText}>从相册选择照片</Text></>}
              </Pressable>
              <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="地点，例如：上海滨江" placeholderTextColor={colors.textMuted} />
              <DateTimePicker value={date} mode="date" display={Platform.OS === 'ios' ? 'compact' : 'default'} onChange={(_, value) => value && setDate(value)} />
              <TextInput style={[styles.input, styles.noteInput]} value={note} onChangeText={setNote} placeholder="写下这天发生的小故事（可选）" placeholderTextColor={colors.textMuted} multiline />
              <Pressable style={styles.saveButton} onPress={save}><Text style={styles.saveText}>收进游记</Text></Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={exportVisible} transparent animationType="slide" onRequestClose={() => setExportVisible(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setExportVisible(false)} />
          <View style={styles.exportSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.exportHeader}>
              <View><Text style={styles.sheetTitle}>导出为 PDF</Text><Text style={styles.sheetHint}>选择需要收进纪念册的时间范围</Text></View>
              <Pressable onPress={() => setExportVisible(false)} hitSlop={10}><Text style={styles.cancel}>取消</Text></Pressable>
            </View>
            {([
              { label: '导出本月', range: 'month' as const, hint: '整理当月的照片回忆' },
              { label: '导出本年', range: 'year' as const, hint: '汇总今年的全部游记' },
              { label: '导出全部', range: 'all' as const, hint: '导出当前宠物的所有游记' },
            ]).map((option, index) => (
              <Pressable key={option.range} style={[styles.exportOption, index < 2 && styles.exportOptionBorder]} onPress={() => chooseExportRange(option.range)}>
                <View style={styles.exportOptionIcon}><DownloadIcon /></View>
                <View style={styles.exportOptionCopy}><Text style={styles.exportOptionTitle}>{option.label}</Text><Text style={styles.exportOptionHint}>{option.hint}</Text></View>
                <Text style={styles.exportChevron}>›</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing(2), paddingTop: spacing(2), paddingBottom: spacing(5) },
  introRow: { flexDirection: 'row', alignItems: 'flex-start' },
  introCopy: { flex: 1, paddingRight: spacing(1) },
  eyebrow: { color: colors.accentStrong, fontSize: 10, fontWeight: '900', letterSpacing: 1.6 },
  title: { marginTop: 5, color: colors.textPrimary, fontSize: 24, fontWeight: '900' },
  subtitle: { marginTop: 7, color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing(0.75) },
  exportButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 0.5, borderColor: colors.borderSoft, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, ...shadow.soft },
  buttonDisabled: { opacity: 0.55 },
  exportingText: { color: colors.accentStrong, fontSize: 20, fontWeight: '900', lineHeight: 20 },
  addButton: { minWidth: 76, height: 42, paddingHorizontal: spacing(1.1), borderRadius: radius.pill, borderWidth: 0.5, borderColor: colors.textPrimary, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.textPrimary, ...shadow.soft },
  addButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  downloadIcon: { width: 18, height: 18, position: 'relative' },
  downloadStem: { position: 'absolute', left: 8, top: 1, width: 1.5, height: 10, borderRadius: 1, backgroundColor: colors.accentStrong },
  downloadArrowLeft: { position: 'absolute', left: 5, top: 7, width: 6, height: 1.5, borderRadius: 1, backgroundColor: colors.accentStrong, transform: [{ rotate: '45deg' }] },
  downloadArrowRight: { position: 'absolute', right: 4, top: 7, width: 6, height: 1.5, borderRadius: 1, backgroundColor: colors.accentStrong, transform: [{ rotate: '-45deg' }] },
  downloadTray: { position: 'absolute', left: 2, right: 2, bottom: 1, height: 5, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderBottomWidth: 1.5, borderColor: colors.accentStrong, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  wall: { marginTop: spacing(3), flexDirection: 'row', gap: spacing(1.5), alignItems: 'flex-start' },
  column: { flex: 1, gap: spacing(2.25) },
  polaroid: { padding: 8, paddingBottom: 0, borderWidth: 0.5, borderColor: colors.borderSoft, backgroundColor: '#FFFFFF', shadowColor: colors.textPrimary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.035, shadowRadius: 3, elevation: 1 },
  photo: { width: '100%', backgroundColor: colors.surface },
  caption: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 3, paddingVertical: 7 },
  handwriting: { color: '#4A4542', fontFamily: 'Handwriting', fontSize: 14, lineHeight: 18 },
  note: { marginTop: 2, color: colors.textSecondary, fontFamily: 'Handwriting', fontSize: 10, lineHeight: 13 },
  stickerDot: { position: 'absolute', zIndex: 2, top: -6, left: '50%', width: 12, height: 12, marginLeft: -6, borderRadius: 6, borderWidth: 1, borderColor: '#FFFFFF' },
  empty: { marginTop: spacing(5), alignItems: 'center' },
  emptyPhoto: { width: 142, height: 170, padding: 9, paddingBottom: 40, borderWidth: 0.5, borderColor: colors.borderSoft, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', transform: [{ rotate: '-2deg' }], ...shadow.soft },
  emptyMark: { color: colors.textMuted, fontFamily: 'Handwriting', fontSize: 18 },
  emptyTitle: { marginTop: spacing(3), color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  emptyText: { marginTop: 6, color: colors.textSecondary, fontSize: 12 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(51,45,43,0.28)' },
  sheet: { maxHeight: '90%', borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: colors.card },
  sheetContent: { padding: spacing(2.5), paddingBottom: spacing(5) },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  sheetTitle: { color: colors.textPrimary, fontSize: 21, fontWeight: '900' },
  sheetHint: { marginTop: 5, color: colors.textSecondary, fontSize: 12 },
  cancel: { color: colors.accentStrong, fontSize: 14, fontWeight: '800' },
  photoPicker: { marginTop: spacing(2), height: 190, borderRadius: radius.large, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: colors.surface },
  preview: { width: '100%', height: '100%' },
  pickerPlus: { color: colors.accentStrong, fontSize: 32, fontWeight: '300' },
  pickerText: { marginTop: 5, color: colors.textSecondary, fontSize: 13 },
  input: { minHeight: 52, marginTop: spacing(1.5), paddingHorizontal: spacing(1.5), borderRadius: radius.medium, backgroundColor: colors.surface, color: colors.textPrimary, fontSize: 14 },
  noteInput: { minHeight: 90, paddingTop: spacing(1.5), textAlignVertical: 'top' },
  saveButton: { minHeight: 52, marginTop: spacing(2), borderRadius: radius.medium, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentStrong },
  saveText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  exportSheet: { paddingHorizontal: spacing(2.5), paddingTop: spacing(1), paddingBottom: spacing(5), borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: colors.card },
  sheetHandle: { width: 38, height: 4, marginBottom: spacing(2), borderRadius: 2, alignSelf: 'center', backgroundColor: colors.borderSoft },
  exportHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing(1.5) },
  exportOption: { minHeight: 76, flexDirection: 'row', alignItems: 'center' },
  exportOptionBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSoft },
  exportOptionIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  exportOptionCopy: { flex: 1, marginLeft: spacing(1.25) },
  exportOptionTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '800' },
  exportOptionHint: { marginTop: 4, color: colors.textSecondary, fontSize: 11 },
  exportChevron: { color: colors.textMuted, fontSize: 24 },
});

export default TravelogueWall;
