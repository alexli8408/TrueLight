/**
 * Accessibility Constants
 *
 * ACCESSIBILITY DECISIONS:
 * - High contrast colors (WCAG AAA compliant)
 * - Large touch targets (minimum 48dp)
 * - Clear, simple text
 * - Dark background to reduce eye strain and improve camera visibility
 * - Colorblindness-aware feedback based on user's vision type
 */

export const COLORS = {
  // Background - dark for high contrast and reduced eye strain
  background: '#000000',
  backgroundSecondary: '#1A1A1A',

  // Signal state colors - high saturation for visibility
  red: '#FF3B30',
  yellow: '#FFD60A',
  green: '#30D158',
  unknown: '#8E8E93',

  // Text - high contrast
  textPrimary: '#FFFFFF',
  textSecondary: '#AEAEB2',

  // UI elements
  border: '#38383A',
  buttonBackground: '#2C2C2E',
};

export const SIZES = {
  // Large text for readability
  textXL: 48,
  textLarge: 32,
  textMedium: 24,
  textSmall: 18,

  // Touch targets - minimum 48dp for accessibility
  touchTarget: 56,
  buttonPadding: 20,

  // Spacing
  spacingLarge: 32,
  spacingMedium: 16,
  spacingSmall: 8,

  // Border radius
  borderRadius: 16,
};

export const TIMING = {
  // Frame capture interval (ms) - balance between responsiveness and battery
  // These are adjusted based on movement mode in the speed service
  captureInterval: 800,
  captureIntervalDriving: 400,
  captureIntervalCycling: 600,
  captureIntervalWalking: 800,
  captureIntervalStationary: 1000,

  // Debounce for audio announcements (ms) - avoid repeating same state
  audioDebounce: 2000,
  audioDebounceDriverMode: 1500,
  audioDebounceCyclingMode: 2000,
  audioDebounceWalkingMode: 3000,

  // Minimum confidence to announce (0-1)
  minConfidenceToAnnounce: 0.3,
  minConfidenceYOLO: 0.5,

  // API timeout (ms)
  apiTimeout: 5000,

  // YOLO detection specific timing
  yoloTimeout: 3000,
  colorAnalysisTimeout: 2000,

  // Hazard announcement cooldown (ms)
  hazardCooldown: 5000,

  // ElevenLabs pre-cache timeout
  elevenLabsCacheTimeout: 30000,
};

export type SignalState = 'red' | 'yellow' | 'green' | 'flashing' | 'unknown';

/**
 * Colorblindness Types
 *
 * We support the three main types of color vision deficiency:
 * - Protanopia: Red-blind (difficulty distinguishing red)
 * - Deuteranopia: Green-blind (difficulty distinguishing green)
 * - Tritanopia: Blue-blind (rare, difficulty with blue/yellow)
 * - Protanomaly: Red-weak (partial red deficiency)
 * - Deuteranomaly: Green-weak (partial green deficiency)
 * - Normal: No color vision deficiency
 * - Low Vision: General low vision, relies primarily on audio
 */
export type ColorblindnessType =
  | 'normal'
  | 'protanopia'     // Red-blind
  | 'deuteranopia'   // Green-blind
  | 'tritanopia'     // Blue-yellow blind
  | 'protanomaly'    // Red-weak
  | 'deuteranomaly'  // Green-weak
  | 'low_vision'     // Relies on audio
  | 'unknown';

/**
 * Signal messages tailored to colorblindness type
 *
 * For users with red-green colorblindness, we add position cues
 * (top/middle/bottom) since traffic lights are arranged vertically.
 */
export const getSignalMessage = (
  state: SignalState,
  colorblindType: ColorblindnessType
): string => {
  const needsPositionCues =
    colorblindType === 'protanopia' ||
    colorblindType === 'deuteranopia' ||
    colorblindType === 'low_vision';

  const messages: Record<SignalState, { standard: string; enhanced: string }> = {
    red: {
      standard: 'Red light. Stop.',
      enhanced: 'Red light at top. Stop.',
    },
    yellow: {
      standard: 'Yellow light. Prepare to stop.',
      enhanced: 'Yellow light in middle. Prepare to stop.',
    },
    green: {
      standard: 'Green light. Safe to proceed.',
      enhanced: 'Green light at bottom. Safe to proceed.',
    },
    flashing: {
      standard: 'Warning. Flashing signal.',
      enhanced: 'Warning. Flashing signal. Proceed with caution.',
    },
    unknown: {
      standard: '',
      enhanced: '',
    },
  };

  return needsPositionCues
    ? messages[state].enhanced
    : messages[state].standard;
};

/**
 * UI adjustments based on colorblindness type
 */
export const getColorblindAdjustments = (type: ColorblindnessType) => {
  switch (type) {
    case 'protanopia':
    case 'deuteranopia':
      // For red-green colorblindness: use patterns/shapes in addition to color
      return {
        usePatterns: true,
        redColor: '#FF6B6B',      // Warmer red
        greenColor: '#4ECDC4',    // More blue-green (teal)
        showPositionIndicator: true,
      };
    case 'tritanopia':
      // For blue-yellow colorblindness: adjust yellow
      return {
        usePatterns: true,
        yellowColor: '#FFA500',   // More orange
        showPositionIndicator: true,
      };
    case 'low_vision':
      return {
        usePatterns: true,
        showPositionIndicator: true,
        extraLargeText: true,
        highContrast: true,
      };
    default:
      return {
        usePatterns: false,
        showPositionIndicator: false,
      };
  }
};

/**
 * Hazard types that can be detected
 */
export type HazardType =
  | 'brake_lights'
  | 'stop_sign'
  | 'emergency_vehicle'
  | 'pedestrian'
  | 'cyclist';

/**
 * Detection class types from YOLO
 */
export type DetectionClass =
  | 'car'
  | 'truck'
  | 'bus'
  | 'motorcycle'
  | 'bicycle'
  | 'person'
  | 'traffic_light'
  | 'stop_sign';

/**
 * Hazard messages for audio announcements
 */
export const getHazardMessage = (
  hazardType: HazardType,
  colorblindType: ColorblindnessType
): string => {
  const messages: Record<HazardType, { standard: string; enhanced: string }> = {
    brake_lights: {
      standard: 'Brake lights ahead.',
      enhanced: 'Warning. Brake lights ahead. Slow down.',
    },
    stop_sign: {
      standard: 'Stop sign ahead.',
      enhanced: 'Stop sign ahead. Come to a complete stop.',
    },
    emergency_vehicle: {
      standard: 'Emergency vehicle.',
      enhanced: 'Emergency vehicle approaching. Pull over safely.',
    },
    pedestrian: {
      standard: 'Pedestrian detected.',
      enhanced: 'Pedestrian ahead. Use caution.',
    },
    cyclist: {
      standard: 'Cyclist ahead.',
      enhanced: 'Cyclist detected. Maintain safe distance.',
    },
  };

  const needsEnhanced =
    colorblindType === 'protanopia' ||
    colorblindType === 'deuteranopia' ||
    colorblindType === 'low_vision';

  return needsEnhanced
    ? messages[hazardType].enhanced
    : messages[hazardType].standard;
};

/**
 * Priority levels for different detection types
 */
export const DETECTION_PRIORITY = {
  emergency_vehicle: 1,   // Highest priority
  red_light: 2,
  stop_sign: 3,
  brake_lights: 4,
  yellow_light: 5,
  pedestrian: 6,
  cyclist: 7,
  green_light: 8,
  vehicle: 9,             // Lowest priority
} as const;
