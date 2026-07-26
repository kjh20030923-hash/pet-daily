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
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppState } from '../store';
import { colors, radius, spacing } from '../theme';
import { PetProfile } from '../types';
import { calculatePetAge } from '../utils/petAge';

const kinds: Array<{ value: PetProfile['kind']; label: string }> = [
  { value: 'dog', label: '小狗' },
  { value: 'cat', label: '小猫' },
  { value: 'other', label: '其他' },
];

const PetAvatar: React.FC<{ pet: Pick<PetProfile, 'kind' | 'customImageURL'> }> = ({ pet }) => (
  <View style={styles.avatarFrame}>
    <View style={styles.avatarClip}>
      {pet.customImageURL ? (
        <Image source={{ uri: pet.customImageURL }} resizeMode="cover" style={styles.avatarImage} />
      ) : (
        <View style={styles.defaultAvatar}>
          <PetTypeMark kind={pet.kind} />
        </View>
      )}
    </View>
  </View>
);

const PetTypeMark: React.FC<{ kind: PetProfile['kind'] }> = ({ kind }) => {
  if (kind === 'dog') {
    return (
      <View style={styles.iconCanvas}>
        <View style={[styles.dogEar, styles.dogEarLeft]} />
        <View style={[styles.dogEar, styles.dogEarRight]} />
        <View style={styles.dogHead}>
          <View style={[styles.iconEye, styles.leftEye]} />
          <View style={[styles.iconEye, styles.rightEye]} />
          <View style={styles.dogNose} />
          <View style={styles.mouthLine} />
        </View>
      </View>
    );
  }
  if (kind === 'cat') {
    return (
      <View style={styles.iconCanvas}>
        <View style={[styles.catEar, styles.catEarLeft]} />
        <View style={[styles.catEar, styles.catEarRight]} />
        <View style={styles.catHead}>
          <View style={[styles.iconEye, styles.leftEye]} />
          <View style={[styles.iconEye, styles.rightEye]} />
          <View style={styles.catNose} />
          <View style={[styles.whisker, styles.whiskerLeft]} />
          <View style={[styles.whisker, styles.whiskerRight]} />
        </View>
      </View>
    );
  }
  return (
    <View style={styles.pawCanvas}>
      <View style={styles.pawPad} />
      <View style={[styles.pawToe, styles.pawToeOne]} />
      <View style={[styles.pawToe, styles.pawToeTwo]} />
      <View style={[styles.pawToe, styles.pawToeThree]} />
    </View>
  );
};

const ChevronDown = () => (
  <View style={styles.chevron}>
    <View style={[styles.chevronLine, styles.chevronLeft]} />
    <View style={[styles.chevronLine, styles.chevronRight]} />
  </View>
);

const PencilIcon = () => (
  <View style={styles.pencilCanvas}>
    <View style={styles.pencilBody} />
    <View style={styles.pencilTip} />
  </View>
);

type FormMode = 'list' | 'add' | 'edit';

export const PetSwitcher: React.FC<{ onEditProfile?: () => void }> = ({ onEditProfile }) => {
  const { pets, currentPet, selectPet, addPet, updateCurrentPet } = useAppState();
  const [visible, setVisible] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('list');
  const [name, setName] = useState('');
  const [kind, setKind] = useState<PetProfile['kind']>('dog');
  const [seizureEnabled, setSeizureEnabled] = useState(false);
  const [customImageURL, setCustomImageURL] = useState<string | undefined>();
  const [birthday, setBirthday] = useState(new Date());

  const reset = () => {
    setFormMode('list');
    setName('');
    setKind('dog');
    setSeizureEnabled(false);
    setCustomImageURL(undefined);
    setBirthday(new Date());
  };

  const close = () => {
    setVisible(false);
    reset();
  };

  const openEditor = () => {
    setName(currentPet.name);
    setKind(currentPet.kind);
    setSeizureEnabled(currentPet.seizure_enabled);
    setCustomImageURL(currentPet.customImageURL);
    setBirthday(currentPet.birthday ? new Date(currentPet.birthday) : new Date());
    setFormMode('edit');
    setVisible(true);
  };

  const handleEditProfile = () => {
    if (onEditProfile) {
      onEditProfile();
      return;
    }
    openEditor();
  };

  const submit = () => {
    if (!name.trim()) {
      Alert.alert('请输入宠物名字');
      return;
    }
    const profile = { name: name.trim(), kind, seizure_enabled: seizureEnabled, customImageURL, birthday: birthday.toISOString() };
    if (formMode === 'edit') {
      updateCurrentPet({
        ...profile,
        hasEpilepsy: seizureEnabled,
        enabledHealthWidgets: seizureEnabled ? ['seizure-tracker'] : [],
      });
    }
    else addPet(profile);
    close();
  };

  const pickPetImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('无法访问照片', '请在手机设置中允许照片权限后再试。');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled) setCustomImageURL(result.assets[0]?.uri);
  };

  return (
    <>
      <View style={styles.microCard}>
        <PetAvatar pet={currentPet} />
        <View style={styles.middleSection}>
          <TouchableOpacity style={styles.nameTrigger} onPress={() => { setFormMode('list'); setVisible(true); }} activeOpacity={0.68} hitSlop={6}>
            <Text style={styles.triggerName} numberOfLines={1}>{currentPet.name}</Text>
            <ChevronDown />
          </TouchableOpacity>
          <Text style={styles.ageText}>{currentPet.birthday ? calculatePetAge(currentPet.birthday) : '添加生日'}</Text>
        </View>
        <TouchableOpacity style={styles.editButton} onPress={handleEditProfile} activeOpacity={0.7} hitSlop={8} accessibilityLabel="编辑宠物资料">
          <PencilIcon />
        </TouchableOpacity>
      </View>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
          <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
              <View style={styles.header}>
                <View>
                  <Text style={styles.title}>{formMode === 'add' ? '添加宠物' : formMode === 'edit' ? '编辑宠物资料' : '切换宠物'}</Text>
                  <Text style={styles.hint}>{formMode === 'list' ? '每只宠物的数据都会单独保存' : '头像、生日和健康信息都可以随时更新'}</Text>
                </View>
                <Pressable onPress={formMode === 'add' ? reset : close} hitSlop={12}><Text style={styles.cancel}>{formMode === 'add' ? '返回' : '关闭'}</Text></Pressable>
              </View>

              {formMode !== 'list' ? (
                <>
                  <TouchableOpacity style={styles.photoPicker} onPress={pickPetImage} activeOpacity={0.72}>
                    <PetAvatar pet={{ ...currentPet, kind, customImageURL }} />
                    <View style={styles.photoPickerText}>
                      <Text style={styles.photoPickerTitle}>{customImageURL ? '已选择照片' : '添加宠物照片'}</Text>
                      <Text style={styles.photoPickerHint}>点击选择正方形照片，可稍后更换</Text>
                    </View>
                  </TouchableOpacity>
                  <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="宠物名字" placeholderTextColor={colors.textSecondary} autoFocus />
                  <View style={styles.kindRow}>
                    {kinds.map((item) => (
                      <Pressable key={item.value} style={[styles.kind, kind === item.value && styles.kindActive]} onPress={() => setKind(item.value)}>
                        <Text style={styles.kindText}>{item.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.birthdayRow}>
                    <View>
                      <Text style={styles.birthdayTitle}>出生日期</Text>
                      <Text style={styles.birthdayHint}>将显示为 {calculatePetAge(birthday)}</Text>
                    </View>
                    <DateTimePicker value={birthday} mode="date" maximumDate={new Date()} display={Platform.OS === 'ios' ? 'compact' : 'default'} onChange={(_, value) => value && setBirthday(value)} />
                  </View>
                  <View style={styles.settingRow}>
                    <View style={styles.settingText}>
                      <Text style={styles.settingTitle}>启用癫痫发作管理</Text>
                      <Text style={styles.settingHint}>之后也可以在健康中心修改</Text>
                    </View>
                    <Switch value={seizureEnabled} onValueChange={setSeizureEnabled} trackColor={{ false: colors.borderSoft, true: colors.accent }} thumbColor={colors.card} />
                  </View>
                  <Pressable style={styles.primary} onPress={submit}><Text style={styles.primaryText}>{formMode === 'edit' ? '保存修改' : '保存宠物'}</Text></Pressable>
                </>
              ) : (
                <>
                  <View style={styles.petList}>
                    {pets.map((pet) => {
                      const active = pet.id === currentPet.id;
                      return (
                        <Pressable key={pet.id} style={styles.petRow} onPress={() => { selectPet(pet.id); close(); }}>
                          <PetAvatar pet={pet} />
                          <View style={styles.petText}>
                            <Text style={styles.petName}>{pet.name}</Text>
                            <Text style={styles.petKind}>{pet.kind === 'dog' ? '小狗' : pet.kind === 'cat' ? '小猫' : '其他宠物'} · {pet.birthday ? calculatePetAge(pet.birthday) : '未填写生日'}</Text>
                          </View>
                          {active ? <Text style={styles.selected}>已选择</Text> : null}
                        </Pressable>
                      );
                    })}
                  </View>
                  <Pressable style={styles.addButton} onPress={() => { reset(); setFormMode('add'); }}><Text style={styles.addText}>＋ 添加宠物</Text></Pressable>
                </>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  microCard: { flex: 1, minWidth: 0, minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  middleSection: { flex: 1, minWidth: 0, marginLeft: 12, flexDirection: 'column', justifyContent: 'center' },
  nameTrigger: { alignSelf: 'flex-start', maxWidth: '100%', minHeight: 25, flexDirection: 'row', alignItems: 'center' },
  triggerName: { flexShrink: 1, color: colors.textPrimary, fontSize: 18, fontWeight: '600' },
  ageText: { marginTop: 2, color: colors.textSecondary, fontSize: 12, fontWeight: '400' },
  chevron: { width: 16, height: 16, marginLeft: 4, alignItems: 'center', justifyContent: 'center' },
  chevronLine: { position: 'absolute', top: 7, width: 7, height: 1.5, borderRadius: 1, backgroundColor: colors.textSecondary },
  chevronLeft: { left: 2, transform: [{ rotate: '40deg' }] },
  chevronRight: { right: 2, transform: [{ rotate: '-40deg' }] },
  editButton: { width: 36, height: 36, marginLeft: spacing(1), borderRadius: 18, borderWidth: 0.5, borderColor: colors.borderSoft, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  pencilCanvas: { width: 18, height: 18, position: 'relative', transform: [{ rotate: '-42deg' }] },
  pencilBody: { position: 'absolute', left: 7, top: 2, width: 4, height: 12, borderRadius: 2, borderWidth: 1.5, borderColor: colors.accentStrong },
  pencilTip: { position: 'absolute', left: 7.5, top: 13, width: 3, height: 3, borderLeftWidth: 1.5, borderBottomWidth: 1.5, borderColor: colors.accentStrong, transform: [{ rotate: '-45deg' }] },
  avatarFrame: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
    borderWidth: 0.5,
    borderColor: colors.borderSoft,
  },
  avatarClip: { flex: 1, overflow: 'hidden', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  avatarImage: { width: '100%', height: '100%' },
  defaultAvatar: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  iconCanvas: { width: 48, height: 48 },
  dogEar: { position: 'absolute', top: 9, width: 10, height: 18, borderRadius: 6, backgroundColor: colors.textPrimary },
  dogEarLeft: { left: 7, transform: [{ rotate: '12deg' }] },
  dogEarRight: { right: 7, transform: [{ rotate: '-12deg' }] },
  dogHead: { position: 'absolute', left: 10, top: 10, width: 28, height: 29, borderRadius: 14, borderWidth: 2, borderColor: colors.textPrimary, backgroundColor: colors.accentSoft },
  iconEye: { position: 'absolute', top: 9, width: 3, height: 3, borderRadius: 2, backgroundColor: colors.textPrimary },
  leftEye: { left: 6 },
  rightEye: { right: 6 },
  dogNose: { position: 'absolute', top: 15, left: 11, width: 4, height: 3, borderRadius: 2, backgroundColor: colors.textPrimary },
  mouthLine: { position: 'absolute', top: 19, left: 9, width: 8, height: 4, borderBottomWidth: 1.5, borderBottomColor: colors.textPrimary, borderRadius: 4 },
  catEar: { position: 'absolute', top: 6, width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderBottomWidth: 13, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: colors.textPrimary },
  catEarLeft: { left: 8, transform: [{ rotate: '-12deg' }] },
  catEarRight: { right: 8, transform: [{ rotate: '12deg' }] },
  catHead: { position: 'absolute', left: 9, top: 12, width: 30, height: 27, borderRadius: 14, borderWidth: 2, borderColor: colors.textPrimary, backgroundColor: colors.accentSoft },
  catNose: { position: 'absolute', top: 15, left: 12, width: 4, height: 3, transform: [{ rotate: '45deg' }], backgroundColor: colors.textPrimary },
  whisker: { position: 'absolute', top: 19, width: 9, height: 1, backgroundColor: colors.textPrimary },
  whiskerLeft: { left: -5, transform: [{ rotate: '8deg' }] },
  whiskerRight: { right: -5, transform: [{ rotate: '-8deg' }] },
  pawCanvas: { width: 34, height: 34 },
  pawPad: { position: 'absolute', left: 9, top: 14, width: 17, height: 15, borderRadius: 9, backgroundColor: colors.textPrimary },
  pawToe: { position: 'absolute', width: 7, height: 9, borderRadius: 5, backgroundColor: colors.textPrimary },
  pawToeOne: { left: 4, top: 7, transform: [{ rotate: '-18deg' }] },
  pawToeTwo: { left: 14, top: 3 },
  pawToeThree: { right: 3, top: 7, transform: [{ rotate: '18deg' }] },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(45,52,47,0.28)' },
  keyboard: { width: '100%', maxHeight: '90%' },
  sheet: { maxHeight: '100%', borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.card },
  sheetContent: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2.5), paddingBottom: spacing(5) },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: '900' },
  hint: { marginTop: 5, color: colors.textSecondary, fontSize: 12 },
  cancel: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },
  petList: { marginTop: spacing(2) },
  petRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center' },
  petText: { flex: 1, marginLeft: spacing(1.25) },
  petName: { color: colors.textPrimary, fontSize: 15, fontWeight: '800' },
  petKind: { marginTop: 3, color: colors.textSecondary, fontSize: 11 },
  selected: { color: colors.accentStrong, fontSize: 12, fontWeight: '800' },
  addButton: { marginTop: spacing(1), minHeight: 50, borderRadius: radius.medium, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  addText: { color: colors.accentStrong, fontSize: 14, fontWeight: '800' },
  photoPicker: { marginTop: spacing(2), minHeight: 70, flexDirection: 'row', alignItems: 'center', padding: spacing(1.25), borderRadius: radius.medium, backgroundColor: colors.surface },
  photoPickerText: { flex: 1, marginLeft: spacing(1.25) },
  photoPickerTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  photoPickerHint: { marginTop: 4, color: colors.textSecondary, fontSize: 11 },
  input: { marginTop: spacing(2), minHeight: 52, borderRadius: radius.medium, backgroundColor: colors.surface, paddingHorizontal: spacing(1.5), color: colors.textPrimary, fontSize: 16 },
  kindRow: { marginTop: spacing(1), flexDirection: 'row', gap: spacing(0.75) },
  kind: { flex: 1, minHeight: 44, borderRadius: radius.medium, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  kindActive: { backgroundColor: colors.blueSoft },
  kindText: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  birthdayRow: { minHeight: 62, marginTop: spacing(1.25), paddingHorizontal: spacing(1.5), borderRadius: radius.medium, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  birthdayTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '800' },
  birthdayHint: { marginTop: 4, color: colors.textSecondary, fontSize: 10 },
  settingRow: { marginTop: spacing(2), padding: spacing(1.5), borderRadius: radius.medium, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center' },
  settingText: { flex: 1, paddingRight: spacing(1) },
  settingTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  settingHint: { marginTop: 4, color: colors.textSecondary, fontSize: 11 },
  primary: { marginTop: spacing(2), minHeight: 52, borderRadius: radius.medium, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentStrong },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});

export default PetSwitcher;
