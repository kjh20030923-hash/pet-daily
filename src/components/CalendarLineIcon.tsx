import React from 'react';
import { StyleSheet, View } from 'react-native';

export const CalendarLineIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 28,
  color = '#35251F',
}) => (
  <View style={[styles.frame, { width: size, height: size, borderColor: color }]}>
    <View style={[styles.divider, { backgroundColor: color }]} />
    <View style={[styles.ring, styles.ringLeft, { backgroundColor: color }]} />
    <View style={[styles.ring, styles.ringRight, { backgroundColor: color }]} />
    <View style={styles.dots}>
      {[0, 1, 2, 3].map((dot) => <View key={dot} style={[styles.dot, { backgroundColor: color }]} />)}
    </View>
  </View>
);

const styles = StyleSheet.create({
  frame: { borderWidth: 1.8, borderRadius: 7, position: 'relative' },
  divider: { position: 'absolute', left: 0, right: 0, top: '31%', height: 1.5 },
  ring: { position: 'absolute', top: -4, width: 2, height: 7, borderRadius: 1 },
  ringLeft: { left: '25%' },
  ringRight: { right: '25%' },
  dots: { position: 'absolute', left: '22%', right: '22%', top: '48%', flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  dot: { width: 3, height: 3, borderRadius: 2 },
});
