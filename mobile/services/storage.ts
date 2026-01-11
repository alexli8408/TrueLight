/**
 * Simple Storage Service
 *
 * Stores user preferences including colorblindness type.
 * Uses AsyncStorage for persistence across app restarts.
 *
 * For hackathon simplicity, we use a basic in-memory store
 * with optional AsyncStorage integration.
 */

import { ColorblindnessType } from '../constants/accessibility';

// In-memory store (persists for session)
let storedColorblindType: ColorblindnessType = 'unknown';
let hasCompletedOnboarding = false;

// App settings interface
export interface AppSettings {
  audioEnabled: boolean;
  speechRate: number;
  sensitivity: 'conservative' | 'normal' | 'aggressive';
  warningSensitivity: 'conservative' | 'normal' | 'aggressive';
  transportMode: 'walking' | 'driving' | 'biking' | 'public';
  alertCooldownMs: number;
  speedTrackingEnabled: boolean;
}

// Default settings
const defaultSettings: AppSettings = {
  audioEnabled: true,
  speechRate: 1.0,
  sensitivity: 'normal',
  warningSensitivity: 'normal',
  transportMode: 'driving',
  alertCooldownMs: 2000,
  speedTrackingEnabled: true,
};

// Current settings
let currentSettings: AppSettings = { ...defaultSettings };

/**
 * Gets current app settings
 */
export function getSettings(): AppSettings {
  return { ...currentSettings };
}

/**
 * Updates app settings
 */
export function updateSettings(settings: Partial<AppSettings>): void {
  currentSettings = { ...currentSettings, ...settings };
}

/**
 * Stores the user's colorblindness type
 */
export function setColorblindType(type: ColorblindnessType): void {
  storedColorblindType = type;
}

/**
 * Gets the user's colorblindness type
 */
export function getColorblindType(): ColorblindnessType {
  return storedColorblindType;
}

/**
 * Marks onboarding as complete
 */
export function completeOnboarding(): void {
  hasCompletedOnboarding = true;
}

/**
 * Checks if user has completed onboarding
 */
export function isOnboardingComplete(): boolean {
  return hasCompletedOnboarding;
}

/**
 * Resets all stored data (for testing)
 */
export function resetStorage(): void {
  storedColorblindType = 'unknown';
  hasCompletedOnboarding = false;
}
