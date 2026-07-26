import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';

export type AppIconName =
  | 'home'
  | 'expense'
  | 'health'
  | 'profile'
  | 'calendar'
  | 'bath'
  | 'walk'
  | 'feed'
  | 'litter'
  | 'deworm'
  | 'diary'
  | 'weight'
  | 'hospital';

const glyphs: Record<AppIconName, string> = {
  home: '⌂',
  expense: '¥',
  health: '+',
  profile: '○',
  calendar: '▦',
  bath: '水',
  walk: '行',
  feed: '食',
  litter: '砂',
  deworm: '护',
  diary: '记',
  weight: 'kg',
  hospital: '+',
};

export const AppIcon: React.FC<{
  name: AppIconName;
  active?: boolean;
  size?: 'small' | 'medium' | 'large';
  tint?: string;
}> = ({ name, active = false, size = 'medium', tint }) => (
  <View style={[styles.base, styles[size], active && styles.active]}>
    <Text style={[styles.glyph, styles[`${size}Text`], { color: tint ?? (active ? colors.accentStrong : colors.textSecondary) }]}>
      {glyphs[name]}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.medium },
  active: { backgroundColor: colors.accentSoft },
  small: { width: 32, height: 32 },
  medium: { width: 38, height: 38 },
  large: { width: 48, height: 48 },
  glyph: { fontWeight: '800', textAlign: 'center' },
  smallText: { fontSize: 15 },
  mediumText: { fontSize: 18 },
  largeText: { fontSize: 18 },
});
