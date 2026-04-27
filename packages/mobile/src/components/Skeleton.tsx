import { View, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  marginBottom?: number;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 4, marginBottom = 8 }: SkeletonProps) {
  const fadeAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
      ]),
    ).start();
  }, [fadeAnim]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: typeof width === 'number' ? width : width,
          height,
          borderRadius,
          marginBottom,
          opacity: fadeAnim,
        } as any,
      ]}
    />
  );
}

export function SkeletonGroup() {
  return (
    <View>
      <Skeleton width="40%" height={20} marginBottom={16} />
      <Skeleton height={80} marginBottom={16} />
      <Skeleton height={50} marginBottom={16} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#e0e0e0',
  },
});
