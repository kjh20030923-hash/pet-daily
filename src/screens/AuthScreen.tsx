import React, { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useAuth } from '../backend/AuthContext';
import { colors, radius, shadow, spacing } from '../theme';

export const AuthScreen: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { authMessage, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);

  const isSignIn = mode === 'signIn';

  const toFriendlyError = (message: string) => {
    const normalized = message.toLowerCase();
    if (normalized.includes('invalid login credentials')) return '邮箱或密码不正确，请检查后重试。';
    if (normalized.includes('email not confirmed')) return '请先打开确认邮件完成验证，再回来登录。';
    if (normalized.includes('user already registered')) return '这个邮箱已经注册过了，请直接登录。';
    if (normalized.includes('invalid') && normalized.includes('email')) return '邮箱格式不正确，请重新输入。';
    if (normalized.includes('password') && normalized.includes('least')) return '密码长度不符合要求，请至少输入 6 位。';
    if (normalized.includes('rate limit')) return '操作太频繁，请稍等几分钟后再试。';
    if (normalized.includes('network request failed') || normalized.includes('fetch')) return '网络连接失败，请检查网络后重试。';
    return message;
  };

  const submit = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail || password.length < 6) {
      setError('请输入邮箱，并设置至少 6 位密码。');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      if (isSignIn) {
        await signIn(normalizedEmail, password);
        onClose?.();
      } else {
        const result = await signUp(normalizedEmail, password);
        if (result === 'confirmationRequired') {
          setConfirmationEmail(normalizedEmail);
          Keyboard.dismiss();
        } else {
          onClose?.();
        }
      }
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : '操作失败，请稍后重试。';
      setError(toFriendlyError(message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboard}
        >
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.eyebrow}>康七七健康小本</Text>
              {onClose ? (
                <Pressable style={styles.closeButton} onPress={onClose} hitSlop={10}>
                  <Text style={styles.closeButtonText}>关闭</Text>
                </Pressable>
              ) : null}
            </View>
            {confirmationEmail ? (
              <>
                <Text style={styles.title}>注册成功</Text>
                <Text style={styles.subtitle}>
                  确认邮件已发送到 {confirmationEmail}。请打开邮件完成验证，然后回来登录。
                </Text>
                <Pressable
                  style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
                  onPress={() => {
                    setConfirmationEmail(null);
                    setMode('signIn');
                    setPassword('');
                  }}
                >
                  <Text style={styles.primaryButtonText}>我已确认，去登录</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.title}>{isSignIn ? '欢迎回来' : '欢迎加入'}</Text>
                <Text style={styles.subtitle}>
                  {isSignIn
                    ? '登录康七七健康小本，继续记录每一天的陪伴。'
                    : '创建账号，开始记录宠物的日常与健康。'}
                </Text>

                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="next"
                  placeholder="邮箱"
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={submit}
                  placeholder="密码（至少 6 位）"
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                />

                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                {authMessage ? <Text style={styles.messageText}>{authMessage}</Text> : null}

                <Pressable
                  style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
                  onPress={submit}
                  disabled={busy}
                >
                  {busy ? (
                    <ActivityIndicator color={colors.textPrimary} />
                  ) : (
                    <Text style={styles.primaryButtonText}>{isSignIn ? '登录' : '注册'}</Text>
                  )}
                </Pressable>

                <Pressable
                  style={styles.switchButton}
                  onPress={() => {
                    setError(null);
                    setMode(isSignIn ? 'signUp' : 'signIn');
                  }}
                >
                  <Text style={styles.switchText}>
                    {isSignIn ? '还没有账号？去注册' : '已有账号？去登录'}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  keyboard: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing(2),
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing(2),
    ...shadow.jelly,
  },
  eyebrow: {
    color: colors.accentStrong,
    fontSize: 13,
    fontWeight: '800',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing(0.5),
  },
  closeButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  title: {
    marginTop: spacing(0.75),
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: spacing(0.75),
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    marginTop: spacing(1.25),
    minHeight: 54,
    borderRadius: radius.medium,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    color: colors.textPrimary,
    fontSize: 16,
    paddingHorizontal: spacing(1.25),
  },
  errorText: {
    marginTop: spacing(1),
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  messageText: {
    marginTop: spacing(1),
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    marginTop: spacing(1.75),
    minHeight: 54,
    borderRadius: radius.medium,
    backgroundColor: colors.accentStrong,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  switchButton: {
    marginTop: spacing(1.25),
    alignItems: 'center',
    paddingVertical: spacing(0.75),
  },
  switchText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default AuthScreen;
