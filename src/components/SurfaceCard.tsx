import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius, shadow, spacing } from '../theme';

export const SurfaceCard: React.FC<React.PropsWithChildren<{ style?: StyleProp<ViewStyle> }>> = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

const styles = StyleSheet.create({
  card: {
    padding: spacing(2),
    borderRadius: radius.large,
    borderWidth: 0.5,
    borderColor: colors.borderSoft,
    backgroundColor: colors.card,
    ...shadow.soft,
  },
});
