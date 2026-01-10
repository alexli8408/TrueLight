/**
 * Detection Store (Zustand)
 *
 * Centralized state management for the detection system.
 * Uses Zustand for simple, performant state updates.
 *
 * STATE INCLUDES:
 * - Current detections (traffic lights, vehicles, signs)
 * - User movement mode and speed
 * - Audio/UI settings
 * - Detection history for smoothing
 */

import { create } from 'zustand';
import { SignalState, ColorblindnessType } from '../constants/accessibility';
import { Detection, YOLODetectionResult } from '../services/yolo';
import { SpeedData, MovementMode } from '../services/speed';
import { UserPreferences, getPreferences } from '../services/storage';

/**
 * Traffic light with analyzed color state
 */
export interface TrafficLightState {
  detection: Detection;
  lightState: SignalState;
  stateConfidence: number;
  lastUpdated: number;
}

/**
 * Hazard detection result
 */
export interface HazardState {
  type: 'brake_lights' | 'stop_sign' | 'emergency_vehicle' | 'pedestrian';
  detection: Detection;
  confidence: number;
  lastUpdated: number;
}

/**
 * Detection store state
 */
interface DetectionState {
  // Current detections
  trafficLights: TrafficLightState[];
  vehicles: Detection[];
  hazards: HazardState[];

  // Primary signal state (most prominent traffic light)
  primarySignal: SignalState;
  primaryConfidence: number;

  // Movement tracking
  speedData: SpeedData | null;
  movementMode: MovementMode;

  // User settings
  colorblindType: ColorblindnessType;
  preferences: UserPreferences;

  // Detection status
  isDetecting: boolean;
  isConnected: boolean;
  lastDetectionTime: number;
  processingTimeMs: number;

  // Error state
  error: string | null;

  // Actions
  setDetectionResult: (result: YOLODetectionResult) => void;
  setTrafficLightState: (index: number, state: SignalState, confidence: number) => void;
  setPrimarySignal: (state: SignalState, confidence: number) => void;
  addHazard: (hazard: HazardState) => void;
  clearHazards: () => void;
  setSpeedData: (data: SpeedData) => void;
  setColorblindType: (type: ColorblindnessType) => void;
  setPreferences: (prefs: Partial<UserPreferences>) => void;
  setDetecting: (isDetecting: boolean) => void;
  setConnected: (isConnected: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

/**
 * Initial state
 */
const initialState = {
  trafficLights: [],
  vehicles: [],
  hazards: [],
  primarySignal: 'unknown' as SignalState,
  primaryConfidence: 0,
  speedData: null,
  movementMode: 'stationary' as MovementMode,
  colorblindType: 'unknown' as ColorblindnessType,
  preferences: getPreferences(),
  isDetecting: false,
  isConnected: false,
  lastDetectionTime: 0,
  processingTimeMs: 0,
  error: null,
};

/**
 * Detection store
 */
export const useDetectionStore = create<DetectionState>((set, get) => ({
  ...initialState,

  /**
   * Updates store with new YOLO detection result
   */
  setDetectionResult: (result: YOLODetectionResult) => {
    const { detections, processingTimeMs } = result;

    // Separate detections by type
    const trafficLights: TrafficLightState[] = detections
      .filter(d => d.classId === 9) // TRAFFIC_LIGHT
      .map(detection => ({
        detection,
        lightState: 'unknown' as SignalState,
        stateConfidence: 0,
        lastUpdated: Date.now(),
      }));

    const vehicles = detections.filter(d =>
      [2, 3, 5, 7].includes(d.classId) // CAR, MOTORCYCLE, BUS, TRUCK
    );

    // Check for stop signs as hazards
    const stopSigns = detections.filter(d => d.classId === 11);
    const newHazards: HazardState[] = stopSigns.map(detection => ({
      type: 'stop_sign' as const,
      detection,
      confidence: detection.confidence,
      lastUpdated: Date.now(),
    }));

    set({
      trafficLights,
      vehicles,
      hazards: [...get().hazards.filter(h => h.type !== 'stop_sign'), ...newHazards],
      lastDetectionTime: Date.now(),
      processingTimeMs,
    });
  },

  /**
   * Updates the analyzed state of a specific traffic light
   */
  setTrafficLightState: (index: number, state: SignalState, confidence: number) => {
    set(prev => {
      const trafficLights = [...prev.trafficLights];
      if (trafficLights[index]) {
        trafficLights[index] = {
          ...trafficLights[index],
          lightState: state,
          stateConfidence: confidence,
          lastUpdated: Date.now(),
        };
      }
      return { trafficLights };
    });
  },

  /**
   * Sets the primary (most important) signal state
   */
  setPrimarySignal: (state: SignalState, confidence: number) => {
    set({ primarySignal: state, primaryConfidence: confidence });
  },

  /**
   * Adds a new hazard detection
   */
  addHazard: (hazard: HazardState) => {
    set(prev => {
      // Remove duplicates of same type
      const filtered = prev.hazards.filter(h => h.type !== hazard.type);
      return { hazards: [...filtered, hazard] };
    });
  },

  /**
   * Clears all hazards
   */
  clearHazards: () => {
    set({ hazards: [] });
  },

  /**
   * Updates speed data and movement mode
   */
  setSpeedData: (data: SpeedData) => {
    set({
      speedData: data,
      movementMode: data.mode,
    });
  },

  /**
   * Sets the user's colorblindness type
   */
  setColorblindType: (type: ColorblindnessType) => {
    set({ colorblindType: type });
  },

  /**
   * Updates user preferences
   */
  setPreferences: (prefs: Partial<UserPreferences>) => {
    set(prev => ({
      preferences: { ...prev.preferences, ...prefs },
    }));
  },

  /**
   * Sets detection active state
   */
  setDetecting: (isDetecting: boolean) => {
    set({ isDetecting });
  },

  /**
   * Sets connection status
   */
  setConnected: (isConnected: boolean) => {
    set({ isConnected });
  },

  /**
   * Sets error message
   */
  setError: (error: string | null) => {
    set({ error });
  },

  /**
   * Resets store to initial state
   */
  reset: () => {
    set(initialState);
  },
}));

/**
 * Selector: Get the most prominent traffic light
 */
export const selectPrimaryTrafficLight = (state: DetectionState): TrafficLightState | null => {
  if (state.trafficLights.length === 0) return null;

  // Sort by size (larger = closer/more important) and confidence
  const sorted = [...state.trafficLights].sort((a, b) => {
    const aScore = a.detection.bbox.height * a.detection.confidence;
    const bScore = b.detection.bbox.height * b.detection.confidence;
    return bScore - aScore;
  });

  return sorted[0];
};

/**
 * Selector: Get all active hazards
 */
export const selectActiveHazards = (state: DetectionState): HazardState[] => {
  const now = Date.now();
  const HAZARD_TIMEOUT = 3000; // 3 seconds

  return state.hazards.filter(h => now - h.lastUpdated < HAZARD_TIMEOUT);
};

/**
 * Selector: Check if any critical hazard is active
 */
export const selectHasCriticalHazard = (state: DetectionState): boolean => {
  return selectActiveHazards(state).some(h =>
    h.type === 'stop_sign' || h.type === 'emergency_vehicle'
  );
};

/**
 * Selector: Get recommended capture interval based on mode
 */
export const selectCaptureInterval = (state: DetectionState): number => {
  switch (state.movementMode) {
    case 'driving':
      return 400;
    case 'cycling':
      return 600;
    case 'walking':
      return 800;
    default:
      return 1000;
  }
};
