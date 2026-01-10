/**
 * Hybrid Audio Service
 *
 * Combines ElevenLabs TTS (high quality, pre-cached) with expo-speech (fast, offline).
 *
 * STRATEGY:
 * - Critical alerts use pre-cached ElevenLabs audio (0ms latency after initial load)
 * - Non-critical alerts use native expo-speech (fast, free, works offline)
 *
 * LATENCY COMPARISON:
 * - Native TTS (expo-speech): 100-200ms
 * - ElevenLabs live API: 800-2000ms (too slow for safety!)
 * - ElevenLabs pre-cached: ~0ms (audio already on device)
 *
 * This hybrid approach gives us:
 * - High-quality voices for critical safety alerts
 * - Fast fallback for everything else
 * - No network dependency during actual usage
 */

import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import { SignalState, ColorblindnessType, getSignalMessage, TIMING } from '../constants/accessibility';

// ElevenLabs configuration
const ELEVENLABS_API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY || '';
const ELEVENLABS_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel voice (clear, professional)

// Pre-defined critical phrases to cache
const CRITICAL_PHRASES = [
  'Red light ahead. Stop.',
  'Red light at top. Stop.',
  'Green light. Safe to proceed.',
  'Green light at bottom. Safe to proceed.',
  'Yellow light. Prepare to stop.',
  'Yellow light in middle. Prepare to stop.',
  'Stop sign detected.',
  'Brake lights ahead.',
  'Emergency vehicle approaching.',
  'Warning. Flashing signal.',
];

// Cache for pre-generated audio
const audioCache = new Map<string, Audio.Sound>();
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

// State tracking for debouncing
let lastSpokenState: SignalState | null = null;
let lastSpokenTime = 0;

/**
 * Initializes the hybrid audio service
 * Pre-generates and caches critical audio clips from ElevenLabs
 */
export async function initializeHybridAudio(): Promise<void> {
  // Prevent multiple initializations
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = _doInitialize();
  return initializationPromise;
}

async function _doInitialize(): Promise<void> {
  if (isInitialized) return;

  console.log('[HybridAudio] Initializing...');

  // Configure audio mode
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: true,
    shouldDuckAndroid: true,
  });

  // If no API key, skip ElevenLabs pre-caching
  if (!ELEVENLABS_API_KEY) {
    console.log('[HybridAudio] No ElevenLabs API key - using native TTS only');
    isInitialized = true;
    return;
  }

  // Pre-generate critical phrases in background
  // Don't block app startup - load in background
  preGenerateCriticalPhrases().catch(err => {
    console.warn('[HybridAudio] Failed to pre-generate some phrases:', err);
  });

  isInitialized = true;
  console.log('[HybridAudio] Initialized');
}

/**
 * Pre-generates audio for all critical phrases
 */
async function preGenerateCriticalPhrases(): Promise<void> {
  console.log(`[HybridAudio] Pre-generating ${CRITICAL_PHRASES.length} critical phrases...`);

  // Check cache directory
  const cacheDir = `${FileSystem.cacheDirectory}audio/`;
  const dirInfo = await FileSystem.getInfoAsync(cacheDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
  }

  // Generate phrases in parallel (but limit concurrency)
  const batchSize = 3;
  for (let i = 0; i < CRITICAL_PHRASES.length; i += batchSize) {
    const batch = CRITICAL_PHRASES.slice(i, i + batchSize);
    await Promise.all(batch.map(phrase => preGeneratePhrase(phrase, cacheDir)));
  }

  console.log('[HybridAudio] Pre-generation complete');
}

/**
 * Pre-generates and caches a single phrase
 */
async function preGeneratePhrase(phrase: string, cacheDir: string): Promise<void> {
  const sanitizedPhrase = phrase.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const filePath = `${cacheDir}${sanitizedPhrase}.mp3`;

  // Check if already cached
  const fileInfo = await FileSystem.getInfoAsync(filePath);
  if (fileInfo.exists) {
    // Load existing file
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: filePath });
      audioCache.set(phrase, sound);
      console.log(`[HybridAudio] Loaded cached: ${phrase}`);
      return;
    } catch (err) {
      // File corrupted, re-generate
      await FileSystem.deleteAsync(filePath, { idempotent: true });
    }
  }

  // Generate from ElevenLabs
  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        text: phrase,
        model_id: 'eleven_turbo_v2', // Fastest model
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.0,
          use_speaker_boost: true,
        },
      },
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        responseType: 'arraybuffer',
        timeout: 30000, // 30 second timeout for generation
      }
    );

    // Convert to base64 and save
    const base64Audio = Buffer.from(response.data, 'binary').toString('base64');
    await FileSystem.writeAsStringAsync(filePath, base64Audio, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Load as Sound object
    const { sound } = await Audio.Sound.createAsync({ uri: filePath });
    audioCache.set(phrase, sound);
    console.log(`[HybridAudio] Generated and cached: ${phrase}`);
  } catch (err) {
    console.warn(`[HybridAudio] Failed to generate "${phrase}":`, err);
    // Will fall back to native TTS
  }
}

/**
 * Speaks a message using the best available method
 *
 * @param text - The text to speak
 * @param priority - Priority level affects which TTS engine is used
 */
export async function speak(
  text: string,
  priority: 'critical' | 'high' | 'medium' = 'medium'
): Promise<void> {
  // Initialize if not done
  if (!isInitialized) {
    await initializeHybridAudio();
  }

  // For critical priority, try cached ElevenLabs first
  if (priority === 'critical') {
    // Check for exact match in cache
    const cachedSound = audioCache.get(text);
    if (cachedSound) {
      try {
        await cachedSound.setPositionAsync(0);
        await cachedSound.playAsync();
        return;
      } catch (err) {
        console.warn('[HybridAudio] Cached playback failed, falling back to TTS');
      }
    }

    // Check for similar cached phrase
    for (const [phrase, sound] of audioCache.entries()) {
      if (text.toLowerCase().includes(phrase.toLowerCase().split('.')[0])) {
        try {
          await sound.setPositionAsync(0);
          await sound.playAsync();
          return;
        } catch (err) {
          // Fall through to native TTS
        }
      }
    }
  }

  // Fall back to native TTS
  await Speech.stop();
  Speech.speak(text, {
    language: 'en-US',
    pitch: 1.0,
    rate: priority === 'critical' ? 1.2 : 1.0, // Faster for critical
  });
}

/**
 * Speaks the traffic signal state with appropriate priority
 */
export async function speakSignalState(
  state: SignalState,
  colorblindType: ColorblindnessType,
  force = false
): Promise<void> {
  const now = Date.now();

  // Debounce: skip if same state was announced recently
  if (
    !force &&
    state === lastSpokenState &&
    now - lastSpokenTime < TIMING.audioDebounce
  ) {
    return;
  }

  // Don't announce unknown state
  if (state === 'unknown') {
    return;
  }

  const message = getSignalMessage(state, colorblindType);
  if (!message) return;

  // Determine priority based on signal state
  const priority: 'critical' | 'high' | 'medium' =
    state === 'red' ? 'critical' : state === 'yellow' ? 'high' : 'medium';

  await speak(message, priority);

  lastSpokenState = state;
  lastSpokenTime = now;
}

/**
 * Speaks a hazard alert with critical priority
 */
export async function speakHazard(hazardType: string): Promise<void> {
  const hazardMessages: Record<string, string> = {
    brake_lights: 'Brake lights ahead.',
    stop_sign: 'Stop sign detected.',
    emergency_vehicle: 'Emergency vehicle approaching.',
    pedestrian: 'Pedestrian detected.',
  };

  const message = hazardMessages[hazardType] || `Warning: ${hazardType}`;
  await speak(message, 'critical');
}

/**
 * Stops any current audio playback
 */
export async function stopSpeaking(): Promise<void> {
  await Speech.stop();

  // Stop any playing cached audio
  for (const sound of audioCache.values()) {
    try {
      await sound.stopAsync();
    } catch {
      // Ignore errors
    }
  }
}

/**
 * Checks if audio is currently playing
 */
export async function isSpeaking(): Promise<boolean> {
  return await Speech.isSpeakingAsync();
}

/**
 * Resets the debounce state
 */
export function resetSpeechState(): void {
  lastSpokenState = null;
  lastSpokenTime = 0;
}

/**
 * Cleans up audio resources
 */
export async function cleanup(): Promise<void> {
  for (const sound of audioCache.values()) {
    try {
      await sound.unloadAsync();
    } catch {
      // Ignore errors
    }
  }
  audioCache.clear();
  isInitialized = false;
  initializationPromise = null;
}

/**
 * Gets the number of cached audio clips
 */
export function getCacheSize(): number {
  return audioCache.size;
}
