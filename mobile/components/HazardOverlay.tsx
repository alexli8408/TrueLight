/**
 * HazardOverlay Component
 *
 * Displays detected hazards as bounding boxes overlaid on the camera view.
 * Uses priority-based colors and labels for quick recognition.
 *
 * ACCESSIBILITY:
 * - High contrast borders
 * - Clear labels
 * - Priority-based coloring
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { COLORS, SIZES } from '../constants/accessibility';
import { getHazardColor, getHazardIcon, type PrioritizedHazard } from '../constants/hazardPriority';

interface Props {
  hazards: PrioritizedHazard[];
  cameraWidth: number;
  cameraHeight: number;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function HazardOverlay({ hazards, cameraWidth, cameraHeight }: Props) {
  if (hazards.length === 0) return null;

  // Calculate scale factors from normalized coords to screen coords
  const scaleX = cameraWidth || SCREEN_WIDTH;
  const scaleY = cameraHeight || SCREEN_HEIGHT;

  return (
    <View style={styles.container} pointerEvents="none">
      {hazards.map((hazard, index) => {
        const { bbox, type, colorState } = hazard;
        const color = getHazardColor(hazard.rule.priority);
        const icon = getHazardIcon(type, colorState);

        // Convert normalized coordinates (0-1) to screen coordinates
        const left = bbox.x * scaleX;
        const top = bbox.y * scaleY;
        const width = bbox.width * scaleX;
        const height = bbox.height * scaleY;

        return (
          <View
            key={hazard.id || `hazard-${index}`}
            style={[
              styles.bbox,
              {
                left,
                top,
                width,
                height,
                borderColor: color,
              },
            ]}
          >
            <View style={[styles.label, { backgroundColor: color }]}>
              <Text style={styles.labelText}>
                {icon} {type.replace('_', ' ')}
              </Text>
            </View>

            {/* Confidence indicator */}
            <View style={styles.confidenceContainer}>
              <View
                style={[
                  styles.confidenceBar,
                  {
                    width: `${Math.round(hazard.confidence * 100)}%`,
                    backgroundColor: color,
                  },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  bbox: {
    position: 'absolute',
    borderWidth: 3,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  label: {
    position: 'absolute',
    top: -24,
    left: -3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  labelText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  confidenceContainer: {
    position: 'absolute',
    bottom: -8,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  confidenceBar: {
    height: '100%',
    borderRadius: 2,
  },
});
