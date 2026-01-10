/**
 * Text-to-Speech Service
 *
 * Provides audio feedback for traffic signal detection.
 * Uses Expo Speech as the primary TTS engine (reliable, works offline).
 *
 * ACCESSIBILITY DECISION:
 * - We use Expo Speech instead of ElevenLabs for the MVP because:
 *   1. Works offline - critical for safety
 *   2. No API latency - immediate feedback
 *   3. Reliable - no network failures
 * - ElevenLabs could be added later for more natural voice
 */

import * as Speech from 'expo-speech';
import { SignalState, ColorblindnessType, getSignalMessage } from '../constants/accessibility';

let lastSpokenState: SignalState | null = null;

/**
 * Speaks the traffic signal state if it has changed
 * Only announces when the state actually changes (not on every detection)
 */
export async function speakSignalState(
  state: SignalState,
  colorblindType: ColorblindnessType,
  force = false
): Promise<void> {
  // Only announce when state actually changes (or if forced)
  if (!force && state === lastSpokenState) {
    return;
  }

  // Don't announce unknown state
  if (state === 'unknown') {
    return;
  }

  const message = getSignalMessage(state, colorblindType);
  if (!message) return;

  // Stop any current speech
  await Speech.stop();

  // Speak the new state
  Speech.speak(message, {
    language: 'en-US',
    pitch: 1.0,
    rate: 1.1, // Slightly faster for urgency
    // Use different voice characteristics for different states
    ...(state === 'red' && { pitch: 0.9, rate: 1.0 }), // Lower, slower for stop
    ...(state === 'yellow' && { rate: 1.2 }), // Faster for warning
  });

  lastSpokenState = state;
}

/**
 * Speaks a custom message (for onboarding, errors, etc.)
 */
export async function speak(message: string): Promise<void> {
  await Speech.stop();
  Speech.speak(message, {
    language: 'en-US',
    pitch: 1.0,
    rate: 1.0,
  });
}

/**
 * Stops any current speech
 */
export async function stopSpeaking(): Promise<void> {
  await Speech.stop();
}

/**
 * Checks if TTS is currently speaking
 */
export async function isSpeaking(): Promise<boolean> {
  return await Speech.isSpeakingAsync();
}

/**
 * Resets the speech state (useful when resuming the app)
 */
export function resetSpeechState(): void {
  lastSpokenState = null;
}
