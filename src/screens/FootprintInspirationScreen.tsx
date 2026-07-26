import React, { useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { colors, radius, spacing } from '../theme';
import { DraftRecord, FootprintRecord } from '../types';
import { useAppState } from '../store';
import { formatZhDate, formatZhDateTime } from '../utils/date';

export const FootprintInspirationScreen: React.FC = () => {
  const { currentPet, footprints, addFootprint, drafts, addDraft } = useAppState();

  const [footModal, setFootModal] = useState(false);
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);
  const [date, setDate] = useState(new Date());
  const [text, setText] = useState('');

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('无法访问照片', '请在手机设置中允许照片权限后再试。');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0]?.uri);
  };

  const saveFootprint = () => {
    if (!location.trim() && !note.trim()) {
      Alert.alert('内容还是空的', '请至少填写地点或今天发生的事情。');
      return;
    }
    const record: FootprintRecord = {
      id: `${Date.now()}`,
      imageUri,
      location: location.trim() || '未命名地点',
      date: date.toISOString(),
      note: note.trim(),
    };
    addFootprint(record);
    setFootModal(false);
    setLocation('');
    setNote('');
    setImageUri(undefined);
    setDate(new Date());
  };

  const saveDraft = () => {
    if (!text.trim()) {
      Alert.alert('还没有灵感内容', '先写下一句话再保存吧。');
      return;
    }
    const record: DraftRecord = {
      id: `${Date.now()}`,
      content: text.trim(),
      time: new Date().toISOString(),
    };
    addDraft(record);
    setText('');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>回忆与灵感</Text>
        <Text style={styles.title}>{currentPet.name}的收藏夹</Text>
        <Text style={styles.subtitle}>记录一起去过的地方，也收好偶然想到的事情</Text>

        <View style={styles.blockCard}>
          <View style={styles.blockHeader}>
            <Text style={styles.blockTitle}>足迹</Text>
            <Pressable style={styles.addButton} onPress={() => setFootModal(true)}>
              <Text style={styles.addButtonText}>新增</Text>
            </Pressable>
          </View>
          {footprints.length === 0 ? (
            <Text style={styles.emptyText}>还没有足迹，带{currentPet.name}去探索新的地方吧。</Text>
          ) : (
            <View style={styles.footList}>
              {footprints.map((f) => (
                <View key={f.id} style={styles.footItem}>
                  {f.imageUri ? <Image source={{ uri: f.imageUri }} style={styles.footImage} /> : null}
                  <View style={styles.footText}>
                    <Text style={styles.footLocation}>{f.location}</Text>
                    <Text style={styles.footDate}>{formatZhDate(f.date)}</Text>
                    {f.note ? <Text style={styles.footNote}>{f.note}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.blockCard}>
          <Text style={styles.blockTitle}>灵感</Text>
          <TextInput
            style={styles.input}
            placeholder={`写下关于${currentPet.name}的灵感...`}
            placeholderTextColor={colors.textSecondary}
            value={text}
            onChangeText={setText}
            multiline
          />
          <Pressable style={styles.saveButton} onPress={saveDraft}>
            <Text style={styles.saveButtonText}>保存灵感</Text>
          </Pressable>
          {drafts.slice(0, 6).map((d) => (
            <View key={d.id} style={styles.draftItem}>
              <Text style={styles.draftTime}>{formatZhDateTime(d.time)}</Text>
              <Text style={styles.draftContent}>{d.content}</Text>
              <Pressable
                style={styles.copyButton}
                onPress={async () => {
                  await Clipboard.setStringAsync(d.content);
                  Alert.alert('已复制', '灵感内容已经复制到剪贴板。');
                }}
              >
                <Text style={styles.copyText}>复制</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={footModal}
        transparent
        animationType="slide"
        onRequestClose={() => setFootModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            style={styles.modalKeyboard}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
          <ScrollView
            style={styles.modalCard}
            contentContainerStyle={styles.modalCardContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalTopRow}>
            <Text style={styles.modalTitle}>记录足迹</Text>
              <Pressable onPress={() => setFootModal(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>取消</Text>
              </Pressable>
            </View>
            <Pressable style={styles.photoButton} onPress={pickImage}>
              <Text style={styles.photoButtonText}>{imageUri ? '照片已选择，点击更换' : '添加一张照片（可选）'}</Text>
            </Pressable>
            <TextInput
              style={styles.modalInput}
              value={location}
              onChangeText={setLocation}
              placeholder="地点"
              placeholderTextColor={colors.textSecondary}
            />
            <DateTimePicker
              value={date}
              mode="date"
              display="spinner"
              locale="zh-CN"
              onChange={(_, d) => d && setDate(d)}
            />
            <TextInput
              style={[styles.modalInput, styles.modalNote]}
              value={note}
              onChangeText={setNote}
              placeholder="今天发生了什么"
              placeholderTextColor={colors.textSecondary}
              multiline
            />
            <Pressable style={styles.saveButton} onPress={saveFootprint}>
              <Text style={styles.saveButtonText}>保存足迹</Text>
            </Pressable>
            <Pressable style={styles.closeButton} onPress={() => setFootModal(false)}>
              <Text style={styles.closeButtonText}>取消</Text>
            </Pressable>
          </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { paddingHorizontal: spacing(2), paddingTop: spacing(2), paddingBottom: spacing(4) },
  eyebrow: { color: colors.accentStrong, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  title: { marginTop: 5, fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  subtitle: { marginTop: 4, fontSize: 13, color: colors.textSecondary },
  blockCard: {
    marginTop: spacing(2),
    backgroundColor: colors.card,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing(1.5),
  },
  blockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  blockTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
  addButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(0.75),
  },
  addButtonText: { fontSize: 12, fontWeight: '700', color: colors.textPrimary },
  emptyText: { marginTop: spacing(1), fontSize: 13, color: colors.textSecondary },
  footList: {
    marginTop: spacing(1),
  },
  footItem: {
    marginBottom: spacing(1),
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.medium,
    padding: spacing(1),
  },
  footImage: { width: 64, height: 64, borderRadius: 12, marginRight: spacing(1) },
  footText: { flex: 1 },
  footLocation: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  footDate: { marginTop: 2, fontSize: 12, color: colors.textSecondary },
  footNote: { marginTop: 4, fontSize: 13, color: colors.textPrimary },
  input: {
    marginTop: spacing(1),
    minHeight: 110,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.medium,
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(1),
    textAlignVertical: 'top',
    color: colors.textPrimary,
  },
  saveButton: {
    marginTop: spacing(1),
    backgroundColor: colors.accent,
    borderRadius: radius.medium,
    alignItems: 'center',
    paddingVertical: spacing(1),
  },
  saveButtonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  draftItem: {
    marginTop: spacing(1),
    backgroundColor: colors.surface,
    borderRadius: radius.medium,
    padding: spacing(1),
  },
  draftTime: { fontSize: 11, color: colors.textSecondary },
  draftContent: { marginTop: 4, fontSize: 13, color: colors.textPrimary },
  copyButton: { marginTop: 6, alignSelf: 'flex-end' },
  copyText: { fontSize: 12, fontWeight: '700', color: colors.textPrimary },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  modalKeyboard: { width: '100%', maxHeight: '92%' },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '100%',
  },
  modalCardContent: {
    paddingHorizontal: spacing(2),
    paddingTop: spacing(2),
    paddingBottom: spacing(3),
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  modalTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalCancel: { paddingHorizontal: spacing(1), paddingVertical: spacing(0.5) },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  photoButton: {
    marginTop: spacing(1),
    backgroundColor: colors.accentSoft,
    borderRadius: radius.medium,
    alignItems: 'center',
    paddingVertical: spacing(1),
  },
  photoButtonText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  modalInput: {
    marginTop: spacing(1),
    minHeight: 56,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.medium,
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(1),
    color: colors.textPrimary,
  },
  modalNote: { minHeight: 120, textAlignVertical: 'top' },
  closeButton: { marginTop: spacing(1), alignItems: 'center', paddingVertical: spacing(0.5) },
  closeButtonText: { color: colors.textSecondary, fontSize: 13 },
});

export default FootprintInspirationScreen;
