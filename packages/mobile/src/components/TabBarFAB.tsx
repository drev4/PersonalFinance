/**
 * TabBarFAB — floating action button that sits above the tab bar.
 * Renders at the root level via a portal-like absolute position so it
 * remains visible from any tab.
 *
 * Implements:
 * - Spring scale animation on press (react-native-reanimated)
 * - Haptic feedback (expo-haptics)
 * - Accessible label and role
 */

import * as Haptics from 'expo-haptics';
import React, { useCallback } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Constants ────────────────────────────────────────────────────────────────

const FAB_SIZE = 56;
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 83 : 60;

// ─── Component ────────────────────────────────────────────────────────────────

interface TabBarFABProps {
  onPress?: () => void;
}

export function TabBarFAB({ onPress }: TabBarFABProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(async () => {
    // Scale down then back up
    scale.value = withSpring(0.88, { damping: 10, stiffness: 300 });
    await Haptics.selectionAsync();
    scale.value = withSpring(1, { damping: 12, stiffness: 300 });
    onPress?.();
  }, [scale, onPress]);

  const tap = Gesture.Tap()
    .runOnJS(true)
    .onEnd(() => {
      void handlePress();
    });

  const bottomPosition = TAB_BAR_HEIGHT + insets.bottom - FAB_SIZE / 2;

  return (
    <View
      style={[styles.container, { bottom: bottomPosition }]}
      pointerEvents="box-none"
    >
      <GestureDetector gesture={tap}>
        <Animated.View
          style={[styles.fab, animatedStyle]}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Agregar transacción rápida"
          accessibilityHint="Abre el formulario de transacción rápida"
        >
          {/* Plus icon */}
          <View style={styles.plusHorizontal} />
          <View style={styles.plusVertical} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
    elevation: 8,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: '#0ea5e9', // sky-500
    alignItems: 'center',
    justifyContent: 'center',
    // iOS shadow
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    // Android shadow
    elevation: 8,
  },
  plusHorizontal: {
    position: 'absolute',
    width: 24,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: '#ffffff',
  },
  plusVertical: {
    position: 'absolute',
    width: 2.5,
    height: 24,
    borderRadius: 2,
    backgroundColor: '#ffffff',
  },
});
