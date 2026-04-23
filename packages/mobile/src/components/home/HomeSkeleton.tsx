/**
 * HomeSkeleton — shimmer skeleton that mirrors the Home layout.
 *
 * Uses react-native-reanimated (already installed) for a looping
 * opacity shimmer effect. No third-party skeleton library required.
 */

import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

// ─── Shimmer block ────────────────────────────────────────────────────────────

interface ShimmerBlockProps {
  className?: string;
  width?: number | `${number}%`;
  height?: number;
  rounded?: boolean;
}

function ShimmerBlock({
  className = '',
  height = 16,
  rounded = false,
}: ShimmerBlockProps): React.JSX.Element {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.8, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        animStyle,
        {
          height,
          backgroundColor: '#334155',
          borderRadius: rounded ? 999 : 8,
        },
      ]}
      className={className}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

// ─── Skeleton layout ──────────────────────────────────────────────────────────

export function HomeSkeleton(): React.JSX.Element {
  return (
    <View
      accessible
      accessibilityLabel="Cargando panel financiero"
      accessibilityRole="progressbar"
    >
      {/* Header */}
      <View className="flex-row items-center px-4 pt-4 pb-2">
        <ShimmerBlock height={40} rounded className="w-10 mr-3" />
        <ShimmerBlock height={18} className="flex-1 mr-12" />
      </View>

      {/* Net worth */}
      <View className="px-4 mt-2">
        <ShimmerBlock height={44} className="w-3/4 mb-2" />
        <ShimmerBlock height={14} className="w-1/2" />
      </View>

      {/* Sparkline */}
      <View className="mx-4 mt-4">
        <ShimmerBlock height={80} />
      </View>

      {/* Accounts carousel */}
      <View className="mt-4 px-4">
        <ShimmerBlock height={12} className="w-16 mb-3" />
        <View className="flex-row gap-x-3">
          <ShimmerBlock height={100} className="flex-1" />
          <ShimmerBlock height={100} className="flex-1" />
          <ShimmerBlock height={100} className="w-20" />
        </View>
      </View>

      {/* Spending bar */}
      <View className="mx-4 mt-6">
        <View className="flex-row justify-between mb-2">
          <ShimmerBlock height={12} className="w-24" />
          <ShimmerBlock height={12} className="w-28" />
        </View>
        <ShimmerBlock height={8} rounded />
      </View>

      {/* Transactions */}
      <View className="mt-6 px-4">
        <ShimmerBlock height={12} className="w-32 mb-4" />
        {[1, 2, 3, 4, 5].map((i) => (
          <View key={i} className="flex-row items-center mb-4">
            <ShimmerBlock height={36} rounded className="w-9 mr-3" />
            <View className="flex-1">
              <ShimmerBlock height={14} className="w-3/4 mb-1" />
              <ShimmerBlock height={11} className="w-1/3" />
            </View>
            <ShimmerBlock height={14} className="w-16" />
          </View>
        ))}
      </View>
    </View>
  );
}
