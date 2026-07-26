import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../backend/AuthContext';
import { PetSwitcher } from '../components/PetSwitcher';
import { SurfaceCard } from '../components/SurfaceCard';
import { useAppState } from '../store';
import { colors, radius, spacing } from '../theme';

export const ProfileScreen: React.FC = () => {
  const { user, initializing, openAuth, signOut } = useAuth();
  const { pets, currentPet, exportBackupJson } = useAppState();

  const copyBackup = async () => {
    await Clipboard.setStringAsync(exportBackupJson());
    Alert.alert('备份已复制', '可以粘贴到备忘录或发送到电脑保存。');
  };

  const confirmSignOut = () => {
    Alert.alert('退出登录', '本机记录仍会保留。', [
      { text: '取消', style: 'cancel' },
      { text: '退出', style: 'destructive', onPress: () => signOut().catch(() => Alert.alert('退出失败')) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>个人空间</Text>
        <Text style={styles.title}>我的</Text>

        <SurfaceCard style={styles.profileCard}>
          <View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>{user?.email?.slice(0, 1).toUpperCase() ?? '我'}</Text></View>
          <View style={styles.profileBody}>
            <Text style={styles.profileTitle}>{user ? '云端账号' : '本地使用中'}</Text>
            <Text style={styles.profileMeta}>{user?.email ?? '数据安全保存在这台手机上'}</Text>
          </View>
          <View style={[styles.statusDot, user && styles.statusDotOnline]} />
        </SurfaceCard>

        <Text style={styles.sectionTitle}>当前宠物</Text>
        <SurfaceCard>
          <PetSwitcher />
          <View style={styles.petSummary}>
            <Text style={styles.petSummaryTitle}>{currentPet.name}</Text>
            <Text style={styles.petSummaryMeta}>共管理 {pets.length} 只宠物 · {currentPet.kind === 'dog' ? '小狗' : currentPet.kind === 'cat' ? '小猫' : '其他宠物'}</Text>
          </View>
        </SurfaceCard>

        <Text style={styles.sectionTitle}>数据与账号</Text>
        <SurfaceCard style={styles.settingsCard}>
          <SettingRow title="复制数据备份" subtitle="导出全部本地记录" onPress={copyBackup} />
          {user ? (
            <SettingRow title="退出登录" subtitle="不会删除本机记录" danger onPress={confirmSignOut} />
          ) : (
            <SettingRow title={initializing ? '正在检查账号' : '登录或注册'} subtitle="启用云端同步能力" onPress={openAuth} />
          )}
        </SurfaceCard>

        <View style={styles.footer}><Text style={styles.footerTitle}>宠物日常与健康</Text><Text style={styles.footerMeta}>让每一次陪伴都有迹可循</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
};

const SettingRow: React.FC<{ title: string; subtitle: string; onPress: () => void; danger?: boolean }> = ({ title, subtitle, onPress, danger }) => (
  <Pressable style={styles.settingRow} onPress={onPress}>
    <View style={styles.settingBody}><Text style={[styles.settingTitle, danger && styles.danger]}>{title}</Text><Text style={styles.settingSubtitle}>{subtitle}</Text></View>
    <Text style={styles.chevron}>›</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  page: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2), paddingBottom: spacing(5) },
  eyebrow: { color: colors.accentStrong, fontSize: 12, fontWeight: '800', letterSpacing: 1.4 },
  title: { marginTop: 5, color: colors.textPrimary, fontSize: 29, fontWeight: '900' },
  profileCard: { marginTop: spacing(2), flexDirection: 'row', alignItems: 'center' },
  profileAvatar: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  profileAvatarText: { color: colors.accentStrong, fontSize: 20, fontWeight: '900' },
  profileBody: { flex: 1, marginLeft: spacing(1.25) },
  profileTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '900' },
  profileMeta: { marginTop: 5, color: colors.textSecondary, fontSize: 11 },
  statusDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.borderSoft },
  statusDotOnline: { backgroundColor: colors.accentStrong },
  sectionTitle: { marginTop: spacing(3), marginBottom: spacing(1), color: colors.textPrimary, fontSize: 16, fontWeight: '900' },
  petSummary: { marginTop: spacing(1.5), paddingTop: spacing(1.5), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.surface },
  petSummaryTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '800' },
  petSummaryMeta: { marginTop: 5, color: colors.textSecondary, fontSize: 11 },
  settingsCard: { paddingVertical: 0 },
  settingRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.surface },
  settingBody: { flex: 1 },
  settingTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  settingSubtitle: { marginTop: 4, color: colors.textSecondary, fontSize: 11 },
  danger: { color: colors.danger },
  chevron: { color: colors.textMuted, fontSize: 24 },
  footer: { marginTop: spacing(5), alignItems: 'center' },
  footerTitle: { color: colors.textSecondary, fontSize: 12, fontWeight: '800' },
  footerMeta: { marginTop: 5, color: colors.textMuted, fontSize: 10 },
});

export default ProfileScreen;
