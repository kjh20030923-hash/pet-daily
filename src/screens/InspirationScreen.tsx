import React, { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { colors, radius, shadow, spacing } from '../theme';
import { DraftRecord } from '../types';
import { useAppState } from '../store';
import { formatZhDateTime } from '../utils/date';

export const InspirationScreen: React.FC = () => {
  const { drafts, addDraft } = useAppState();
  const [text, setText] = useState('');

  const add = () => {
    if (!text.trim()) return;
    const record: DraftRecord = {
      id: `${Date.now()}`,
      content: text.trim(),
      time: new Date().toISOString(),
    };
    addDraft(record);
    setText('');
  };

  const copy = async (content: string) => {
    await Clipboard.setStringAsync(content);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>灵感库</Text>
        <Text style={styles.subtitle}>把小红书想发的内容，先安心存进草稿箱</Text>

        <View style={styles.editorCard}>
          <TextInput
            style={styles.input}
            placeholder="随手记下今天想发的小红书文案..."
            placeholderTextColor={colors.textSecondary}
            value={text}
            onChangeText={setText}
            multiline
          />
          <Pressable style={styles.saveButton} onPress={add}>
            <Text style={styles.saveText}>保存草稿</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={
            drafts.length === 0 ? styles.emptyContainer : styles.draftsContainer
          }
        >
          {drafts.length === 0 ? (
            <Text style={styles.emptyText}>把脑海里的灵感都先写下来，小红书随时可发～</Text>
          ) : (
            drafts.map((d) => (
              <View key={d.id} style={styles.draftCard}>
                <View style={styles.draftHeader}>
                  <Text style={styles.draftTime}>{formatZhDateTime(d.time)}</Text>
                </View>
                <Text style={styles.draftContent}>{d.content}</Text>
                <View style={styles.draftActions}>
                  <Pressable
                    style={styles.copyButton}
                    onPress={() => copy(d.content)}
                  >
                    <Text style={styles.copyIcon}>📋</Text>
                    <Text style={styles.copyText}>一键复制</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
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
  editorCard: {
    marginTop: spacing(3),
    backgroundColor: colors.card,
    borderRadius: radius.large,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadow.soft,
  },
  input: {
    minHeight: 90,
    fontSize: 14,
    color: colors.textPrimary,
    textAlignVertical: 'top',
  },
  saveButton: {
    marginTop: spacing(1.5),
    alignSelf: 'flex-end',
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.75),
    ...shadow.jelly,
  },
  saveText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  list: {
    marginTop: spacing(2),
    flex: 1,
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
  draftsContainer: {
    paddingBottom: spacing(4),
  },
  draftCard: {
    backgroundColor: colors.card,
    borderRadius: radius.medium,
    padding: spacing(1.5),
    marginBottom: spacing(1.5),
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadow.soft,
  },
  draftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing(0.5),
  },
  draftTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  draftContent: {
    fontSize: 14,
    color: colors.textPrimary,
    marginTop: 2,
  },
  draftActions: {
    marginTop: spacing(1),
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
  },
  copyIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  copyText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});

export default InspirationScreen;

