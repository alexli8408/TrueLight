/**
 * SpeedIndicator Component
 *
 * Displays current speed and transit mode with visual indicator.
 * Adapts colors based on mode for quick recognition.
 *
 * ACCESSIBILITY:
 * - High contrast colors
 * - Clear text labels
 * - Color + text redundancy
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TransitMode } from '../services/LocationService';
import { COLORS, SIZES } from '../constants/accessibility';

interface Props {
  mode: TransitMode;
  speed: number;  // mph
  compact?: boolean;
}

export function SpeedIndicator({ mode, speed, compact = false }: Props) {
  const getModeColor = (): string => {
    const colors = {
      stationary: COLORS.textSecondary,
      walking: COLORS.green,
      biking: COLORS.yellow,
      driving: COLORS.red,
    };
    return colors[mode] || COLORS.textSecondary;
  };

  const getModeIcon = (): string => {
    const icons = {
      stationary: '⏸',
      walking: '🚶',
      biking: '🚴',
      driving: '🚗',
    };
    return icons[mode] || '•';
  };

  const getModeLabel = (): string => {
    const labels = {
      stationary: 'Stationary',
      walking: 'Walking',
      biking: 'Biking',
      driving: 'Driving',
    };
    return labels[mode] || 'Unknown';
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={[styles.dot, { backgroundColor: getModeColor() }]} />
        <Text style={styles.compactSpeed}>{speed.toFixed(0)}</Text>
        <Text style={styles.compactUnit}>mph</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: getModeColor() + '30' }]}>
        <Text style={styles.icon}>{getModeIcon()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.mode, { color: getModeColor() }]}>
          {getModeLabel().toUpperCase()}
        </Text>
        <Text style={styles.speed}>
          {speed.toFixed(1)} <Text style={styles.unit}>mph</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: SIZES.spacingSmall,
    paddingHorizontal: SIZES.spacingMedium,
    borderRadius: SIZES.borderRadius,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.spacingSmall,
  },
  icon: {
    fontSize: 20,
  },
  info: {
    justifyContent: 'center',
  },
  mode: {
    fontSize: SIZES.textSmall - 2,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  speed: {
    fontSize: SIZES.textMedium,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  unit: {
    fontSize: SIZES.textSmall,
    color: COLORS.textSecondary,
    fontWeight: 'normal',
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  compactSpeed: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  compactUnit: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
});
