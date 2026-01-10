/**
 * Storage Service
 *
 * Stores user preferences including colorblindness type and calibration data.
 * Uses AsyncStorage for persistence across app restarts.
 *
 * PERSISTED DATA:
 * - Colorblindness type from vision test
 * - Onboarding completion status
 * - User preferences (alert volume, vibration, etc.)
 * - Calibration data for color detection
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ColorblindnessType } from '../constants/accessibility';
import { MovementMode } from './speed';

// Storage keys
const STORAGE_KEYS = {
  COLORBLIND_TYPE: '@delta/colorblind_type',
  ONBOARDING_COMPLETE: '@delta/onboarding_complete',
  USER_PREFERENCES: '@delta/user_preferences',
  CALIBRATION_DATA: '@delta/calibration_data',
  DETECTION_HISTORY: '@delta/detection_history',
} as const;

// In-memory cache for fast access
let cachedColorblindType: ColorblindnessType = 'unknown';
let cachedOnboardingComplete = false;
let cachedPreferences: UserPreferences | null = null;
let isInitialized = false;

/**
 * User preferences stored in AsyncStorage
 */
export interface UserPreferences {
  // Audio settings
  audioEnabled: boolean;
  audioVolume: number; // 0-1
  useElevenLabs: boolean; // Use high-quality TTS when available

  // Vibration settings
  vibrationEnabled: boolean;
  vibrationIntensity: 'low' | 'medium' | 'high';

  // Detection settings
  defaultMode: MovementMode | 'auto';
  captureQuality: 'low' | 'medium' | 'high';
  confidenceThreshold: number; // 0-1

  // UI settings
  showDebugInfo: boolean;
  showConfidence: boolean;
  hapticFeedback: boolean;
}

/**
 * Default preferences
 */
const DEFAULT_PREFERENCES: UserPreferences = {
  audioEnabled: true,
  audioVolume: 1.0,
  useElevenLabs: true,
  vibrationEnabled: true,
  vibrationIntensity: 'medium',
  defaultMode: 'auto',
  captureQuality: 'low',
  confidenceThreshold: 0.5,
  showDebugInfo: false,
  showConfidence: true,
  hapticFeedback: true,
};

/**
 * Calibration data for color detection
 */
export interface CalibrationData {
  redThreshold: { min: number; max: number };
  yellowThreshold: { min: number; max: number };
  greenThreshold: { min: number; max: number };
  brightnessOffset: number;
  calibratedAt: number;
}

/**
 * Initializes storage service
 * Loads cached values from AsyncStorage
 */
export async function initializeStorage(): Promise<void> {
  if (isInitialized) return;

  try {
    const [colorblindType, onboardingComplete, preferences] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.COLORBLIND_TYPE),
      AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE),
      AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES),
    ]);

    if (colorblindType) {
      cachedColorblindType = colorblindType as ColorblindnessType;
    }

    if (onboardingComplete) {
      cachedOnboardingComplete = onboardingComplete === 'true';
    }

    if (preferences) {
      cachedPreferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(preferences) };
    } else {
      cachedPreferences = DEFAULT_PREFERENCES;
    }

    isInitialized = true;
    console.log('[Storage] Initialized');
  } catch (error) {
    console.error('[Storage] Failed to initialize:', error);
    // Use defaults if storage fails
    cachedPreferences = DEFAULT_PREFERENCES;
    isInitialized = true;
  }
}

/**
 * Stores the user's colorblindness type
 */
export function setColorblindType(type: ColorblindnessType): void {
  cachedColorblindType = type;
  // Fire and forget async storage
  AsyncStorage.setItem(STORAGE_KEYS.COLORBLIND_TYPE, type).catch(error => {
    console.error('[Storage] Failed to save colorblind type:', error);
  });
}

/**
 * Gets the user's colorblindness type (sync for backward compatibility)
 */
export function getColorblindType(): ColorblindnessType {
  return cachedColorblindType;
}

/**
 * Gets the user's colorblindness type (async)
 */
export async function getColorblindTypeAsync(): Promise<ColorblindnessType> {
  if (!isInitialized) {
    await initializeStorage();
  }
  return cachedColorblindType;
}

/**
 * Marks onboarding as complete
 */
export function completeOnboarding(): void {
  cachedOnboardingComplete = true;
  // Fire and forget async storage
  AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true').catch(error => {
    console.error('[Storage] Failed to save onboarding status:', error);
  });
}

/**
 * Checks if user has completed onboarding (sync)
 */
export function isOnboardingComplete(): boolean {
  return cachedOnboardingComplete;
}

/**
 * Checks if user has completed onboarding (async)
 */
export async function isOnboardingCompleteAsync(): Promise<boolean> {
  if (!isInitialized) {
    await initializeStorage();
  }
  return cachedOnboardingComplete;
}

/**
 * Gets user preferences
 */
export function getPreferences(): UserPreferences {
  return cachedPreferences || DEFAULT_PREFERENCES;
}

/**
 * Gets user preferences (async)
 */
export async function getPreferencesAsync(): Promise<UserPreferences> {
  if (!isInitialized) {
    await initializeStorage();
  }
  return cachedPreferences || DEFAULT_PREFERENCES;
}

/**
 * Updates user preferences
 */
export async function setPreferences(
  updates: Partial<UserPreferences>
): Promise<void> {
  cachedPreferences = { ...(cachedPreferences || DEFAULT_PREFERENCES), ...updates };
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.USER_PREFERENCES,
      JSON.stringify(cachedPreferences)
    );
  } catch (error) {
    console.error('[Storage] Failed to save preferences:', error);
  }
}

/**
 * Stores calibration data
 */
export async function setCalibrationData(data: CalibrationData): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.CALIBRATION_DATA,
      JSON.stringify(data)
    );
  } catch (error) {
    console.error('[Storage] Failed to save calibration data:', error);
  }
}

/**
 * Gets calibration data
 */
export async function getCalibrationData(): Promise<CalibrationData | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CALIBRATION_DATA);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('[Storage] Failed to get calibration data:', error);
    return null;
  }
}

/**
 * Resets all stored data
 */
export async function resetStorage(): Promise<void> {
  cachedColorblindType = 'unknown';
  cachedOnboardingComplete = false;
  cachedPreferences = DEFAULT_PREFERENCES;

  try {
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
  } catch (error) {
    console.error('[Storage] Failed to reset storage:', error);
  }
}

/**
 * App settings interface for CameraView compatibility
 */
export interface AppSettings {
  audioEnabled: boolean;
  speedTrackingEnabled: boolean;
  warningSensitivity: 'conservative' | 'normal' | 'aggressive';
}

/**
 * Gets app settings (compatibility wrapper for CameraView)
 */
export function getSettings(): AppSettings {
  const prefs = getPreferences();
  return {
    audioEnabled: prefs.audioEnabled,
    speedTrackingEnabled: prefs.defaultMode === 'auto',
    warningSensitivity: 'normal', // Default, can be extended
  };
}

/**
 * Updates app settings (compatibility wrapper)
 */
export function updateSettings(settings: Partial<AppSettings>): void {
  const updates: Partial<UserPreferences> = {};
  
  if (settings.audioEnabled !== undefined) {
    updates.audioEnabled = settings.audioEnabled;
  }
  if (settings.speedTrackingEnabled !== undefined) {
    updates.defaultMode = settings.speedTrackingEnabled ? 'auto' : 'walking';
  }
  
  setPreferences(updates);
}

/**
 * Gets all storage keys and their sizes (for debugging)
 */
export async function getStorageInfo(): Promise<{ key: string; size: number }[]> {
  const info: { key: string; size: number }[] = [];

  for (const key of Object.values(STORAGE_KEYS)) {
    try {
      const value = await AsyncStorage.getItem(key);
      info.push({
        key,
        size: value ? value.length : 0,
      });
    } catch {
      info.push({ key, size: -1 });
    }
  }

  return info;
}
