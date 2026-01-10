/**
 * Hazard Priority Utilities
 *
 * Defines hazard rules and prioritization logic based on colorblindness type.
 * Maps detected objects to user-specific hazards with appropriate warnings.
 *
 * FEATURES:
 * - Colorblindness-aware hazard filtering
 * - Priority-based warning text
 * - Speed-adaptive warning distances
 * - Hazard rule definitions for all supported types
 */

import { ColorblindnessType } from './accessibility';
import type { Detection, HazardType } from '../services/MLService';
import type { AlertPriority } from '../services/AudioAlertService';
import { TransitMode } from '../services/LocationService';

export interface HazardRule {
  objectType: HazardType;
  colorState?: string;
  affectedTypes: ColorblindnessType[];
  priority: AlertPriority;
  warningText: string;
  warningTextEnhanced?: string;  // For colorblind users
  minDistance?: number;          // Meters - only warn if within this distance
  icon?: string;                 // Icon for UI display
}

/**
 * Hazard rules defining which hazards affect which colorblindness types
 */
export const HAZARD_RULES: HazardRule[] = [
  // Traffic Light - Red
  {
    objectType: 'traffic_light',
    colorState: 'red',
    affectedTypes: ['protanopia', 'deuteranopia', 'protanomaly', 'deuteranomaly', 'low_vision'],
    priority: 'critical',
    warningText: 'Red light ahead',
    warningTextEnhanced: 'Red light at top. Stop.',
    icon: '🔴',
  },
  // Traffic Light - Yellow
  {
    objectType: 'traffic_light',
    colorState: 'yellow',
    affectedTypes: ['tritanopia', 'low_vision'],
    priority: 'high',
    warningText: 'Yellow light',
    warningTextEnhanced: 'Yellow light in middle. Prepare to stop.',
    icon: '🟡',
  },
  // Traffic Light - Green
  {
    objectType: 'traffic_light',
    colorState: 'green',
    affectedTypes: ['deuteranopia', 'deuteranomaly', 'low_vision'],
    priority: 'medium',
    warningText: 'Green light',
    warningTextEnhanced: 'Green light at bottom. Safe to proceed.',
    icon: '🟢',
  },
  // Stop Sign
  {
    objectType: 'stop_sign',
    affectedTypes: ['protanopia', 'deuteranopia', 'protanomaly', 'deuteranomaly', 'low_vision'],
    priority: 'critical',
    warningText: 'Stop sign ahead',
    icon: '🛑',
  },
  // Yield Sign
  {
    objectType: 'yield_sign',
    affectedTypes: ['protanopia', 'deuteranopia', 'tritanopia', 'low_vision'],
    priority: 'high',
    warningText: 'Yield sign ahead',
    icon: '⚠️',
  },
  // Brake Lights
  {
    objectType: 'brake_lights',
    affectedTypes: ['protanopia', 'protanomaly', 'low_vision'],
    priority: 'critical',
    warningText: 'Brake lights ahead',
    minDistance: 30,  // Only warn if within 30 meters
    icon: '🚗',
  },
  // Emergency Vehicle
  {
    objectType: 'emergency_vehicle',
    affectedTypes: ['protanopia', 'deuteranopia', 'protanomaly', 'deuteranomaly', 'tritanopia', 'low_vision', 'normal'],
    priority: 'critical',
    warningText: 'Emergency vehicle nearby',
    icon: '🚨',
  },
  // Pedestrian Signal
  {
    objectType: 'pedestrian_signal',
    affectedTypes: ['protanopia', 'deuteranopia', 'low_vision'],
    priority: 'high',
    warningText: 'Pedestrian signal',
    icon: '🚶',
  },
];

/**
 * Priority scores for sorting
 */
const PRIORITY_SCORES: Record<AlertPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export interface PrioritizedHazard extends Detection {
  rule: HazardRule;
  warningText: string;
  warningDistance: number;
  priorityScore: number;
}

/**
 * Filter hazards based on user's colorblindness type
 */
export function filterHazardsForUser(
  detections: Detection[],
  userType: ColorblindnessType,
  userSpeed: number = 0  // mph
): PrioritizedHazard[] {
  const hazards: PrioritizedHazard[] = [];

  for (const detection of detections) {
    const rule = findMatchingRule(detection, userType);
    if (!rule) continue;

    // Check if user type is affected
    if (!rule.affectedTypes.includes(userType) && userType !== 'low_vision') {
      continue;
    }

    // Get appropriate warning text
    const warningText = (userType !== 'normal' && rule.warningTextEnhanced) 
      ? rule.warningTextEnhanced 
      : rule.warningText;

    // Calculate warning distance based on speed
    const warningDistance = calculateWarningDistance(userSpeed, rule.priority, rule.minDistance);

    hazards.push({
      ...detection,
      rule,
      warningText,
      warningDistance,
      priorityScore: PRIORITY_SCORES[rule.priority],
    });
  }

  // Sort by priority (highest first)
  return hazards.sort((a, b) => b.priorityScore - a.priorityScore);
}

/**
 * Find the matching hazard rule for a detection
 */
function findMatchingRule(detection: Detection, userType: ColorblindnessType): HazardRule | null {
  return HAZARD_RULES.find(rule => {
    // Must match object type
    if (rule.objectType !== detection.type) return false;

    // If rule has color state, detection must match
    if (rule.colorState && detection.colorState !== rule.colorState) return false;

    // Must affect this user type
    if (!rule.affectedTypes.includes(userType)) return false;

    return true;
  }) || null;
}

/**
 * Calculate warning distance based on speed and priority
 */
function calculateWarningDistance(
  speedMph: number,
  priority: AlertPriority,
  minDistance?: number
): number {
  // Base distances in meters
  const baseDistances = {
    critical: 50,
    high: 30,
    medium: 20,
    low: 10,
  };

  const base = baseDistances[priority];
  
  // Multiply by speed factor (more warning at higher speeds)
  const speedMultiplier = Math.max(1, speedMph / 20);
  const calculated = base * speedMultiplier;

  // Apply minimum distance if specified
  if (minDistance !== undefined) {
    return Math.min(calculated, minDistance);
  }

  return calculated;
}

/**
 * Get warning distance based on transit mode
 */
export function getWarningDistanceByMode(
  mode: TransitMode,
  priority: AlertPriority
): number {
  const distances = {
    stationary: { critical: 10, high: 5, medium: 3, low: 2 },
    walking: { critical: 15, high: 10, medium: 5, low: 3 },
    biking: { critical: 40, high: 25, medium: 15, low: 10 },
    driving: { critical: 100, high: 60, medium: 40, low: 25 },
  };

  return distances[mode]?.[priority] || 10;
}

/**
 * Get reaction time needed based on priority
 */
export function getReactionTime(priority: AlertPriority): number {
  const times = {
    critical: 2,  // seconds
    high: 3,
    medium: 5,
    low: 8,
  };
  return times[priority];
}

/**
 * Check if a hazard should trigger an alert based on distance
 */
export function shouldAlertForHazard(
  hazard: PrioritizedHazard,
  estimatedDistance: number  // meters
): boolean {
  // Always alert for critical hazards
  if (hazard.rule.priority === 'critical') return true;

  // Check if within warning distance
  return estimatedDistance <= hazard.warningDistance;
}

/**
 * Get hazard icon for UI display
 */
export function getHazardIcon(type: HazardType, colorState?: string): string {
  if (type === 'traffic_light') {
    switch (colorState) {
      case 'red': return '🔴';
      case 'yellow': return '🟡';
      case 'green': return '🟢';
      default: return '🚦';
    }
  }

  const icons: Record<HazardType, string> = {
    traffic_light: '🚦',
    stop_sign: '🛑',
    yield_sign: '⚠️',
    vehicle: '🚗',
    brake_lights: '🚗',
    emergency_vehicle: '🚨',
    pedestrian_signal: '🚶',
    unknown: '❓',
  };

  return icons[type] || '❓';
}

/**
 * Get hazard color for UI overlay
 */
export function getHazardColor(priority: AlertPriority): string {
  const colors = {
    critical: '#FF3B30',  // Red
    high: '#FF9500',      // Orange
    medium: '#FFD60A',    // Yellow
    low: '#30D158',       // Green
  };
  return colors[priority];
}

/**
 * Format hazard for display
 */
export function formatHazardLabel(hazard: PrioritizedHazard): string {
  const icon = getHazardIcon(hazard.type, hazard.colorState);
  return `${icon} ${hazard.warningText}`;
}
