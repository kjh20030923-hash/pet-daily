import React, { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, radius, shadow, spacing } from '../theme';
import { FootprintRecord } from '../types';
import { useAppState } from '../store';
import { formatZhDate } from '../utils/date';

export const FootprintsScreen: React.FC = () => {
  const { footprints, addFootprint } = useAppState();
  const [modalVisible, setModalVisible] = useState(false);
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);
  const [date, setDate] = useState(new Date());

  const openModal = () => {
    setLocation('');
    setNote('');
    setImageUri(undefined);
    setDate(new Date());
    setModalVisible(true);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0]?.uri);
    }
  };

  const confirm = () => {
    if (!location.trim() && !note.trim()) return;
    const record: FootprintRecord = {
      id: `${Date.now()}`,
      imageUri,
      location: location.trim() || '未命名地点',
      date: date.toISOString(),
      note: note.trim(),
    };
    addFootprint(record);
    setModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>七七足迹</Text>
        <Text style={styles.subtitle}>把和七七的每一次出行，变成一张旅行卡片</Text>

        <Pressable style={styles.addButton} onPress={openModal}>
          <Text style={styles.addButtonText}>➕ 记录新足迹</Text>
        </Pressable>

        <ScrollView
          style={styles.list}
          contentContainerStyle={
            footprints.length === 0 ? styles.emptyContainer : styles.cardsContainer
          }
        >
          {footprints.length === 0 ? (
            <Text style={styles.emptyText}>还没有足迹，周末带七七去最想去的地方吧～</Text>
          ) : (
            footprints.map((f) => (
              <View key={f.id} style={styles.card}>
                <View style={styles.imageWrapper}>
                  {f.imageUri ? (
                    <Image source={{ uri: f.imageUri }} style={styles.image} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Text style={styles.imagePlaceholderEmoji}>📸</Text>
                      <Text style={styles.imagePlaceholderText}>和七七的合照</Text>
                    </View>
                  )}
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.location}>{f.location}</Text>
                  <Text style={styles.date}>{formatZhDate(f.date)}</Text>
                  {f.note ? <Text style={styles.note}>{f.note}</Text> : null}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setModalVisible(false)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>记录新足迹</Text>
            <Text style={styles.sheetHint}>上传一张合照，记下时间和地点</Text>

            <Pressable style={styles.photoPicker} onPress={pickImage}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.photoPreview} />
              ) : (
                <>
                  <Text style={styles.photoEmoji}>📷</Text>
                  <Text style={styles.photoText}>从相册选择照片</Text>
                </>
              )}
            </Pressable>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>地理位置</Text>
              <TextInput
                placeholder="例如：上海滨江宠物公园"
                placeholderTextColor={colors.textSecondary}
                style={styles.input}
                value={location}
                onChangeText={setLocation}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>日期</Text>
              <DateTimePicker
                value={date}
                mode="date"
                display="spinner"
                onChange={(_, d) => d && setDate(d)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>旅行日记</Text>
              <TextInput
                placeholder="和七七发生了什么好玩的事？"
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, styles.multilineInput]}
                value={note}
                onChangeText={setNote}
                multiline
              />
            </View>

            <Pressable style={styles.confirmButton} onPress={confirm}>
              <Text style={styles.confirmText}>保存足迹</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing(2),
    paddingTop: spacing(2),
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: spacing(0.5),
    fontSize: 13,
    color: colors.textSecondary,
  },
  addButton: {
    marginTop: spacing(3),
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: spacing(1.5),
    alignItems: 'center',
    ...shadow.jelly,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  list: {
    marginTop: spacing(2),
    flex: 1,
  },
  cardsContainer: {
    paddingBottom: spacing(4),
  },
  emptyContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(3),
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.large,
    marginBottom: spacing(2),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadow.soft,
  },
  imageWrapper: {
    height: 200,
    backgroundColor: colors.accentSoft,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderEmoji: {
    fontSize: 32,
  },
  imagePlaceholderText: {
    marginTop: spacing(0.5),
    fontSize: 14,
    color: colors.textSecondary,
  },
  cardBody: {
    padding: spacing(2),
  },
  location: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  date: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textSecondary,
  },
  note: {
    marginTop: spacing(1),
    fontSize: 14,
    color: colors.textPrimary,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing(2),
    paddingTop: spacing(1),
    paddingBottom: spacing(3),
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 52,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.borderSoft,
    marginBottom: spacing(1),
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sheetHint: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textSecondary,
  },
  photoPicker: {
    marginTop: spacing(2),
    borderRadius: radius.large,
    backgroundColor: colors.accentSoft,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEmoji: {
    fontSize: 26,
  },
  photoText: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    borderRadius: radius.large,
  },
  inputGroup: {
    marginTop: spacing(2),
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: radius.medium,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
    fontSize: 14,
    color: colors.textPrimary,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  confirmButton: {
    marginTop: spacing(3),
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: spacing(1.5),
    alignItems: 'center',
    ...shadow.jelly,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});

export default FootprintsScreen;

