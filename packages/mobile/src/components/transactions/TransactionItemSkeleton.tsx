/**
 * TransactionItemSkeleton — loading placeholder for a transaction row.
 *
 * Uses animated opacity pulse to indicate loading state.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

// ─── Single skeleton row ──────────────────────────────────────────────────────

function SkeletonRow(): React.JSX.Element {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[styles.row, { opacity }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* Icon placeholder */}
      <View style={styles.iconPlaceholder} />

      {/* Text lines */}
      <View style={styles.textBlock}>
        <View style={[styles.line, styles.titleLine]} />
        <View style={[styles.line, styles.subtitleLine]} />
      </View>

      {/* Amount placeholder */}
      <View style={styles.amountBlock}>
        <View style={[styles.line, styles.amountLine]} />
        <View style={[styles.line, styles.dateLine]} />
      </View>
    </Animated.View>
  );
}

// ─── Multiple skeletons ───────────────────────────────────────────────────────

interface TransactionItemSkeletonProps {
  count?: number;
}

export function TransactionItemSkeleton({
  count = 5,
}: TransactionItemSkeletonProps): React.JSX.Element {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 60,
  },
  iconPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    marginRight: 12,
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    marginRight: 12,
    gap: 6,
  },
  amountBlock: {
    alignItems: 'flex-end',
    gap: 6,
  },
  line: {
    borderRadius: 4,
    backgroundColor: '#1e293b',
  },
  titleLine: {
    width: '70%',
    height: 13,
  },
  subtitleLine: {
    width: '45%',
    height: 11,
  },
  amountLine: {
    width: 64,
    height: 13,
  },
  dateLine: {
    width: 40,
    height: 11,
  },
});
